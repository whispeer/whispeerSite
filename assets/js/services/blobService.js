/**
* MessageService
**/
define([], function () {
	"use strict";

	var service = function () {
		var Blob = function (blobData) {

		};

		Blob.prototype.encrypt = function (key) {

		};

		Blob.prototype.upload = function () {

		};

		Blob.prototype.decrypt = function (key) {

		};

		Blob.prototype.toURL = function () {

		};

		var api = {
			createBlob: function (blob) {

			},
			getBlob: function (blobID) {

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