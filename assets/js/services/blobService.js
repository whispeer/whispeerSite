/**
* MessageService
**/
define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function (socketService) {
		var Blob = function (blobData, blobID) {
			this._blobData = blobData;
			this._blobID = blobID;
		};

		Blob.prototype.encrypt = function (key) {

		};

		Blob.prototype.upload = function (cb) {
			step(function () {
				if (this._blobID) {
					this.last.ne(this._blobID);
				} else {
					socketService.emit("blob.reserveID", {}, this);
				}
			}, cb);
		};

		Blob.prototype.reserveID = function () {

		};

		Blob.prototype.decrypt = function (key) {

		};

		Blob.prototype.toURL = function () {
			if (typeof URL !== "undefined") {
				this.ne(URL.createObjectURL(this._blobData));
			} else if (typeof webkitURL !== "undefined") {
				this.ne(webkitURL.createObjectURL(this._blobData));
			} else {
				this.ne(h.blobToDataURL(this._blobData));
			}
		};

		Blob.prototype.getHash = function () {

		};

		var api = {
			createBlob: function (blob) {

			},
			getBlob: function (blobID, cb) {
				step(function () {
					socketService.emit("blob.getBlob", {
						blobid: blobID
					}, this);
				}, h.sF(function (data) {
					var blob = h.dataURItoBlob("data:image/png;base64," + data.blob);
					this.ne(new Blob(blob, blobID));
				}), cb);
			}
		};
	};

	service.$inject = [];

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