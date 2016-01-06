/**
* imageUploadService
**/
define(["step", "whispeerHelper", "jquery", "bluebird", "imageLib", "asset/Progress", "asset/Queue", "services/serviceModule"], function (step, h, $, Promise, imageLib, Progress, Queue, serviceModule) {
	"use strict";

	var service = function ($timeout, blobService) {
		var canvasToBlob = Promise.promisify(h.canvasToBlob, h);

		var defaultOptions = {
			minimumSizeDifference: 1024,
			sizes: [
				{
					name: "lowest",
					restrictions: {
						maxWidth: 640,
						maxHeight: 480
					}
				},
				{
					name: "middle",
					restrictions: {
						maxWidth: 1280,
						maxHeight: 720
					}
				},
				{
					name: "highest",
					restrictions: {
						maxWidth: 2560,
						maxHeight: 1440
					}
				}
			],
			gifSizes: [
				{
					name: "lowest",
					restrictions: {
						maxWidth: 640,
						maxHeight: 480
					}
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

		var uploadQueue = new Queue(3);
		uploadQueue.start();

		var encryptionQueue = new Queue(500 * 1000);
		encryptionQueue.start();

		var resizeQueue = new Queue(1);
		resizeQueue.start();

		function sizeDiff(a, b) {
			return a.blob.getSize() - b.blob.getSize();
		}

		function sizeSorter(a, b) {
			return sizeDiff(b, a);
		}

		var ImageUpload = function (file, options) {
			this._file = file;
			this._options = $.extend({}, defaultOptions, options);
			this._progress = new Progress();
			this._progress.listen(this._maybeApply.bind(this), "progress");
			this._previousProgress = 0;

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

		ImageUpload.prototype.convertForGallery = function () {
			return {
				upload: this,
				highest: {
					loading: false,
					url: this.getUrl()
				},
				lowest: {
					loading: false,
					url: this.getUrl()
				}
			};
		};

		ImageUpload.prototype._maybeApply = function (progress) {
			if (progress - this._previousProgress > 0.01) {
				this._previousProgress = progress;
				$timeout(function () {});
			}
		};

		ImageUpload.prototype.getProgress = function () {
			return this._progress.getProgress();
		};

		ImageUpload.prototype._uploadPreparedBlob = function (encryptionKey, blobMeta) {
			this._progress.addDepend(blobMeta.blob._uploadProgress);
			this._progress.addDepend(blobMeta.blob._encryptProgress);

			return encryptionQueue.enqueue(blobMeta.blob.getSize(), function () {
				var encryptAndUpload = Promise.promisify(blobMeta.blob.encryptAndUpload, blobMeta.blob);
				return encryptAndUpload(encryptionKey).then(function (blobKey) {
					return blobKey;
				});
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

				try {
					e.target.value = null;
				} catch (ex) {
					console.log(ex);
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
			var _this = this;
			if (!this._blobs) {
				throw new Error("usage error: prepare was not called!");
			}

			return uploadQueue.enqueue(1, function () {
				return Promise.resolve(_this._blobs).bind(_this).map(function (blobWithMetaData) {
					return _this._uploadPreparedBlob(encryptionKey, blobWithMetaData);
				});
			});
		};

		ImageUpload.prototype._createSizeData = function (size) {
			return resizeQueue.enqueue(1, function () {
				return this._resizeFile(size).bind(this).then(function (resizedImage) {
					return ImageUpload.blobToDataSet(blobService.createBlob(resizedImage));
				}).then(function (data) {
					data.meta.gif = this._isGif;
					return $.extend({}, data, { size: size });
				});
			}, this);
		};

		ImageUpload.prototype.prepare = function () {
			this._isGif = !!this._file.type.match(/image.gif/i);

			var sizes = this._isGif ? this._options.gifSizes : this._options.sizes;

			return Promise.resolve(sizes)
				.bind(this)
				.map(this._createSizeData)
				.then(this._removeUnnededBlobs);
		};

		ImageUpload.prototype._removeUnnededBlobs = function (blobs) {
			var lastBlob, result = {};

			this._blobs = blobs.sort(sizeSorter).filter(function (blob) {
				var keep = !lastBlob || this._isGif || sizeDiff(lastBlob, blob) > this._options.minimumSizeDifference;

				if (keep) {
					lastBlob = blob;
				}

				result[blob.size.name] = lastBlob.meta;

				return keep;
			}, this);

			return result;
		};

		ImageUpload.prototype._resizeFile = function (sizeOptions) {
			if (this._isGif && !sizeOptions.restrictions) {
				return Promise.resolve(this._file);
			}

			var options = $.extend({}, sizeOptions.restrictions || {}, { canvas: true });

			return ImageUpload.imageLibLoad(this._file, options).then(function (canvas) {
				return canvasToBlob(canvas);
			});
		};

		return ImageUpload;
	};

	service.$inject = ["$timeout", "ssn.blobService"];

	serviceModule.factory("ssn.imageUploadService", service);
});
