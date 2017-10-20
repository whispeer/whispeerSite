import * as Bluebird from "bluebird"
import h from "../helper/helper"
import screenSizeService from "./screenSize.service"
import FileUpload from "./fileUpload.service"
import blobService from "./blobService"

var Queue = require("asset/Queue");
var imageLib = require("blueimp-load-image/js/load-image");

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
		maxHeight: number,
		square?: boolean
	}
}

type options = {
	minimumSizeDifference: number,
	sizes: size[],
	gifSizes: size[],
	gif: boolean,
	encrypt: boolean,
	extraInfo: Object
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
	encrypt: true,
	extraInfo: {}
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

const resizeQueue = new Queue(1);
resizeQueue.start();

const sizeDiff = (a, b) => {
	return a.blob.getSize() - b.blob.getSize();
}

const sizeSorter = (a, b) => {
	return sizeDiff(b, a);
}

class ImageUpload extends FileUpload {
	rotation = "0"
	private url: string
	private previewUrl: string
	private blobs: any[]
	private isGif: boolean

	constructor(file, options?) {
		super(file, options || defaultOptions)

		if (!ImageUpload.isImage(file)) {
			throw new Error("not an image!");
		}

		if (file.type.match(/image.gif/) && !this.options.gif) {
			throw new Error("no gifs supported!");
		}
	}

	static isImage(file) {
		return file.type.match(/image.*/)
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

		if (newCtx === null) {
			throw new Error("could not initialize canvas context")
		}

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

	upload = (encryptionKey?) => {
		if (!this.blobs) {
			throw new Error("usage error: prepare was not called!");
		}

		if (this.options.encrypt && !encryptionKey) {
			throw new Error("No encryption key given")
		}

		return uploadQueue.enqueue(1, () => {
			return Bluebird.resolve(this.blobs).bind(this).map((blobWithMetaData: any) => {
				console.info("Uploading blob");
				if (this.options.encrypt) {
					return this.uploadAndEncryptPreparedBlob(encryptionKey, blobWithMetaData.blob);
				}

				return this.uploadPreparedBlob(blobWithMetaData.blob);
			});
		});
	};

	private _createSizeData = (size: size) => {
		return resizeQueue.enqueue(1, () => {
			return this._resizeFile(size).then((resizedImage) => {
				return ImageUpload.blobToDataSet(blobService.createBlob(resizedImage.blob)).then((data: any) => {
					data.content.gif = this.isGif;
					data.content.width = resizedImage.width
					data.content.height = resizedImage.height

					return {
						...data,
						size,
					}
				})
			})
		});
	};

	prepare = h.cacheResult<Bluebird<any>>(() => {
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

			result[blob.size.name] = lastBlob

			return keep;
		});

		return result;
	};

	private _getImage = h.cacheResult<Bluebird<any>>(() => {
		return ImageUpload.imageLibLoad(this.getUrl());
	})

	private _resizeFile = (sizeOptions: size) => {
		if (this.isGif && !sizeOptions.restrictions) {
			return Bluebird.resolve(this.file);
		}

		var options: any = {
			...sizeOptions.restrictions || {},
			canvas: true
		}

		return this._getImage().then((img) => {
			if (options.square) {
				img = imageLib.scale(img, {
					contain: true,
					aspectRatio: 1
				})
			}

			const canvas = ImageUpload.rotate(imageLib.scale(img, options), this.rotation);

			return canvasToBlob(canvas, "image/jpeg").then((blob) => {
				return {
					blob,
					width: canvas.width,
					height: canvas.height
				}
			})
		});
	}
}

export default ImageUpload
