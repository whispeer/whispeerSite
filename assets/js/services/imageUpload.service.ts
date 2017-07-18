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

type previewType = {
	"0": string,
	"90": string,
	"180": string,
	"270": string,
}

type size = {
	name: string,
	restrictions?: {
		maxWidth: number,
		maxHeight: number
	}
}

type options = {
	minimumSizeDifference: number,
	sizes: size[],
	gifSizes: size[],
	gif: boolean,
	encrypt: boolean,
}

var defaultOptions: options = {
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
	encrypt: true
};

/* TODO:
	- maximum size for a resolution
	- original: enable, remove meta-data (exif etc.)
*/

if (screenSizeService.mobile) {
	defaultOptions.sizes = defaultOptions.sizes.filter((size) => {
		return size.name !== "highest";
	});
}

const uploadQueue = new Queue(3);
uploadQueue.start();

const encryptionQueue = new Queue(500 * 1000);
encryptionQueue.start();

const resizeQueue = new Queue(1);
resizeQueue.start();

const sizeDiff = (a, b) => {
	return a.blob.getSize() - b.blob.getSize();
}

const sizeSorter = (a, b) => {
	return sizeDiff(b, a);
}

class ImageUpload {
	rotation = "0"
	private previousProgress: number = 0
	private file
	private options: options
	private progress: Progress
	private url: string
	private previewUrl: string
	private blobs: any[]
	private isGif: boolean

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
		return new Bluebird((resolve, reject) => {
			imageLib(file, (canvas) => {
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

		return encryptionQueue.enqueue(blobMeta.blob.getSize(), () => {
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
		return Bluebird.all([preReserveID(), getHash()]).spread((blobID, hash) => {
			return {
				blob: blob,
				meta: {
					blobID: blobID,
					blobHash: hash
				}
			};
		});
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

	private static rotateInternal(angle, img, flipRatio: boolean) {
		var canvas = document.createElement("canvas");

		if (flipRatio) {
			canvas.width  = img.height;
			canvas.height = img.width;
		} else {
			canvas.width  = img.width;
			canvas.height = img.height;
		}

		var diff = canvas.width - canvas.height;

		var newCtx = canvas.getContext("2d");
		newCtx.translate(canvas.width/2, canvas.height/2);
		newCtx.rotate(angle);
		newCtx.translate(-canvas.width/2, -canvas.height/2);
		newCtx.drawImage(img, flipRatio ? diff/2 : 0, flipRatio ? -diff/2 : 0);

		return canvas;
	};

	private static rotate90(img) {
		var angle = Math.PI/2;

		return ImageUpload.rotateInternal(angle, img, true);
	};

	private static rotate180(img) {
		var angle = Math.PI;

		return ImageUpload.rotateInternal(angle, img, false)
	};

	private static rotate270(img) {
		var angle = 3 * Math.PI/2;

		return ImageUpload.rotateInternal(angle, img, true);
	};

	rotate = () => {
		return this.generatePreviews().then((previews) => {
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

	generatePreviews = h.cacheResult<Bluebird<previewType>>(() => {
		if (PREVIEWSDISABLED) {
			return Bluebird.reject(new Error("Previews are disabled"))
		}

		return ImageUpload.imageLibLoad(h.toUrl(this.file), {
			maxHeight: 200, canvas: true
		}).then((img) => {
			return Bluebird.all([
				canvasToBlob(img, "image/jpeg"),
				canvasToBlob(ImageUpload.rotate90(img), "image/jpeg"),
				canvasToBlob(ImageUpload.rotate180(img), "image/jpeg"),
				canvasToBlob(ImageUpload.rotate270(img), "image/jpeg")
			]);
		}).spread((preview0, preview90, preview180, preview270) => {
			this.previewUrl = h.toUrl(preview0);

			return {
				"0": preview0,
				"90": preview90,
				"180": preview180,
				"270": preview270,
			}
		})
	})

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

	private _createSizeData = (size: size) => {
		return resizeQueue.enqueue(1, () => {
			return this._resizeFile(size).then((resizedImage) => {
				return ImageUpload.blobToDataSet(blobService.createBlob(resizedImage));
			}).then((data: any) => {
				data.meta.gif = this.isGif;
				return $.extend({}, data, { size: size });
			});
		}, this);
	};

	prepare = h.cacheResult(() => {
		this.isGif = !!this.file.type.match(/image.gif/i);

		var sizes = this.isGif ? this.options.gifSizes : this.options.sizes;

		return Bluebird.resolve(sizes)
			.map(this._createSizeData)
			.then(this._removeUnnededBlobs);
	})

	private _removeUnnededBlobs = (blobs) => {
		var lastBlob, result = {};

		this.blobs = blobs.sort(sizeSorter).filter((blob) => {
			var keep = !lastBlob || this.isGif || sizeDiff(lastBlob, blob) > this.options.minimumSizeDifference;

			if (keep) {
				lastBlob = blob;
			}

			result[blob.size.name] = lastBlob.meta;

			return keep;
		});

		return result;
	};

	getFile = () => {
		return this.file;
	};

	private _getImage = h.cacheResult<Bluebird<any>>(() => {
		return ImageUpload.imageLibLoad(this.getUrl());
	})

	private _resizeFile = (sizeOptions: size) => {
		if (this.isGif && !sizeOptions.restrictions) {
			return Bluebird.resolve(this.file);
		}

		var options = $.extend({}, sizeOptions.restrictions || {}, { canvas: true });

		return this._getImage().then((img) => {
			if (options.square) {
				img = imageLib.scale(img, {
					contain: true,
					aspectRatio: 1
				})
			}

			const canvas = imageLib.scale(img, options);
			return canvasToBlob(ImageUpload.rotate(canvas, this.rotation), "image/jpeg");
		});
	}

	static fileCallback(cb, config?, single?) {
		return (e) => {
			var files = Array.prototype.slice.call(e.target.files);
			if (single) {
				cb(new ImageUpload(files[0], config));
			} else {
				cb(files.map((file) => {
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
}

export default ImageUpload
