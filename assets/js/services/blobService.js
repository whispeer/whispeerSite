/**
* MessageService
**/
define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function (socketService, keyStore) {
		var myBlob = function (blobData, blobID) {
			this._blobData = blobData;

			if (blobID) {
				this._blobID = blobID;
				this._uploaded = true;
			} else {
				this._uploaded = false;
			}
		};

		myBlob.prototype.encrypt = function () {
			//TODO
		};

		myBlob.prototype.decrypt = function () {
			//TODO
		};

		myBlob.prototype.upload = function (cb) {
			var that = this;
			step(function () {
				if (that._uploaded) {
					this.last.ne(this._blobID);
				} else {
					that.reserveID(this);
				}
			}, h.sF(function (blobid) {
				socketService.uploadBlob(that, blobid, this);
			}), h.sF(function () {
				that._uploaded = true;

				this.ne(that._blobID);
			}), cb);
		};

		myBlob.prototype.getBlobID = function () {
			return this._blobID;
		};

		myBlob.prototype.reserveID = function (cb) {
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

		myBlob.prototype.preReserveID = function (cb) {
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

		myBlob.prototype.toURL = function () {
			if (typeof URL !== "undefined") {
				this.ne(URL.createObjectURL(this._blobData));
			} else if (typeof webkitURL !== "undefined") {
				this.ne(webkitURL.createObjectURL(this._blobData));
			} else {
				this.ne(h.blobToDataURL(this._blobData));
			}
		};

		myBlob.prototype.getHash = function (cb) {
			step(function () {
				this.ne(keyStore.hash.hash(h.blobToDataURL(this._blobData)));
			}, cb);
		};

		var api = {
			createBlob: function (blob) {
				return new myBlob(blob);
			},
			getBlob: function (blobID, cb) {
				step(function () {
					socketService.emit("blob.getBlob", {
						blobid: blobID
					}, this);
				}, h.sF(function (data) {
					var blob = h.dataURItoBlob("data:image/png;base64," + data.blob);
					this.ne(new myBlob(blob, blobID));
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