define([], function () {
	"use strict";
	var MyImage = function () {};

	MyImage.prototype.loadImage = function loadImage(src, cb) {
		this._image = new Image();
		this._image.addEventListener("load", function () {
			cb(null, true);
		});

		this._image.src = src;
	};

	MyImage.prototype.callBackForFileLoad = function loadImageFromFileHandler(cb) {
		var that = this;
		return function imageFileLoadHandler(e) {
			var file = e.target.files[0];
			if (!file.type.match(/image.*/i)) {
				cb(null, false);
				return;
			}

			var url;

			if (typeof URL !== "undefined") {
				url = URL.createObjectURL(file);
				that.loadImage(url, cb);
			} else if (typeof webkitURL !== "undefined") {
				url = webkitURL.createObjectURL(file);
				that.loadImage(url, cb);
			} else if (typeof FileReader !== "undefined") {
				var reader = new FileReader();
				reader.onload = function (e) {
					that.loadImage(e.target.result, cb);
				};
				reader.readAsDataURL(file);
			} else {
				//da da dam ...
				console.log("could not load image from file...");
			}
		};
	};

	MyImage.prototype.downSizeImage = function (maxSize) {
		if (this._image) {
			var canvas = document.createElement("canvas");
			var canvasContext = canvas.getContext("2d"), size;

			if (this._image.width < maxSize && this._image.height < maxSize) {
				canvas.width = this._image.width;
				canvas.height = this._image.height;

				size = {
					width: this._image.width,
					height: this._image.height
				};
			} else {
				var paintRatio = Math.min(maxSize / this._image.width, maxSize / this._image.height);
				size = {
					width: paintRatio * this._image.width,
					height: paintRatio * this._image.height
				};
			}

			canvas.width = size.width;
			canvas.height = size.height;

			canvasContext.drawImage(this._image, 0, 0, this._image.width, this._image.height, 0, 0, size.width, size.height);

			return canvas;
		}
	};

	MyImage.prototype.paintImageOnCanvas = function paintImageOnCanvas(canvas, canvaswidth, canvasheight) {
		if (this._image) {
			var canvasContext = canvas.getContext("2d"), offset;
			var imageSize, paintRatio, size, relativePos, pos;

			canvas.width = canvaswidth;
			canvas.height = canvasheight;

			canvasContext.clearRect (0, 0, canvaswidth, canvasheight);

			imageSize = {
				width: this._image.width,
				height: this._image.height
			};

			paintRatio = Math.min(canvaswidth / imageSize.width, canvasheight / imageSize.height);
			size = {
				width: paintRatio * imageSize.width,
				height: paintRatio * imageSize.height
			};

			relativePos = {
				left: (canvaswidth - size.width) / 2,
				top: (canvasheight - size.height) / 2
			};

			offset = jQuery(canvas).offset();

			pos = {
				top: offset.top + relativePos.top,
				left: offset.left + relativePos.left
			};

			canvasContext.drawImage(this._image, 0, 0, imageSize.width, imageSize.height, relativePos.left, relativePos.top, size.width, size.height);

			var paintedImageProperties = {
				ratio: paintRatio,
				pos: pos,
				relativePos: relativePos,
				size: size
			};

			return paintedImageProperties;
		}
	};

	MyImage.prototype.getResizedImage = function(size, pos) {
		var doneCanvasE = document.createElement("canvas");

		doneCanvasE.width = size;
		doneCanvasE.height = size;

		var doneCanvas = doneCanvasE.getContext("2d");
		doneCanvas.drawImage(this._image, pos.left, pos.top, pos.width, pos.width, 0, 0, size, size);

		return doneCanvasE;
	};

	MyImage.prototype.getResizedImageData = function getResizedImageData(size, pos) {
		var doneCanvasE = this.getResizedImage(size, pos);

		return doneCanvasE.toDataURL();
	};

	MyImage.prototype.getResizedImageBlob = function getResizedImageData(size, pos, cb) {
		var doneCanvasE = this.getResizedImage(size, pos);

		doneCanvasE.toBlob(cb);
	};

	return MyImage;
});