define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function imageGallery(errorService, blobService) {
		function loadImagePreviews(images) {
			images.forEach(function (image) {
				loadImage(image.lowest);
			});
		}

		function loadImage(data) {
			var blobid = data.blobID;

			data.loading = true;
			data.decrypting = false;
			data.downloading = false;

			var blob;
			step(function () {
				data.downloading = true;
				blobService.getBlob(blobid, this, false);
			}, h.sF(function (_blob) {
				data.downloading = false;
				data.decrypting = true;
				blob = _blob;
				blob.decrypt(this);
			}), h.sF(function () {
				blob.toURL(this);
			}), h.sF(function (url) {
				data.loading = false;
				data.decrypting = false;
				data.url = url;
			}), errorService.criticalError);
		}

		return {
			scope: {
				"images": "="
			},
			restrict: "E",
			templateUrl: "assets/views/directives/gallery.html",
			link: function(scope) {
				var previewChunk = 4;
				scope.preview = previewChunk;

				scope.$watch("images", function () {
					loadImagePreviews(scope.images.slice(0, scope.preview));
				});

				scope.loadMoreImages = function () {
					scope.preview = parseInt(scope.preview, 10);

					loadImagePreviews(scope.images.slice(scope.preview, scope.preview + previewChunk));
					scope.preview += previewChunk;
				};

				scope.modal = false;
				scope.viewImage = function (index) {
					scope.modal = true;
					scope.imageIndex = index;

					scope.modalImage = scope.images[scope.imageIndex];
					loadImage(scope.modalImage.highest);
				};

				var KEYS = {
					LEFT: 37,
					RIGHT: 39,
					J: 74,
					K: 75,
					UP: 38,
					DOWN: 40
				};

				var NEXTKEYS = [KEYS.DOWN, KEYS.J, KEYS.RIGHT];
				var PREVKEYS = [KEYS.UP, KEYS.K, KEYS.LEFT];

				jQuery(document).keyup(function (e) {
					if (scope.modal) {
						scope.$apply(function () {
							if (NEXTKEYS.indexOf(e.keyCode) > -1) {
								scope.imageIndex = Math.min(scope.imageIndex + 1, scope.images.length - 1);
								e.preventDefault();
							}
							if (PREVKEYS.indexOf(e.keyCode) > -1) {
								scope.imageIndex = Math.max(scope.imageIndex - 1, 0);
								e.preventDefault();
							}
							scope.viewImage(scope.imageIndex);
						});
					}
				});
			}
		};
	}
	return imageGallery;
});
