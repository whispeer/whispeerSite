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

			this._decrypted = options.decrypted || !this._uploaded || false;
		};

		MyBlob.prototype.encrypt = function (cb) {
			var that = this, key;
			step(function () {
				if (that._uploaded || !that._decrypted) {
					throw new Error("trying to encrypt an already encrypted or public blob. add a key decryptor if you want to give users access");
				}

				window.setTimeout(this, 5000);
			}, h.sF(function () {

				this.parallel.unflatten();
				keyStore.sym.generateKey(this.parallel(), "blob key");
				that.getBase64Representation(this.parallel());
			}), h.sF(function (_key, base64Blob) {
				key = _key;

				console.time("blobencrypt");
				keyStore.sym.encryptBigBase64(base64Blob, key, this);
			}), h.sF(function (encryptedData) {
				that._decrypted = false;

				encryptedData = "data:" + that._blobData.type + ";base64," + encryptedData;

				if (that._legacy) {
					that._blobData = encryptedData;
				} else {
					that._blobData = h.dataURItoBlob(encryptedData);
				}
				this.ne(key);
			}), cb);
		};

		MyBlob.prototype.decrypt = function (key, cb) {
			var that = this;
			step(function () {
				if (that._decrypted) {
					this.last.ne();
				}

				that.getBase64Representation(this.parallel());
			}, h.sF(function (encryptedData) {
				console.time("blobdecrypt");
				keyStore.sym.decryptBigBase64(encryptedData, key, this);
			}), h.sF(function (decryptedData) {
				console.timeEnd("blobdecrypt");

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

		MyBlob.prototype.upload = function (cb) {
			var that = this;
			step(function () {
				if (that._uploaded) {
					this.last.ne(that._blobID);
				} else {
					that.reserveID(this);
				}
			}, h.sF(function (blobid) {
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
				if (that._preReserved) {
					socketService.emit("blob.fullyReserveID", {
						blobid: that._preReserved
					}, this);
				} else {
					socketService.emit("blob.reserveBlobID", {}, this);
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

		function loadBlob(blobID, isPublic) {
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
					knownBlobs[blobID] = new MyBlob(blob, blobID, { decrypted: isPublic });
				} else {
					knownBlobs[blobID] = new MyBlob(dataString, blobID, { decrypted: isPublic });
				}

				this.ne(knownBlobs[blobID]);				
			}), step.multiplex(blobListener[blobID]));
		}

		var api = {
			createBlob: function (blob) {
				return new MyBlob(blob);
			},
			getBlob: function (blobID, cb, isPublic) {
				step(function () {
					if (knownBlobs[blobID]) {
						this.ne(knownBlobs[blobID]);
					} else if (blobListener[blobID]) {
						blobListener[blobID].push(this);
					} else {
						blobListener[blobID] = [this];
						loadBlob(blobID, isPublic);
					}
				}, cb);
			}
		};

		return api;
	};

	service.$inject = ["ssn.socketService", "ssn.keyStoreService"];

	return service;
});

/*

var fd = new FormData();
fd.append('fname', 'test.wav');
fd.append('data', soundBlob);
$.ajax({
    type: 'POST',
    url: '/upload.php',
    data: fd,
    processData: false,
    contentType: false
}).done(function(data) {
       console.log(data);
});

*/