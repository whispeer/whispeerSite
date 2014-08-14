define(["whispeerHelper", "step", "crypto/keyStore", "asset/errors"], function (h, step, keyStore, errors) {
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

		this._originalMeta = meta || {};
		this._hasContent = true;

		if (typeof content === "undefined") {
			this._hasContent = false;
		} else if (isDecrypted) {
			this._content = content;
		} else {
			this._encryptedContent = content;
		}

		this._updatedMeta = h.deepCopyObj(this._originalMeta);

		this._updatedContent = this._content;

		this._isKeyVerified = false;
	}

	SecuredDataWithMetaData.prototype._blockDisallowedAttributes = function (data) {
		if (data._contentHash || data._key || data._signature || data._version) {
			throw new Error("content hash/key should not be provided by outside world");
		}
	};


	SecuredDataWithMetaData.prototype.getHash = function () {
		return this._originalMeta._ownHash;
	};

	SecuredDataWithMetaData.prototype.sign = function (signKey, cb, noCache) {
		var that = this;
		var toSign = h.deepCopyObj(that._updatedMeta);

		step(function () {
			toSign._version = 1;
			toSign._type = that._type;

			//do not sign attributes which should not be verified
			that._attributesNotVerified.forEach(function(attr) {
				delete toSign[attr];
			});

			if (that._paddedContent || that._updatedContent) {
				var hashContent = that._paddedContent || that._updatedContent;

				toSign._contentHash = keyStore.hash.hashObjectOrValueHex(hashContent);

				//create new ownHash
				delete toSign._ownHash;
				toSign._ownHash = keyStore.hash.hashObjectOrValueHex(toSign);
			}
			
			keyStore.sign.signObject(toSign, signKey, this, noCache);
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
				keyStore.security.addEncryptionIdentifier(that._originalMeta._key);
				that._signAndEncrypt(signKey, that._originalMeta._key, this);
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
		var that = this, hashObject;
		if (!that._hasContent) {
			throw new Error("can only sign and not encrypt");
		}

		if (that._originalMeta._key && (that._originalMeta._key !== cryptKey || !that._isKeyVerified)) {
			throw new Error("can not re-encrypt an old object with new key!");
		}

		step(function () {
			//add padding!
			keyStore.hash.addPaddingToObject(that._updatedContent, 128, this);
		}, h.sF(function (paddedContent) {
			that._paddedContent = paddedContent;

			that._updatedMeta._key = keyStore.correctKeyIdentifier(cryptKey);

			if (typeof paddedContent === "object" && that._encryptDepth > 0) {
				hashObject = keyStore.hash.deepHashObject(paddedContent);
			}

			this.parallel.unflatten();
			keyStore.sym.encryptObject(paddedContent, cryptKey, that._encryptDepth, this.parallel());
			that.sign(signKey, this.parallel());
		}), h.sF(function (cryptedData, meta) {
			if (hashObject) {
				meta._hashObject = hashObject;
			}

			that._updatedMeta = meta;

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
			var metaCopy = h.deepCopyObj(that._originalMeta);

			that._attributesNotVerified.forEach(function(attr) {
				delete metaCopy[attr];
			});

			if (metaCopy._type !== that._type) {
				throw new errors.SecurityError("invalid object type. is: " + metaCopy._type + " should be: " + that._type);
			}

			keyStore.sign.verifyObject(that._originalMeta._signature, metaCopy, signKey, this);
		}, h.sF(function (correctSignature) {
			if (!correctSignature) {
				throw new errors.SecurityError("signature did not match");
			}

			that._verifyContentHash();

			that._isKeyVerified = true;
			this.ne(true);
		}), cb);
	};

	SecuredDataWithMetaData.prototype.updated = function () {
		this._changed = false;

		this._meta = this._updatedMeta;
		this._originalMeta = this._updatedMeta;
		this._content = this._updatedContent;
	};

	SecuredDataWithMetaData.prototype.decrypt = function (cb) {
		var that = this;

		if (!this._hasContent) {
			cb();
			return;
		}

		step(function () {
			if (that._decrypted) {
				this.last.ne(that._content);
			} else {
				keyStore.sym.decryptObject(that._encryptedContent, that._encryptDepth, this, that._originalMeta._key);
			}
		}, h.sF(function (decryptedData) {
			that._decrypted = true;
			that._paddedContent = decryptedData;
			that._content = keyStore.hash.removePaddingFromObject(decryptedData, 128);
			that._updatedContent = that._content;

			that._verifyContentHash();

			this.ne(that._content);
		}), cb);
	};

	SecuredDataWithMetaData.prototype._verifyContentHash = function() {
		if (this._hasContent && this._decrypted) {
			var hash = keyStore.hash.hashObjectOrValueHex(this._paddedContent || this._content);
			if (hash !== this._originalMeta._contentHash) {
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

	SecuredDataWithMetaData.prototype.content = {};
	SecuredDataWithMetaData.prototype.meta = {};

	SecuredDataWithMetaData.prototype.contentGet = function () {
		return h.deepCopyObj(this._content);
	};
	SecuredDataWithMetaData.prototype.metaGet = function () {
		return h.deepCopyObj(this._updatedMeta);
	};
	SecuredDataWithMetaData.prototype.metaHasAttr = function (attr) {
		return this._updatedMeta.hasOwnProperty(attr);
	};
	SecuredDataWithMetaData.prototype.metaKeys = function () {
		return Object.keys(this._updatedMeta).filter(function (key) {
			return key[0] !== "_";
		});
	};
	SecuredDataWithMetaData.prototype.metaAttr = function (attr) {
		return h.deepCopyObj(this._updatedMeta[attr]);
	};

	/** sets the whole content to the given data
		@param newContent new value for this objects content
	*/
	SecuredDataWithMetaData.prototype.contentSet = function (newContent) {
		this._hasContent = this._changed = true;
		this._updatedContent = newContent;
	};

	/** joins content with the given object
		@param addContentData data to add to the content object
		@param removeEmpty remove empty options ("", {}, []) while joining
	*/
	SecuredDataWithMetaData.prototype.contentJoin = function (addContentData, removeEmpty) {
		if (typeof this._updatedContent !== "object") {
			throw new Error("our content is not an object");
		}

		this._changed = true;
		this._updatedContent = h.extend(this._updatedContent, addContentData, 5, removeEmpty);
	};

	/** set a certain attribute in the content object
		@param attrs [] list of which attribute to set
		@param value value to set attribute to
	*/
	SecuredDataWithMetaData.prototype.contentAdd = function (attrs, value) {
		if (typeof this._updatedContent !== "object") {
			throw new Error("our content is not an object");
		}

		this._changed = h.deepSetCreate(this._updatedContent, attrs, value) || this._changed;
	};

	/** sets the whole metaData to the given data
		@param newMetaData new value for this objects metaData
	*/
	SecuredDataWithMetaData.prototype.metaSet = function (newMetaData) {
		this._blockDisallowedAttributes(newMetaData);

		this._changed = true;
		this._updatedMeta = newMetaData;
	};

	/** joins meta with the given object
		@param addMetaData data to add to the meta object
		@param removeEmpty remove empty options ("", {}, []) while joining
	*/
	SecuredDataWithMetaData.prototype.metaJoin = function (addMetaData, removeEmpty) {
		this._blockDisallowedAttributes(addMetaData);

		this._changed = true;
		this._updatedMeta = h.extend(this._updatedMeta, addMetaData, 5, removeEmpty);
	};

	/** set a certain attribute in the meta object
		@param attrs [] list of which attribute to set
		@param value value to set attribute to
	*/
	SecuredDataWithMetaData.prototype.metaAdd = function (attrs, value) {
		this._changed = h.deepSetCreate(this._updatedMeta, attrs, value);
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