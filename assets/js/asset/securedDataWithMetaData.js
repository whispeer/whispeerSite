define(["whispeerHelper", "step", "crypto/keyStore", "asset/errors"], function (h, step, keyStore, errors) {
	"use strict";
	/** crypted content with metadata
		@param content the content to handle either encrypted or decrypted
		@param meta metadata for the content
		@param isDecrypted whether the content is decrypted
	*/
	function SecuredDataWithMetaData(content, meta, options, isDecrypted) {
		options = options || {};
		this._removeEmpty = options.removeEmpty;
		this._encryptDepth = options.encryptDepth || 0;

		this._decrypted = isDecrypted;

		this._meta = meta || {};
		this._hasContent = true;

		if (typeof content === "undefined") {
			this._hasContent = false;
		} else if (isDecrypted) {
			this._content = content;
		} else {
			this._encryptedContent = content;
		}

		this._updatedMeta = h.deepCopyObj(this._meta);

		this._updatedContent = this._content;
	}

	SecuredDataWithMetaData.prototype._blockDisallowedAttributes = function (data) {
		if (data._contentHash || data._key || data._signature || data._version) {
			throw new Error("content hash/key should not be provided by outside world");
		}
	};

	SecuredDataWithMetaData.prototype.sign = function (signKey, cb) {
		var that = this;
		var toSign = h.deepCopyObj(that._updatedMeta);

		step(function () {
			toSign._version = 1;

			delete toSign._signature;
			delete toSign._hashObject;
			
			keyStore.sign.signObject(toSign, signKey, this);
		}, h.sF(function (signature) {
			toSign._signature = signature;

			this.ne(toSign);
		}), cb);

	};

	/** sign and encrypt this object.
		pads and then encrypts our content.
		adds contentHash, key id and version to metaData and signs meta data.
		@param signKey key to use for signing
		@param cryptKey key to use for encryption
		@param cb callback(cryptedData, metaData),
	*/
	SecuredDataWithMetaData.prototype.signAndEncrypt = function (signKey, cryptKey, cb) {
		if (!that._hasContent) {
			throw new Error("can only sign and not encrypt");
		}

		var that = this, hashObject;
		step(function () {
			//add padding!
			keyStore.hash.addPaddingToObject(that._updatedContent, 128, this);
		}, h.sF(function (paddedContent) {
			that._updatedMeta._contentHash = keyStore.hash.hashObjectOrValueHex(paddedContent);
			that._updatedMeta._key = keyStore.correctKeyIdentifier(cryptKey);

			if (typeof paddedContent === "object") {
				hashObject = keyStore.hash.deepHashObject(paddedContent);
			}

			this.parallel.unflatten();
			keyStore.sym.encryptObject(paddedContent, cryptKey, that._encryptDepth, this.parallel());
			that.sign(signKey, this.parallel());
		}), h.sF(function (cryptedData) {
			if (hashObject) {
				that._updatedMeta._hashObject = hashObject;
			}

			this.ne({
				content: cryptedData,
				meta: that._updatedMeta
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
			that.decrypt(this);
		}, h.sF(function () {
			if (that._hasContent) {
				if (keyStore.hash.hashObjectOrValueHex(that._paddedContent) !== that._meta._contentHash) {
					throw new errors.SecurityError("content hash did not match");
				}
			}

			var metaCopy = h.deepCopyObj(that._meta);

			delete metaCopy._signature;
			delete metaCopy._hashObject;

			keyStore.sign.verifyObject(that._meta._signature, metaCopy, signKey, this);
		}), h.sF(function (correctSignature) {
			if (!correctSignature) {
				throw new errors.SecurityError("signature did not match");
			}

			this.ne();
		}), cb);
	};

	SecuredDataWithMetaData.prototype.decrypt = function (cb) {
		var that = this;

		if (!this._hasContent) {
			cb();
			return;
		}

		step(function () {
			if (that._decrypted) {
				this.last.ne();
			} else {
				keyStore.sym.decryptObject(that._encryptedContent, that._encryptDepth, this, that._meta._key);
			}
		}, h.sF(function (decryptedData) {
			that._paddedContent = decryptedData;
			that._content = keyStore.hash.removePaddingFromObject(decryptedData, 128);

			this.ne(that._content);
		}), cb);
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
		return h.deepCopyObj(this._meta);
	};
	SecuredDataWithMetaData.prototype.metaHasAttr = function (attr) {
		return this._meta.hasOwnProperty(attr);
	};
	SecuredDataWithMetaData.prototype.metaAttr = function (attr) {
		return h.deepCopyObj(this._meta[attr]);
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

		this._changed = h.deepSetCreate(this._updatedMeta, attrs, value);
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

	return SecuredDataWithMetaData;
});