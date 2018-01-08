"use strict";

import * as Bluebird from "bluebird"

const keyStore = require("crypto/keyStore");
const errors = require("asset/errors");
const config = require("config");

import h from "../helper/helper"

const attributesNeverVerified = ["_signature", "_hashObject"];

type optionsType = {
	type: string,
	alternativeType?: string,
	removeEmpty?: boolean,
	encryptDepth?: number,
	attributesNotVerified?: string[]
}

/** crypted content with metadata
		@param content the content to handle either encrypted or decrypted
		@param meta metadata for the content
		@param isDecrypted whether the content is decrypted
*/
export class SecuredData {
	private type: string
	private alternativeType: string
	private encryptDepth: number
	private attributesNotVerified: string[]
	private decrypted: boolean
	private _hasContent: boolean
	private changed: boolean

	private original
	private _updated

	private decryptionPromise

	constructor(content, meta, options: optionsType, isDecrypted: boolean) {
			//we need to somehow ensure that we have the correct object type.
		if (!options || typeof options.type !== "string") {
			throw new Error("need a type for security!");
		}

		this.type = options.type;
		this.alternativeType = options.alternativeType

		this.encryptDepth = options.encryptDepth || 0;

		this.attributesNotVerified = options.attributesNotVerified || [];
		this.attributesNotVerified.filter((val) => val.match(/^A-z0-9$/))
		this.attributesNotVerified = attributesNeverVerified.concat(this.attributesNotVerified);

		this.decrypted = isDecrypted;

		this._hasContent = true;

		this.original = {
			meta: meta || {}
		}

		if (typeof content === "undefined") {
			this._hasContent = false;
		} else if (isDecrypted) {
			this.original.content = content;
		} else {
			this.original.encryptedContent = content;
		}

		this._updated = h.deepCopyObj(this.original);
	}

	private blockDisallowedAttributes = (data) => {
		if (data._contentHash || data._key || data._signature || data._version) {
			throw new Error("content hash/key should not be provided by outside world");
		}
	}

	hasContent = () => {
		return this._hasContent
	}

	getHash = () => {
		return this._updated.meta._ownHash;
	}

	getKey = () => {
		return this.original.meta._key;
	};

	sign = (signKey, cb?) => {
		const toSign = h.deepCopyObj(this._updated.meta);
		const hashVersion = config.hashVersion;

		return Bluebird.try(() => {
			toSign._version = 1;
			toSign._type = this.type;

			toSign._hashVersion = hashVersion;

					//do not sign attributes which should not be verified
			this.attributesNotVerified.forEach((attr) => {
				delete toSign[attr]
			})

			if (this._updated.paddedContent || this._updated.content) {
				var hashContent = this._updated.paddedContent || this._updated.content;

				return keyStore.hash.hashObjectOrValueHexAsync(hashContent).then((contentHash) => {
					toSign._contentHash = contentHash;

									//create new ownHash
					delete toSign._ownHash;
					return keyStore.hash.hashObjectOrValueHexAsync(toSign);
				}).then((ownHash) => {
					toSign._ownHash = ownHash;
				});
			}
		}).then(() => {
			return keyStore.sign.signObject(toSign, signKey, hashVersion);
		}).then((signature) => {
			toSign._signature = signature;

			return toSign;
		}).nodeify(cb);
	};

	getUpdatedData = (signKey, cb) => {
		return this.verify(signKey).then(() => {
			if (this._hasContent) {
				keyStore.security.addEncryptionIdentifier(this.original.meta._key);
				return this.signAndEncrypt(signKey, this.original.meta._key);
			}

			return this.sign(signKey);
		}).nodeify(cb);
	};

	/** sign and encrypt this object.
			pads and then encrypts our content.
			adds contentHash, key id and version to metaData and signs meta data.
			@param signKey key to use for signing
			@param cb callback(cryptedData, metaData),
	*/
	signAndEncrypt = (signKey, cryptKey) => {
		if (!this._hasContent) {
			throw new Error("can only sign and not encrypt");
		}

		if (this.original.meta._key && this.original.meta._key !== cryptKey) {
			throw new Error("can not re-encrypt an old object with new key!");
		}

		return keyStore.hash.addPaddingToObject(this._updated.content, 128).then((paddedContent) => {
			this._updated.paddedContent = paddedContent;

			this._updated.meta._key = keyStore.correctKeyIdentifier(cryptKey);

			return Bluebird.all([
				keyStore.sym.encryptObject(paddedContent, cryptKey, this.encryptDepth),
				this.sign(signKey)
			]);
		}).spread((cryptedData, meta) => {
			this._updated.meta = meta;

			return {
				content: cryptedData,
				meta: meta
			};
		})
	};

	hasType = (type) => {
		if (type === this.type) {
			return true
		}

		if (this.alternativeType && this.alternativeType === type) {
			return true
		}

		return false
	}

	/** verify the decrypted data
			decrypts data if necessary
			@param signKey key to check signature against
			@param id id for signature caching
			@throw SecurityError: contenthash or signature wrong
	*/
	verifyAsync = (signKey, id?) => {
			//check contentHash is correct
			//check signature is correct

		return Bluebird.resolve().then(() => {
			var metaCopy = h.deepCopyObj(this.original.meta);

			this.attributesNotVerified.forEach((attr) => {
				delete metaCopy[attr];
			});

			if (!this.hasType(metaCopy._type)) {
				// eslint-disable-next-line no-debugger
				debugger
				throw new errors.SecurityError("invalid object type. is: " + metaCopy._type + " should be: " + this.type);
			}

			if (typeof metaCopy._hashVersion === "number") {
				metaCopy._hashVersion = h.parseDecimal(metaCopy._hashVersion);
			}

			var hashVersion = 1;

			if (metaCopy._hashVersion) {
				hashVersion = metaCopy._hashVersion;
			} else if (metaCopy._v2 && metaCopy._v2 !== "false") {
				hashVersion = 2;
			}

			return keyStore.sign.verifyObject(this.original.meta._signature, metaCopy, signKey, hashVersion, id);
		}).then((correctSignature) => {
			if (!correctSignature) {
				alert("Bug: signature did not match (" + this.original.meta._type + ") Please report this bug!");
				throw new errors.SecurityError("signature did not match " + this.original.meta._type);
			}

			return this.verifyContentHash();
		}).then(() => {
			return true;
		});
	};

	verify = (signKey, cb?, id?) => {
		return this.verifyAsync(signKey, id).nodeify(cb);
	};

	updated = () => {
		this.changed = false;
	};

	_decrypt = () => {
		if (!this.decryptionPromise) {
			this.decryptionPromise = keyStore.sym.decryptObject(
					this.original.encryptedContent,
					this.encryptDepth,
					undefined,
					this.original.meta._key
			).then((decryptedData) => {
				this.decrypted = true;
				this.original.paddedContent = decryptedData;
				this.original.content = keyStore.hash.removePaddingFromObject(decryptedData, 128);
				this._updated.content = h.deepCopyObj(this.original.content);

				return this.verifyContentHash();
			});
		}

		return this.decryptionPromise;
	};

	decrypt = (cb?) => {
		return Bluebird.resolve().then(() => {
			if (this._hasContent && !this.decrypted) {
				return this._decrypt();
			}
		}).then(() => {
			if (!this._hasContent) {
				return;
			}

			return this.original.content;
		}).nodeify(cb);
	};

	private verifyContentHash = () => {
		if (!this._hasContent || !this.decrypted) {
			return Bluebird.resolve()
		}

		return Bluebird.try(() =>
			keyStore.hash.hashObjectOrValueHexAsync(this.original.paddedContent || this.original.content)
		).then((hash) => {
			if (hash !== this.original.meta._contentHash) {
				throw new errors.SecurityError("content hash did not match");
			}
		})
	};

	isChanged = () => this.changed
	isEncrypted = () => !this.decrypted
	isDecrypted = () => this.decrypted;

	contentGet = () => h.deepCopyObj(this._updated.content)
	metaGet = () => h.deepCopyObj(this._updated.meta)
	metaHasAttr = (attr) => this._updated.meta.hasOwnProperty(attr)
	metaKeys = () => Object.keys(this._updated.meta).filter((key) => key[0] !== "_")
	metaAttr = (attr) =>  h.deepCopyObj(this._updated.meta[attr])

	/** sets the whole content to the given data
			@param newContent new value for this objects content
	*/
	contentSet = (newContent) => {
		this._hasContent = this.changed = true;
		this._updated.content = newContent;
	};

	/** set a certain attribute in the content object
			@param attr attribute to set
			@param value value to set attribute to
	*/
	contentSetAttr = (attr, value) => {
		if (typeof this._updated.content !== "object") {
			throw new Error("our content is not an object");
		}

		this._updated.content[attr] = value;
		this.changed = true;
	};

	contentRemoveAttr = (attr) => {
		if (typeof this._updated.content !== "object") {
			throw new Error("our content is not an object");
		}

		delete this._updated.content[attr];
		this.changed = true;
	}

	/** sets the whole metaData to the given data
			@param newMetaData new value for this objects metaData
	*/
	metaSet = (newMetaData) => {
		this.blockDisallowedAttributes(newMetaData);

		this.changed = true;
		this._updated.meta = newMetaData;
	}

	metaRemoveAttr = (attr) => {
		if (attr[0] === "_") {
			throw new Error("private attributes should not be provided by outside world");
		}

		this.changed = true;
		delete this._updated.meta[attr];
	}

	metaSetAttr = (attr, value) => {
		if (attr[0] === "_") {
			throw new Error("private attributes should not be provided by outside world");
		}

		this.changed = true;
		this._updated.meta[attr] = value;
	}

	/** set a certain attribute in the meta object
			@param attrs [] list of which attribute to set
			@param value value to set attribute to
	*/
	metaAdd = (attrs, value) => {
		this.changed = h.deepSetCreate(this._updated.meta, attrs, value);
	}

	setParent = (parentSecuredData) => {
		this._updated.meta._parent = parentSecuredData.getHash();
	}

	checkParent = (expectedParent) => {
		if (this._updated.meta._parent !== expectedParent.getHash()) {
			throw new errors.SecurityError("wrong parent. is: " + this._updated.meta._parent + " should be: " + expectedParent.getHash());
		}
	}

	getRelationshipCounter = () => {
		return h.parseDecimal(this._updated.meta._sortCounter || 0);
	}

	setAfterRelationShip = (afterSecuredData) => {
		this._updated.meta._sortCounter = afterSecuredData.getRelationshipCounter() + 1;
	}

	checkAfter = (securedData) => {
		if (this.getRelationshipCounter() < securedData.getRelationshipCounter()) {
			throw new errors.SecurityError("wrong ordering. " + this.getRelationshipCounter() + " should be after " + securedData.getRelationshipCounter());
		}
	}

	checkBefore = (securedData) => {
		if (this.getRelationshipCounter() > securedData.getRelationshipCounter()) {
			throw new errors.SecurityError("wrong ordering. " + this.getRelationshipCounter() + " should be before " + securedData.getRelationshipCounter());
		}
	}
}

var api = {
	createPromisified: function (content, meta, options, signKey, cryptKey) {
		var securedData, securedDataPromise;
		securedDataPromise = Bluebird.fromCallback(function (cb) {
			securedData = api.create(content, meta, options, signKey, cryptKey, cb);
		});

		return {
			promise: securedDataPromise,
			data: securedData
		}
	},
	createAsync: function (content, meta, options, signKey, cryptKey) {
		return Bluebird.fromCallback(function (cb) {
			api.create(content, meta, options, signKey, cryptKey, cb);
		});
	},
	create: function (content, meta, options, signKey, cryptKey, cb) {
		var secured = api.createRaw(content, meta, options)

		Bluebird.resolve().delay(1).then(function () {
			return secured.signAndEncrypt(signKey, cryptKey);
		}).nodeify(cb);

		return secured;
	},
	load: function (content, meta, options) {
		return new SecuredData(content, meta, options, false);
	},
	createRaw: function (content, meta, options) {
		return new SecuredData(content, meta, options, true);
	}
}

export default api
