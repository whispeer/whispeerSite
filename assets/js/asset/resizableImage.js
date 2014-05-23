define(["asset/Image", "asset/resizable"], function (MyImage, Resizable) {
	"use strict";
	var ResizableImage = function (initSize, minSize) {
		this._initSize = initSize;
		this._minSize = minSize;
	};

	ResizableImage.prototype = new MyImage();

	ResizableImage.prototype.repaint = function (canvas) {
		this.paintImageOnCanvasWithResizer(canvas, this.getPosition());
	};

	ResizableImage.prototype.paintImageOnCanvasWithResizer = function (canvas, position) {
		if (this._resizable) {
			this._resizable.kill();
		}

		var paintProps = this.paintImageOnCanvas(canvas.element, canvas.width, canvas.height);

		if (paintProps) {
			var boundary = {};
			boundary.top = paintProps.pos.top;
			boundary.left = paintProps.pos.left;
			boundary.bottom = boundary.top + paintProps.size.height;
			boundary.right = boundary.left + paintProps.size.width;

			this._resizable = new Resizable({
				element: canvas.element.parentElement,
				boundary: boundary,
				offset: {
					top: (-1) * boundary.top,
					left: (-1) * jQuery(canvas.element).offset().left
				},
				size: {
					init: this._initSize,
					min: this._minSize
				},
				position: position
			});

			this._paintProperties = paintProps;
		}
	};

	ResizableImage.prototype.getPosition = function () {
		if (this._resizable) {
			return this._resizable.getPosition();
		}

		return this._oldPosition;
	};

	ResizableImage.prototype.getRelativePosition = function () {
		if (this._resizable) {
			return this._resizable.getRelativePosition();
		}
	};

	ResizableImage.prototype.removeResizable = function () {
		if (this._resizable) {
			this._oldPosition = this._resizable.getPosition();
			this._resizable.kill();
		}
	};

	ResizableImage.prototype.getImageData = function (size) {
		if (this._image && this._resizable) {
			var pos = this._resizable.getRelativePosition();
			var ratio = (1 / this._paintProperties.ratio);
			pos.width = pos.width * ratio;
			pos.height = pos.height * ratio;
			pos.top = pos.top * ratio;
			pos.left = pos.left * ratio;

			return this.getResizedImageData(size, pos);
		}
	};

	return ResizableImage;
});