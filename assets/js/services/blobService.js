/**
* MessageService
**/
define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var knownBlobs = {};

	var service = function (socketService, keyStore) {
		var MyBlob = function (blobData, blobID, options) {
			this._blobData = blobData;
			options = options || {};

			if (typeof blobData === "string") {
				this._legacy = true;
			}

			if (blobID) {
				this._blobID = blobID;
				this._uploaded = true;
			} else {
				this._uploaded = false;
			}

			this._meta = options.meta || {};
			this._key = this._meta._key;
			this._decrypted = !this._key;

			this._uploadStatus = {
				uploaded: this._uploaded,
				acting: false,
				uploading: false,
				percentage: -1,
				encrypting: false
			};
		};

		MyBlob.prototype.isUploaded = function () {
			return this._uploaded;
		};

		MyBlob.prototype.setMeta = function (meta) {
			if (!this.isUploaded()) {
				this._meta = meta;
			}
		};

		MyBlob.prototype.getSize = function () {
			return this._blobData.size;
		};

		MyBlob.prototype.getMeta = function () {
			return this._meta;
		};

		MyBlob.prototype.encryptAndUpload = function (key, cb) {
			var that = this, blobKey;
			step(function () {
				that.encrypt(this);
			}, h.sF(function (_blobKey) {
				blobKey = _blobKey;
				keyStore.sym.symEncryptKey(blobKey, key, this);
			}), h.sF(function () {
				that.upload(this);
			}), h.sF(function () {
				this.ne(blobKey);
			}), cb);
		};

		MyBlob.prototype.encrypt = function (cb) {
			var that = this;
			step(function () {
				if (that._uploaded || !that._decrypted) {
					throw new Error("trying to encrypt an already encrypted or public blob. add a key decryptor if you want to give users access");
				}

				that._uploadStatus.encrypting = true;
				that._uploadStatus.acting = true;

				this.parallel.unflatten();
				keyStore.sym.generateKey(this.parallel(), "blob key");
				that.getBase64Representation(this.parallel());
			}, h.sF(function (_key, base64Blob) {
				that._key = _key;

				console.time("blobencrypt");
				keyStore.sym.encryptBigBase64(base64Blob, that._key, this);
			}), h.sF(function (encryptedData) {
				console.timeEnd("blobencrypt");
				that._decrypted = false;

				encryptedData = "data:" + that._blobData.type + ";base64," + encryptedData;

				if (that._legacy) {
					that._blobData = encryptedData;
				} else {
					that._blobData = h.dataURItoBlob(encryptedData);
				}

				that._uploadStatus.encrypting = false;

				this.ne(that._key);
			}), cb);
		};

		MyBlob.prototype.decrypt = function (cb) {
			var that = this;
			step(function () {
				if (that._decrypted) {
					this.last.ne();
				}

				that.getBase64Representation(this);
			}, h.sF(function (encryptedData) {
				console.time("blobdecrypt" + that._blobID);
				keyStore.sym.decryptBigBase64(encryptedData, that._key, this);
			}), h.sF(function (decryptedData) {
				console.timeEnd("blobdecrypt" + that._blobID);

				that._decrypted = true;

				decryptedData = "data:" + that._blobData.type + ";base64," + decryptedData;

				if (that._legacy) {
					that._blobData = decryptedData;
				} else {
					that._blobData = h.dataURItoBlob(decryptedData);
				}
				this.ne();
			}), cb);
		};

		MyBlob.prototype.getBase64Representation = function (cb) {
			var that = this;
			step(function () {
				that.getStringRepresentation(this);
			}, h.sF(function (blobValue) {
				this.ne(blobValue.split(",")[1]);
			}), cb);
		};

		MyBlob.prototype.getBinaryRepresentation = function (cb) {
			var that = this;
			step(function () {
				that.getBase64Representation(this);
			}, h.sF(function (base64) {
				this.ne(keyStore.format.base64ToBits(base64));
			}), cb);
		};

		MyBlob.prototype.getStringRepresentation = function (cb) {
			if (this._legacy) {
				cb(null, this._blobData);
			} else {
				h.blobToDataURI(this._blobData, cb);
			}
		};

		MyBlob.prototype.getUploadStatus = function () {
			return this._uploadStatus;
		};

		MyBlob.prototype._registerListener = function (blobid) {
			var that = this;
			socketService.uploadObserver.listen(function () {
				that._uploadStarted();
			}, "uploadStart:" + blobid);

			socketService.uploadObserver.listen(function (blobid) {
				that._uploadProgress(blobid);
			}, "uploadProgress:" + blobid);

			socketService.uploadObserver.listen(function () {
				that._uploadFinished();
			}, "uploadFinished:" + blobid);
		};

		MyBlob.prototype._uploadStarted = function () {
			this._uploadStatus.uploading = true;
			this._uploadStatus.acting = true;
			this._uploadStatus.percentage = 0;
		};

		MyBlob.prototype._uploadProgress = function (blobid) {
			var u = socketService.getUploadStatus(blobid);
			this._uploadStatus.percentage = u.uploaded / u.fullSize;
		};

		MyBlob.prototype._uploadFinished = function () {
			this._uploadStatus.percentage = 1;
			this._uploadStatus.uploading = false;
			this._uploadStatus.uploaded = true;
		};

		MyBlob.prototype.upload = function (cb) {
			var that = this;
			step(function () {
				if (that._uploaded) {
					this.last.ne(that._blobID);
				} else {
					that.reserveID(this);
				}
			}, h.sF(function (blobid) {
				that._registerListener(blobid);

				socketService.uploadBlob(that._blobData, blobid, this);
			}), h.sF(function () {
				that._uploaded = true;

				this.ne(that._blobID);
			}), cb);
		};

		MyBlob.prototype.getBlobID = function () {
			return this._blobID;
		};

		MyBlob.prototype.reserveID = function (cb) {
			var that = this;
			step(function () {
				var meta = that._meta;
				meta._key = that._key;

				if (that._preReserved) {
					socketService.emit("blob.fullyReserveID", {
						blobid: that._preReserved,
						meta: meta
					}, this);
				} else {
					socketService.emit("blob.reserveBlobID", {
						meta: meta
					}, this);
				}
			}, h.sF(function (data) {
				if (data.blobid) {
					that._blobID = data.blobid;

					knownBlobs[that._blobID] = that;

					this.ne(that._blobID);
				}
			}), cb);
		};

		MyBlob.prototype.preReserveID = function (cb) {
			var that = this;
			step(function () {
				socketService.emit("blob.preReserveID", {}, this);
			}, h.sF(function (data) {
				if (data.blobid) {
					that._preReserved = data.blobid;
					knownBlobs[that._preReserved] = that;
					this.ne(data.blobid);
				} else {
					throw new Error("got no blobid");
				}
			}), cb);
		};

		MyBlob.prototype.toURL = function (cb) {
			var that = this;
			step(function () {
				try {
					if (that._legacy) {
						this.ne(that._blobData);
					} else if (typeof window.URL !== "undefined") {
						this.ne(window.URL.createObjectURL(that._blobData));
					} else if (typeof webkitURL !== "undefined") {
						this.ne(window.webkitURL.createObjectURL(that._blobData));
					} else {
						h.blobToDataURI(that._blobData, this);
					}
				} catch (e) {
					this.ne("");
				}
			}, cb);
		};

		MyBlob.prototype.getHash = function (cb) {
			var that = this;
			step(function () {
				that.getStringRepresentation(this);
			}, h.sF(function (blobValue) {
				var base64 = blobValue.split(",")[1];

				keyStore.hash.hashBigBase64CodedData(base64, this);
			}), cb);
		};

		var blobListener = {};

		function loadBlob(blobID) {
			if (socketService.getLoadingCount() !== 0) {
				window.setTimeout(function () {
					loadBlob(blobID);
				}, 100);
				return;
			}

			step(function () {
				socketService.emit("blob.getBlob", {
					blobid: blobID
				}, this);
			}, h.sF(function (data) {
				var dataString = "data:image/png;base64," + data.blob;
				var blob = h.dataURItoBlob(dataString);
				if (blob) {
					knownBlobs[blobID] = new MyBlob(blob, blobID, { meta: data.meta });
				} else {
					knownBlobs[blobID] = new MyBlob(dataString, blobID, { meta: data.meta });
				}

				this.ne(knownBlobs[blobID]);
			}), step.multiplex(blobListener[blobID]));
		}


		function blobToDataSet(blob, cb) {
			step(function () {
				this.parallel.unflatten();
				blob.preReserveID(this.parallel());
				blob.getHash(this.parallel());
			}, h.sF(function (id, hash) {
				this.ne({
					blob: blob,
					meta: {
						imageHash: hash,
						id: id
					}
				});
			}), cb);
		}

		var api = {
			prepareImage: function (image, cb) {
				//var MINSIZEDIFFERENCE = 1000;
				var original, preview;
				var originalSize, previewSize;
				step(function () {
					var original = image.downSize();
					var preview = image.downSize(600);

					originalSize = {
						width: original.width,
						height: original.height
					};

					previewSize = {
						width: preview.width,
						height: preview.height
					};

					this.parallel.unflatten();
					h.canvasToBlob(original, this.parallel());
					h.canvasToBlob(preview, this.parallel());
				}, h.sF(function (_original, _preview) {
					original = api.createBlob(_original);
					preview = api.createBlob(_preview);

					this.parallel.unflatten();
					blobToDataSet(original, this.parallel());

					//if (preview.getSize() < original.getSize() - MINSIZEDIFFERENCE) {
					blobToDataSet(preview, this.parallel());
					//}
				}), h.sF(function (original, preview) {
					original.meta.width = originalSize.width;
					original.meta.height = originalSize.height;
					preview.meta.width = previewSize.width;
					preview.meta.height = previewSize.height;

					var result = { original: original };
					if (preview) {
						result.preview = preview;
					}

					this.ne(result);
				}), cb);
			},
			createBlob: function (blob) {
				return new MyBlob(blob);
			},
			getBlob: function (blobID, cb) {
				step(function () {
					if (knownBlobs[blobID]) {
						this.ne(knownBlobs[blobID]);
					} else if (blobListener[blobID]) {
						blobListener[blobID].push(this);
					} else {
						blobListener[blobID] = [this];
						loadBlob(blobID);
					}
				}, cb);
			}
		};

		return api;
	};

	service.$inject = ["ssn.socketService", "ssn.keyStoreService"];

	return service;
});
