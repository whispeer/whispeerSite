define(["whispeerHelper", "step", "crypto/keyStore", "asset/errors", "config"], function (h, step, keyStore, errors, config) {
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
		this._decryptionFullFiller = new h.FullFiller();

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

	SecuredDataWithMetaData.prototype.sign = function (signKey, cb, noCache) {
		var that = this;
		var toSign = h.deepCopyObj(that._updated.meta);
		var hashVersion = config.hashVersion;

		step(function () {
			toSign._version = 1;
			toSign._type = that._type;

			//do not sign attributes which should not be verified
			that._attributesNotVerified.forEach(function(attr) {
				delete toSign[attr];
			});

			if (that._updated.paddedContent || that._updated.content) {
				var hashContent = that._updated.paddedContent || that._updated.content;

				toSign._contentHash = keyStore.hash.hashObjectOrValueHex(hashContent);

				//create new ownHash
				delete toSign._ownHash;
				toSign._ownHash = keyStore.hash.hashObjectOrValueHex(toSign);
			}

			toSign._hashVersion = hashVersion;

			keyStore.sign.signObject(toSign, signKey, this, noCache, hashVersion);
		}, h.sF(function (signature) {
			toSign._signature = signature;

			this.ne(toSign);
		}), cb);
	};

	SecuredDataWithMetaData.prototype.getUpdatedData = function (signKey, cb) {
		var that = this;

		step(function () {
			that.verify(signKey, this);
		}, h.sF(function () {
			if (that._hasContent) {
				keyStore.security.addEncryptionIdentifier(that._original.meta._key);
				that._signAndEncrypt(signKey, that._original.meta._key, this);
			} else {
				that.sign(signKey, this);
			}
		}), cb);
	};

	/** sign and encrypt this object.
		pads and then encrypts our content.
		adds contentHash, key id and version to metaData and signs meta data.
		@param signKey key to use for signing
		@param cb callback(cryptedData, metaData),
	*/
	SecuredDataWithMetaData.prototype._signAndEncrypt = function (signKey, cryptKey, cb) {
		var that = this;
		if (!that._hasContent) {
			throw new Error("can only sign and not encrypt");
		}

		if (that._original.meta._key && (that._original.meta._key !== cryptKey || !that._isKeyVerified)) {
			throw new Error("can not re-encrypt an old object with new key!");
		}

		step(function () {
			//add padding!
			keyStore.hash.addPaddingToObject(that._updated.content, 128, this);
		}, h.sF(function (paddedContent) {
			that._updated.paddedContent = paddedContent;

			that._updated.meta._key = keyStore.correctKeyIdentifier(cryptKey);

			this.parallel.unflatten();
			keyStore.sym.encryptObject(paddedContent, cryptKey, that._encryptDepth, this.parallel());
			that.sign(signKey, this.parallel());
		}), h.sF(function (cryptedData, meta) {
			that._updated.meta = meta;

			this.ne({
				content: cryptedData,
				meta: meta
			});
		}), cb);
	};

	/** verify the decrypted data
		decrypts data if necessary
		@param signKey key to check signature against
		@param cb called when signature was ok, otherwise SecurityError is thrown
		@throw SecurityError: contenthash or signature wrong
	*/
	SecuredDataWithMetaData.prototype.verify = function (signKey, cb) {
		var that = this;
		//check contentHash is correct
		//check signature is correct
		//question: store signature with meta data? -> YES!
		step(function () {
			var metaCopy = h.deepCopyObj(that._original.meta);

			that._attributesNotVerified.forEach(function(attr) {
				delete metaCopy[attr];
			});

			if (metaCopy._type !== that._type) {
				throw new errors.SecurityError("invalid object type. is: " + metaCopy._type + " should be: " + that._type);
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

			keyStore.sign.verifyObject(that._original.meta._signature, metaCopy, signKey, this, hashVersion);
		}, h.sF(function (correctSignature) {
			if (!correctSignature) {
				alert("Bug: signature did not match (" + that._original.meta._type + ") Please report this bug!");
				throw new errors.SecurityError("signature did not match " + that._original.meta._type);
			}

			that._verifyContentHash();

			that._isKeyVerified = true;
			this.ne(true);
		}), cb);
	};

	SecuredDataWithMetaData.prototype.updated = function () {
		this._changed = false;
	};

	SecuredDataWithMetaData.prototype._decrypt = function (cb) {
		var that = this;

		step(function () {
			that._decryptionFullFiller.await(cb);
			that._decryptionFullFiller.start(this);
		}, h.sF(function () {
			keyStore.sym.decryptObject(that._original.encryptedContent, that._encryptDepth, this, that._original.meta._key);
		}), h.sF(function (decryptedData) {
			that._decrypted = true;
			that._original.paddedContent = decryptedData;
			that._original.content = keyStore.hash.removePaddingFromObject(decryptedData, 128);
			that._updated.content = h.deepCopyObj(that._original.content);

			that._verifyContentHash();

			this.ne();
		}), this._decryptionFullFiller.finish);
	};

	SecuredDataWithMetaData.prototype.decrypt = function (cb) {
		var that = this;

		if (!this._hasContent) {
			cb();
			return;
		}

		if (this._decrypted) {
			cb(null, this._original.content);
			return;
		}

		step(function () {
			that._decrypt(this);
		}, h.sF(function () {
			this.ne(that._original.content);
		}), cb);
	};

	SecuredDataWithMetaData.prototype._verifyContentHash = function() {
		if (this._hasContent && this._decrypted) {
			var hash = keyStore.hash.hashObjectOrValueHex(this._original.paddedContent || this._original.content);
			if (hash !== this._original.meta._contentHash) {
				throw new errors.SecurityError("content hash did not match");
			}
		}
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
		create: function (content, meta, options, signKey, cryptKey, cb) {
			var secured = new SecuredDataWithMetaData(content, meta, options, true);
			step(function () {
				window.setTimeout(this, 0);
			}, h.sF(function () {
				secured._signAndEncrypt(signKey, cryptKey, this);
			}), cb);

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
