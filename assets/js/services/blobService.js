/**
* MessageService
**/
define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function (socketService, keyStore) {
		var MyBlob = function (blobData, blobID) {
			this._blobData = blobData;

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

		MyBlob.prototype.toURL = function () {
			if (typeof URL !== "undefined") {
				return URL.createObjectURL(this._blobData);
			} else if (typeof webkitURL !== "undefined") {
				return webkitURL.createObjectURL(this._blobData);
			} else {
				return h.blobToDataURI(this._blobData);
			}
		};

		MyBlob.prototype.getHash = function (cb) {
			var that = this;
			step(function () {
				this.ne(keyStore.hash.hash(h.blobToDataURI(that._blobData)));
			}, cb);
		};

		var api = {
			createBlob: function (blob) {
				return new MyBlob(blob);
			},
			getBlob: function (blobID, cb) {
				step(function () {
					socketService.emit("blob.getBlob", {
						blobid: blobID
					}, this);
				}, h.sF(function (data) {
					var blob = h.dataURItoBlob("data:image/png;base64," + data.blob);
					this.ne(new MyBlob(blob, blobID));
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