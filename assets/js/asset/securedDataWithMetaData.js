define(["whispeerHelper", "crypto/keyStore", "asset/errors", "config", "bluebird"], function (h, keyStore, errors, config, Bluebird) {
	"use strict";

	var attributesNeverVerified = ["_signature", "_hashObject"];

	/** crypted content with metadata
		@param content the content to handle either encrypted or decrypted
		@param meta metadata for the content
		@param isDecrypted whether the content is decrypted
	*/
	function SecuredDataWithMetaData(content, meta, options, isDecrypted) {
		options = options || {};

		//we need to somehow ensure that we have the correct object type.
		if (typeof options.type !== "string") {
			throw new Error("need a type for security!");
		}

		this._type = options.type;

		this._removeEmpty = options.removeEmpty;
		this._encryptDepth = options.encryptDepth || 0;

		this._attributesNotVerified = options.attributesNotVerified || [];
		this._attributesNotVerified.filter(function (val) {
			return val.match(/^A-z0-9$/);
		});
		this._attributesNotVerified = attributesNeverVerified.concat(this._attributesNotVerified);

		this._decrypted = isDecrypted;

		this._hasContent = true;

		this._original = {
			meta: meta || {}
		};

		if (typeof content === "undefined") {
			this._hasContent = false;
		} else if (isDecrypted) {
			this._original.content = content;
		} else {
			this._original.encryptedContent = content;
		}

		this._updated = h.deepCopyObj(this._original);

		this._isKeyVerified = false;
	}

	SecuredDataWithMetaData.prototype._blockDisallowedAttributes = function (data) {
		if (data._contentHash || data._key || data._signature || data._version) {
			throw new Error("content hash/key should not be provided by outside world");
		}
	};

	SecuredDataWithMetaData.prototype.getHash = function () {
		return this._updated.meta._ownHash;
	};

	SecuredDataWithMetaData.prototype.getKey = function () {
		return this._original.meta._key;
	};

	SecuredDataWithMetaData.prototype.sign = function (signKey, cb) {
		var that = this;
		var toSign = h.deepCopyObj(that._updated.meta);
		var hashVersion = config.hashVersion;

		return Bluebird.try(function () {
			toSign._version = 1;
			toSign._type = that._type;

			toSign._hashVersion = hashVersion;

			//do not sign attributes which should not be verified
			that._attributesNotVerified.forEach(function(attr) {
				delete toSign[attr];
			});

			if (that._updated.paddedContent || that._updated.content) {
				var hashContent = that._updated.paddedContent || that._updated.content;

				return keyStore.hash.hashObjectOrValueHexAsync(hashContent).then(function (contentHash) {
					toSign._contentHash = contentHash;

					//create new ownHash
					delete toSign._ownHash;
					return keyStore.hash.hashObjectOrValueHexAsync(toSign);
				}).then(function (ownHash) {
					toSign._ownHash = ownHash;
				});
			}
		}).then(function () {
			return keyStore.sign.signObject(toSign, signKey, hashVersion);
		}).then(function (signature) {
			toSign._signature = signature;

			return toSign;
		}).nodeify(cb);
	};

	SecuredDataWithMetaData.prototype.getUpdatedData = function (signKey, cb) {
		return this.verify(signKey).bind(this).then(function () {
			if (this._hasContent) {
				keyStore.security.addEncryptionIdentifier(this._original.meta._key);
				return this._signAndEncrypt(signKey, this._original.meta._key);
			}

			return this.sign(signKey, this);
		}).nodeify(cb);
	};

	/** sign and encrypt this object.
		pads and then encrypts our content.
		adds contentHash, key id and version to metaData and signs meta data.
		@param signKey key to use for signing
		@param cb callback(cryptedData, metaData),
	*/
	SecuredDataWithMetaData.prototype._signAndEncrypt = function (signKey, cryptKey, cb) {
		if (!this._hasContent) {
			throw new Error("can only sign and not encrypt");
		}

		if (this._original.meta._key && (this._original.meta._key !== cryptKey || !this._isKeyVerified)) {
			throw new Error("can not re-encrypt an old object with new key!");
		}

		return keyStore.hash.addPaddingToObject(this._updated.content, 128).bind(this).then(function (paddedContent) {
			this._updated.paddedContent = paddedContent;

			this._updated.meta._key = keyStore.correctKeyIdentifier(cryptKey);

			return Bluebird.all([
				keyStore.sym.encryptObject(paddedContent, cryptKey, this._encryptDepth),
				this.sign(signKey)
			]);
		}).spread(function (cryptedData, meta) {
			this._updated.meta = meta;

			return {
				content: cryptedData,
				meta: meta
			};
		}).nodeify(cb);
	};

	/** verify the decrypted data
		decrypts data if necessary
		@param signKey key to check signature against
		@param id id for signature caching
		@throw SecurityError: contenthash or signature wrong
	*/
	SecuredDataWithMetaData.prototype.verifyAsync = function (signKey, id) {
		//check contentHash is correct
		//check signature is correct

		return Bluebird.resolve().bind(this).then(function () {
			var metaCopy = h.deepCopyObj(this._original.meta);

			this._attributesNotVerified.forEach(function(attr) {
				delete metaCopy[attr];
			});

			if (metaCopy._type !== this._type) {
				throw new errors.SecurityError("invalid object type. is: " + metaCopy._type + " should be: " + this._type);
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

			return keyStore.sign.verifyObject(this._original.meta._signature, metaCopy, signKey, hashVersion, id);
		}).then(function (correctSignature) {
			if (!correctSignature) {
				alert("Bug: signature did not match (" + this._original.meta._type + ") Please report this bug!");
				throw new errors.SecurityError("signature did not match " + this._original.meta._type);
			}

			return this._verifyContentHash();
		}).then(function () {
			this._isKeyVerified = true;

			return true;
		});
	};

	SecuredDataWithMetaData.prototype.verify = function (signKey, cb, id) {
		return this.verifyAsync(signKey, id).nodeify(cb);
	};

	SecuredDataWithMetaData.prototype.updated = function () {
		this._changed = false;
	};

	SecuredDataWithMetaData.prototype._decrypt = function () {
		if (!this._decryptionPromise) {
			this._decryptionPromise = keyStore.sym.decryptObject(
				this._original.encryptedContent,
				this._encryptDepth,
				undefined,
				this._original.meta._key
			).bind(this).then(function (decryptedData) {
				this._decrypted = true;
				this._original.paddedContent = decryptedData;
				this._original.content = keyStore.hash.removePaddingFromObject(decryptedData, 128);
				this._updated.content = h.deepCopyObj(this._original.content);

				return this._verifyContentHash();
			});
		}

		return this._decryptionPromise;
	};

	SecuredDataWithMetaData.prototype.decrypt = function (cb) {
		return Bluebird.resolve().bind(this).then(function () {
			if (this._hasContent && !this._decrypted) {
				return this._decrypt();
			}
		}).then(function () {
			if (!this._hasContent) {
				return;
			}

			return this._original.content;
		}).nodeify(cb);
	};

	SecuredDataWithMetaData.prototype._verifyContentHash = function(cb) {
		if (!this._hasContent || !this._decrypted) {
			return Bluebird.resolve().nodeify(cb);
		}

		return Bluebird.bind(this).then(function () {
			return keyStore.hash.hashObjectOrValueHexAsync(this._original.paddedContent || this._original.content);
		}).then(function (hash) {
			if (hash !== this._original.meta._contentHash) {
				throw new errors.SecurityError("content hash did not match");
			}
		}).nodeify(cb);
	};

	SecuredDataWithMetaData.prototype.isChanged = function () {
		return this._changed;
	};
	SecuredDataWithMetaData.prototype.isEncrypted = function () {
		return !this._decrypted;
	};
	SecuredDataWithMetaData.prototype.isDecrypted = function () {
		return this._decrypted;
	};

	SecuredDataWithMetaData.prototype.contentGet = function () {
		return h.deepCopyObj(this._updated.content);
	};
	SecuredDataWithMetaData.prototype.metaGet = function () {
		return h.deepCopyObj(this._updated.meta);
	};
	SecuredDataWithMetaData.prototype.metaHasAttr = function (attr) {
		return this._updated.meta.hasOwnProperty(attr);
	};
	SecuredDataWithMetaData.prototype.metaKeys = function () {
		return Object.keys(this._updated.meta).filter(function (key) {
			return key[0] !== "_";
		});
	};
	SecuredDataWithMetaData.prototype.metaAttr = function (attr) {
		return h.deepCopyObj(this._updated.meta[attr]);
	};

	/** sets the whole content to the given data
		@param newContent new value for this objects content
	*/
	SecuredDataWithMetaData.prototype.contentSet = function (newContent) {
		this._hasContent = this._changed = true;
		this._updated.content = newContent;
	};

	/** set a certain attribute in the content object
		@param attr attribute to set
		@param value value to set attribute to
	*/
	SecuredDataWithMetaData.prototype.contentSetAttr = function (attr, value) {
		if (typeof this._updated.content !== "object") {
			throw new Error("our content is not an object");
		}

		this._updated.content[attr] = value;
		this._changed = true;
	};

	/** sets the whole metaData to the given data
		@param newMetaData new value for this objects metaData
	*/
	SecuredDataWithMetaData.prototype.metaSet = function (newMetaData) {
		this._blockDisallowedAttributes(newMetaData);

		this._changed = true;
		this._updated.meta = newMetaData;
	};

	SecuredDataWithMetaData.prototype.metaRemoveAttr = function (attr) {
		if (attr[0] === "_") {
			throw new Error("private attributes should not be provided by outside world");
		}

		this._changed = true;
		delete this._updated.meta[attr];
	};

	SecuredDataWithMetaData.prototype.metaSetAttr = function (attr, value) {
		if (attr[0] === "_") {
			throw new Error("private attributes should not be provided by outside world");
		}

		this._changed = true;
		this._updated.meta[attr] = value;
	};

	/** set a certain attribute in the meta object
		@param attrs [] list of which attribute to set
		@param value value to set attribute to
	*/
	SecuredDataWithMetaData.prototype.metaAdd = function (attrs, value) {
		this._changed = h.deepSetCreate(this._updated.meta, attrs, value);
	};

	SecuredDataWithMetaData.prototype.setParent = function (parentSecuredData) {
		this._updated.meta._parent = parentSecuredData.getHash();
	};

	SecuredDataWithMetaData.prototype.checkParent = function (expectedParent) {
		if (this._updated.meta._parent !== expectedParent.getHash()) {
			throw new errors.SecurityError("wrong parent. is: " + this._updated.meta._parent + " should be: " + expectedParent.getHash());
		}
	};

	SecuredDataWithMetaData.prototype.getRelationshipCounter = function () {
		return h.parseDecimal(this._updated.meta._sortCounter || 0);
	};

	SecuredDataWithMetaData.prototype.setAfterRelationShip = function (afterSecuredData) {
		this._updated.meta._sortCounter = afterSecuredData.getRelationshipCounter() + 1;
	};

	SecuredDataWithMetaData.prototype.checkAfter = function (securedData) {
		if (this.getRelationshipCounter() < securedData.getRelationshipCounter()) {
			throw new errors.SecurityError("wrong ordering. " + this.getRelationshipCounter() + " should be after " + securedData.getRelationshipCounter());
		}
	};

	SecuredDataWithMetaData.prototype.checkBefore = function (securedData) {
		if (this.getRelationshipCounter() > securedData.getRelationshipCounter()) {
			throw new errors.SecurityError("wrong ordering. " + this.getRelationshipCounter() + " should be before " + securedData.getRelationshipCounter());
		}
	};

	var api = {
		createPromisified: function (content, meta, options, signKey, cryptKey) {
			var securedData, securedDataPromise;
			securedDataPromise = new Bluebird(function (resolve, reject) {
				securedData = api.create(content, meta, options, signKey, cryptKey, function (e, res) {
					if (e) {
						return reject(e);
					}

					resolve(res);
				});
			});

			return {
				promise: securedDataPromise,
				data: securedData
			};
		},
		create: function (content, meta, options, signKey, cryptKey, cb) {
			var secured = new SecuredDataWithMetaData(content, meta, options, true);

			Bluebird.resolve().delay(1).then(function () {
				return secured._signAndEncrypt(signKey, cryptKey);
			}).nodeify(cb);

			return secured;
		},
		load: function (content, meta, options) {
			return new SecuredDataWithMetaData(content, meta, options);
		},
		createRaw: function (content, meta, options) {
			return new SecuredDataWithMetaData(content, meta, options, true);
		}
	};

	return api;
});
