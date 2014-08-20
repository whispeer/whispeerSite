/**
* MessageService
**/
define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var knownBlobs = {};

	var service = function (socketService, keyStore) {
		var MyBlob = function (blobData, blobID) {
			this._blobData = blobData;

			if (typeof blobData === "string") {
				this._legacy = true;
			}

			if (blobID) {
				this._blobID = blobID;
				this._uploaded = true;
			} else {
				this._uploaded = false;
			}
		};

		MyBlob.prototype.encrypt = function () {
			//TODO
		};

		MyBlob.prototype.decrypt = function () {
			//TODO
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
			}, h.sF(function (val) {
				this.ne(keyStore.hash.hash(val));
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
					knownBlobs[blobID] = new MyBlob(blob, blobID);
				} else {
					knownBlobs[blobID] = new MyBlob(dataString, blobID);
				}

				this.ne(knownBlobs[blobID]);				
			}), step.multiplex(blobListener[blobID]));
		}

		var api = {
			createBlob: function (blob) {
				return new MyBlob(blob);
			},
			getBlob: function (blobID, cb) {
				step(function () {
					if (knownBlobs[blobID]) {
						this.last.ne(knownBlobs[blobID]);
					} else if (blobListener[blobID]) {
						blobListener[blobID].push(this.last);
					} else {
						blobListener[blobID] = [this.last];
						loadBlob(blobID);
					}
				}, h.sF(function (data) {
					var blob = h.dataURItoBlob("data:image/png;base64," + data.blob);
					knownBlobs[blobID] = new MyBlob(blob, blobID);

					this.ne(knownBlobs[blobID]);
				}), cb);
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