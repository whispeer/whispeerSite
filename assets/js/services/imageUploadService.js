/**
* imageUploadService
**/
define(["step", "whispeerHelper", "jquery", "bluebird", "imageLib", "asset/Progress"], function (step, h, $, Promise, imageLib, Progress) {
	"use strict";

	var service = function (blobService) {
		var canvasToBlob = Promise.promisify(h.canvasToBlob, h);

		var defaultOptions = {
			minimumSizeDifference: 1024,
			sizes: [
				{
					name: "lowest",
					maxWidth: 640,
					maxHeight: 480
				},
				{
					name: "middle",
					maxWidth: 1280,
					maxHeight: 720
				},
				{
					name: "highest",
					maxWidth: 2560,
					maxHeight: 1440
				},
				{
					name: "original"
				}
			],
			gifSizes: [
				{
					name: "lowest",
					maxWidth: 640,
					maxHeight: 480
				},
				{
					name: "highest"
				}
			],
			gif: true,
			original: false
		};

		/* TODO:
			- maximum size for a resolution
			- original: enable, remove meta-data (exif etc.)
		*/

		var ImageUpload = function (file, options) {
			this._file = file;
			this._options = $.extend({}, defaultOptions, options);
			this._progress = new Progress();

			if (!file.type.match(/image.*/)) {
				throw new Error("not an image!");
			}

			if (file.type.match(/image.gif/) && !this._options.gif) {
				throw new Error("no gifs supported!");
			}
		};

		ImageUpload.imageLibLoad = function (file, options) {
			return new Promise(function (resolve, reject) {
				imageLib(file, function (canvas) {
					if(canvas.type === "error") {
						reject(canvas);
					} else {
						resolve(canvas);
					}
				}, options);
			});
		};

		ImageUpload.prototype.getProgress = function () {
			return this._progress.getProgress();
		};

		ImageUpload.prototype._uploadPreparedBlob = function (encryptionKey, blobMeta) {
			var progress = new Progress();

			this._progress.addDepend(progress);

			var encryptAndUpload = Promise.promisify(blobMeta.blob.encryptAndUpload, blobMeta.blob);
			return encryptAndUpload(encryptionKey, progress).then(function (blobKey) {
				return blobKey;
			});
		};

		ImageUpload.blobToDataSet = function (blob) {
			var preReserveID = Promise.promisify(blob.preReserveID, blob);
			var getHash = Promise.promisify(blob.getHash, blob);
			return Promise.all([preReserveID(), getHash()]).spread(function (blobID, hash) {
				return {
					blob: blob,
					meta: {
						blobID: blobID,
						blobHash: hash
					}
				};
			});
		};

		ImageUpload.fileCallback = function (cb, config, single) {
			return function imageFileLoadHandler(e) {
				var files = Array.prototype.slice.call(e.target.files);
				if (single) {
					cb(new ImageUpload(files[0], config));
				} else {
					cb(files.map(function (file) {
						return new ImageUpload(file, config);
					}));
				}
			};
		};

		ImageUpload.prototype.getName = function () {
			return this._file.name;
		};

		ImageUpload.prototype.getUrl = function () {
			this._url = this._url || h.toUrl(this._file);
			return this._url;
		};

		ImageUpload.prototype.upload = function (encryptionKey) {
			if (!this._blobs) {
				throw new Error("usage error: prepare was not called!");
			}

			return Promise.resolve(this._blobs).bind(this).map(function (blobWithMetaData) {
				return this._uploadPreparedBlob(encryptionKey, blobWithMetaData);
			});
		};

		ImageUpload.prototype._createSizeData = function (size) {
			return this._resizeFile(size).then(function (resizedImage) {
				return ImageUpload.blobToDataSet(blobService.createBlob(resizedImage));
			}).then(function (data) {
				return $.extend({}, data, { size: size });
			});
		};

		ImageUpload.prototype._prepareImage = function () {
			return Promise.resolve(this._options.sizes).bind(this).map(this._createSizeData).then(function (blobs) {
				var lastBlob, result = {};

				this._blobs = blobs.sort(function (a, b) { return b.blob.getSize() - a.blob.getSize(); }).filter(function (blob) {
					var keep = !lastBlob || (lastBlob.blob.getSize() - blob.blob.getSize()) > this._options.minimumSizeDifference;

					if (keep) {
						lastBlob = blob;
					}

					result[blob.size.name] = lastBlob.meta;

					return keep;
				}, this);

				return result;
			});
		};

		ImageUpload.prototype._prepareGif = function () {
			return ImageUpload.blobToDataSet(blobService.createBlob(this._file)).bind(this).then(function (blob) {
				this._blobs = [blob];

				return {
					lowest: blob.meta,
					highest: blob.meta
				};
			});
		};

		ImageUpload.prototype.prepare = function () {
			if (this._file.type.match(/image.gif/i)) {
				return this._prepareGif();
			} else {
				return this._prepareImage();
			}
		};

		ImageUpload.prototype._resizeFile = function (sizeOptions) {
			var options = $.extend({}, sizeOptions, { canvas: true });

			return ImageUpload.imageLibLoad(this._file, options).then(function (canvas) {
				return canvasToBlob(canvas);
			});
		};

		return ImageUpload;
	};

	service.$inject = ["ssn.blobService"];

	return service;
});
