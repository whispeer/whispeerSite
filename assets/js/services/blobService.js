/**
* MessageService
**/
define(["step", "whispeerHelper", "asset/Progress", "asset/Queue", "services/serviceModule", "debug", "bluebird"], function (step, h, Progress, Queue, serviceModule, debug, Bluebird) {
	"use strict";

	var knownBlobs = {};
	var downloadBlobQueue = new Queue(1);
	downloadBlobQueue.start();

	var debugName = "whispeer:blobService";
	var blobServiceDebug = debug(debugName);

	function time(name) {
		if (debug.enabled(debugName)) {
			console.time(name);
		}
	}

	function timeEnd(name) {
		if (debug.enabled(debugName)) {
			console.timeEnd(name);
		}
	}

	var service = function ($rootScope, socketService, keyStore, errorService, Cache, initService) {
		var blobCache = new Cache("blobs");

		var MyBlob = function (blobData, blobID, options) {
			this._blobData = blobData;
			options = options || {};

			if (typeof blobData === "string") {
				this._legacy = true;
			} else if (blobData instanceof File) {
				this._file = true;
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

			this._uploadProgress = new Progress({ total: this.getSize() });
			this._encryptProgress = new Progress({ total: this.getSize() });
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

		MyBlob.prototype.getArrayBuffer = function (cb) {
			var that = this;
			step(function () {
				var reader = new FileReader();

				if (reader.addEventListener) {
					reader.addEventListener("loadend", this.ne);
				} else {
					reader.onloadend = this.ne;
				}

				reader.readAsArrayBuffer(that._blobData);
			}, h.sF(function (event) {
				var target = event.currentTarget || event.target;

				this.ne(target.result);
			}), cb);
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

				this.parallel.unflatten();
				keyStore.sym.generateKey(this.parallel(), "blob key");
				
				that.getArrayBuffer(this.parallel());
			}, h.sF(function (_key, buf) {
				that._key = _key;

				time("blobencrypt" + (that._blobID || that._preReserved));
				keyStore.sym.encryptArrayBuffer(buf, that._key, this, function (progress) {
					that._encryptProgress.progress(that.getSize() * progress);	
				});
			}), h.sF(function (encryptedData) {
				that._encryptProgress.progress(that.getSize());
				timeEnd("blobencrypt" + (that._blobID || that._preReserved));
				blobServiceDebug(encryptedData.byteLength);
				that._decrypted = false;

				that._blobData = new Blob([encryptedData], {type: that._blobData.type});

				this.ne(that._key);
			}), cb);
		};

		MyBlob.prototype.decrypt = function (cb) {
			var that = this;
			step(function () {
				if (that._decrypted) {
					this.last.ne();
				}

				that.getArrayBuffer(this);
			}, h.sF(function (encryptedData) {
				time("blobdecrypt" + that._blobID);
				keyStore.sym.decryptArrayBuffer(encryptedData, that._key, this);
			}), h.sF(function (decryptedData) {
				timeEnd("blobdecrypt" + that._blobID);

				that._decrypted = true;

				that._blobData = new Blob([decryptedData], {type: that._blobData.type});
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

		MyBlob.prototype.upload = function (cb) {
			var that = this;
			step(function () {
				if (that._uploaded) {
					this.last.ne(that._blobID);
				} else {
					that.reserveID(this);
				}
			}, h.sF(function (blobid) {
				socketService.uploadBlob(that._blobData, blobid, that._uploadProgress, this);
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
				meta.one = 1;

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

					knownBlobs[that._blobID] = Bluebird.resolve(that);

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
					knownBlobs[that._preReserved] = Bluebird.resolve(that);
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
					} else if (that._blobData.localURL) {
						this.ne(that._blobData.localURL);
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

		MyBlob.prototype.getStringRepresentation = function (cb) {
			if (this._legacy) {
				cb(null, this._blobData);
			} else {
				h.blobToDataURI(this._blobData, cb);
			}
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

		function addBlobToDB(blob) {
			blobCache.store(blob.getBlobID(), blob._meta, blob._blobData).catch(errorService.criticalError);
		}

		function loadBlobFromServer(blobID) {
			return downloadBlobQueue.enqueue(1, function () {
				return Bluebird.all([
					socketService.awaitNoRequests(),
					initService.awaitLoading
				]).then(function () {
					return socketService.emit("blob.getBlob", {
						blobid: blobID
					});
				}).then(function (data) {
					var dataString = "data:image/png;base64," + data.blob;
					var blob = h.dataURItoBlob(dataString), theBlob;

					if (blob) {
						theBlob = new MyBlob(blob, blobID, { meta: data.meta });
					} else {
						theBlob = new MyBlob(dataString, blobID, { meta: data.meta });
					}

					addBlobToDB(theBlob);

					return theBlob;
				});
			});
		}

		function loadBlobFromDB(blobID) {
			return blobCache.get(blobID).then(function (data) {
				if (typeof data.blob === "undefined") {
					throw new Error("cache invalid!");
				}
				return new MyBlob(data.blob, blobID, { meta: data.data });
			});
		}

		function loadBlob(blobID) {
			return loadBlobFromDB(blobID).catch(function () {
				return loadBlobFromServer(blobID);
			});
		}

		var api = {
			createBlob: function (blob) {
				return new MyBlob(blob);
			},
			getBlob: function (blobID, cb) {
				if (!knownBlobs[blobID]) {
					knownBlobs[blobID] = loadBlob(blobID);
				}

				step.unpromisify(knownBlobs[blobID], h.addAfterHook(cb, $rootScope.$applyAsync.bind($rootScope, null)));
			}
		};

		return api;
	};

	service.$inject = ["$rootScope", "ssn.socketService", "ssn.keyStoreService", "ssn.errorService", "ssn.cacheService", "ssn.initService"];

	serviceModule.factory("ssn.blobService", service);
});
