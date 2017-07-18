import * as Bluebird from "bluebird"
import $ from "jquery"
import h from "../helper/helper"
import screenSizeService from "./screenSize.service"

import Progress from "../asset/Progress"
var Queue = require("asset/Queue");
var imageLib = require("imageLib");

var blobService = require("services/blobService");

var canvasToBlob : any = Bluebird.promisify(h.canvasToBlob.bind(h));

var PREVIEWSDISABLED = false;

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
	encrypt: true,
	original: false
};

/* TODO:
	- maximum size for a resolution
	- original: enable, remove meta-data (exif etc.)
*/

if (screenSizeService.mobile) {
	defaultOptions.sizes = defaultOptions.sizes.filter(function (size) {
		return size.name !== "highest";
	});
}

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

class ImageUpload {
	rotation = "0"
	private previousProgress: number = 0
	private file
	private options
	private progress: Progress
	private url: string
	private previewUrl: string
	private blobs: any[]
	private isGif: boolean

	private _preparePromise
	private _getImagePromise
	private _generatePreviewsPromise

	constructor(file, options?) {
		this.file = file;
		this.options = options || defaultOptions;
		this.progress = new Progress();
		this.progress.listen(this._maybeApply, "progress");

		if (!file.type.match(/image.*/)) {
			throw new Error("not an image!");
		}

		if (file.type.match(/image.gif/) && !this.options.gif) {
			throw new Error("no gifs supported!");
		}
	}

	static imageLibLoad(file, options?) {
		return new Bluebird(function (resolve, reject) {
			imageLib(file, function (canvas) {
				if(canvas.type === "error") {
					reject(canvas);
				} else {
					resolve(canvas);
				}
			}, options);
		});
	}

	convertForGallery = () => {
		return {
			upload: this,
			highest: {
				loading: false,
				loaded: true,
				url: this.getUrl()
			},
			lowest: {
				loading: false,
				loaded: true,
				url: this.getUrl()
			}
		};
	};

	private _maybeApply = (progress) => {
		if (progress - this.previousProgress > 0.01) {
			this.previousProgress = progress;
		}
	};

	getProgress = () => {
		return this.progress.getProgress();
	};

	private _uploadAndEncryptPreparedBlob = (encryptionKey, blobMeta) => {
		this.progress.addDepend(blobMeta.blob._uploadProgress);
		this.progress.addDepend(blobMeta.blob._encryptProgress);

		return encryptionQueue.enqueue(blobMeta.blob.getSize(), function () {
			return blobMeta.blob.encryptAndUpload(encryptionKey);
		});
	};

	private _uploadPreparedBlob = (blobMeta) => {
		this.progress.addDepend(blobMeta.blob._uploadProgress);

		return blobMeta.blob.upload();
	};

	static blobToDataSet(blob) {
		var preReserveID = Bluebird.promisify(blob.preReserveID.bind(blob));
		var getHash = Bluebird.promisify(blob.getHash.bind(blob));
		return Bluebird.all([preReserveID(), getHash()]).spread(function (blobID, hash) {
			return {
				blob: blob,
				meta: {
					blobID: blobID,
					blobHash: hash
				}
			};
		});
	};

	static fileCallback(cb, config?, single?) {
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

	static rotate(img, angle) {
		switch (angle) {
		case "0":
			return img;
		case "90":
			return ImageUpload.rotate90(img);
		case "180":
			return ImageUpload.rotate180(img);
		case "270":
			return ImageUpload.rotate270(img);
		}

		return img;
	};

	static rotate90270 = function (angle, img) {
		var canvas = document.createElement("canvas");
		canvas.width  = img.height;
		canvas.height = img.width;
		var diff = canvas.width-canvas.height;
		var newCtx = canvas.getContext("2d");
		newCtx.translate(canvas.width/2, canvas.height/2);
		newCtx.rotate(angle);
		newCtx.translate(-canvas.width/2, -canvas.height/2);
		newCtx.drawImage(img, diff/2, -diff/2);

		return canvas;
	};

	static rotate90 = function (img) {
		var angle = Math.PI/2;

		return ImageUpload.rotate90270(angle, img);
	};

	static rotate180 = function (img) {
		var angle = Math.PI;

		var canvas = document.createElement("canvas");
		canvas.width  = img.width;
		canvas.height = img.height;

		var newCtx = canvas.getContext("2d");
		newCtx.translate(canvas.width/2, canvas.height/2);
		newCtx.rotate(angle);
		newCtx.translate(-canvas.width/2, -canvas.height/2);
		newCtx.drawImage(img, 0, 0);

		return canvas;
	};

	static rotate270 = function (img) {
		var angle = 3 * Math.PI/2;

		return ImageUpload.rotate90270(angle, img);
	};

	rotate = () => {
		return this.generatePreviews().bind(this).then(function (previews) {
			var newDegree = "0";
			switch(this.rotation) {
			case "0":
				newDegree = "90";
				break;
			case "90":
				newDegree = "180";
				break;
			case "180":
				newDegree = "270";
				break;
			}

			this.rotation = newDegree;

			this.previewUrl = h.toUrl(previews[newDegree]);

			return previews[newDegree];
		});
	};

	generatePreviews = () => {
		if (PREVIEWSDISABLED) {
			return Bluebird.reject(new Error("Previews are disabled"))
		}

		if (!this._generatePreviewsPromise) {
			this._generatePreviewsPromise = ImageUpload.imageLibLoad(h.toUrl(this.file), {
				maxHeight: 200, canvas: true
			}).bind(this).then(function (img) {
				return Bluebird.all([
					canvasToBlob(img, "image/jpeg"),
					canvasToBlob(ImageUpload.rotate90(img), "image/jpeg"),
					canvasToBlob(ImageUpload.rotate180(img), "image/jpeg"),
					canvasToBlob(ImageUpload.rotate270(img), "image/jpeg")
				]);
			}).spread(function (preview0, preview90, preview180, preview270) {
				this.previewUrl = h.toUrl(preview0);

				var previews = {};

				previews["0"] = preview0;
				previews["90"] = preview90;
				previews["180"] = preview180;
				previews["270"] = preview270;

				return previews;
			});
		}

		return this._generatePreviewsPromise;
	};

	getName = () => {
		return this.file.name;
	};

	getPreviewUrl = () => {
		return this.previewUrl || this.getUrl()
	}

	getUrl = () => {
		if (!PREVIEWSDISABLED) {
			this.generatePreviews();
		}

		this.url = this.url || h.toUrl(this.file);
		this.previewUrl = this.previewUrl || this.url
		return this.url;
	};

	upload = (encryptionKey) => {
		if (!this.blobs) {
			throw new Error("usage error: prepare was not called!");
		}

		return uploadQueue.enqueue(1, () => {
			return Bluebird.resolve(this.blobs).bind(this).map((blobWithMetaData) => {
				console.info("Uploading blob");
				if (this.options.encrypt) {
					return this._uploadAndEncryptPreparedBlob(encryptionKey, blobWithMetaData);
				}

				return this._uploadPreparedBlob(blobWithMetaData);
			});
		});
	};

	private _createSizeData = (size) => {
		return resizeQueue.enqueue(1, function () {
			return this._resizeFile(size).bind(this).then(function (resizedImage) {
				return ImageUpload.blobToDataSet(blobService.createBlob(resizedImage));
			}).then(function (data) {
				data.meta.gif = this.isGif;
				return $.extend({}, data, { size: size });
			});
		}, this);
	};

	prepare = () => {
		this.isGif = !!this.file.type.match(/image.gif/i);

		var sizes = this.isGif ? this.options.gifSizes : this.options.sizes;

		if (!this._preparePromise) {
			this._preparePromise = Bluebird.resolve(sizes)
				.bind(this)
				.map(this._createSizeData)
				.then(this._removeUnnededBlobs);
		}

		return this._preparePromise
	};

	private _removeUnnededBlobs = (blobs) => {
		var lastBlob, result = {};

		this.blobs = blobs.sort(sizeSorter).filter(function (blob) {
			var keep = !lastBlob || this.isGif || sizeDiff(lastBlob, blob) > this.options.minimumSizeDifference;

			if (keep) {
				lastBlob = blob;
			}

			result[blob.size.name] = lastBlob.meta;

			return keep;
		}, this);

		return result;
	};

	getFile = () => {
		return this.file;
	};

	private _getImage = () => {
		if (!this._getImagePromise) {
			this._getImagePromise = ImageUpload.imageLibLoad(this.getUrl());
		}

		return this._getImagePromise;
	}

	private _resizeFile = (sizeOptions) => {
		if (this.isGif && !sizeOptions.restrictions) {
			return Bluebird.resolve(this.file);
		}

		var options = $.extend({}, sizeOptions.restrictions || {}, { canvas: true });

		return this._getImage().bind(this).then(function (img) {
			if (options.square) {
				img = imageLib.scale(img, {
					contain: true,
					aspectRatio: 1
				})
			}

			var canvas = imageLib.scale(img, options);
			return canvasToBlob(ImageUpload.rotate(canvas, this.rotation), "image/jpeg");
		});
	};
}

export default ImageUpload
