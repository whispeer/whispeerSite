define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function imageGallery(errorService, blobService) {
		function loadImagePreviews(images) {
			images.forEach(function (image) {
				loadImage(image.preview);
			});
		}

		function loadImage(data) {
			var blobid = data.id;

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
				"images": "=",
				"preview": "@"
			},
			restrict: "E",
			templateUrl: "assets/views/directives/gallery.html",
			link: function(scope, iElement, iAttrs) {
				scope.$watch("images", function () {
					scope.preview = scope.preview || scope.images.length;
					loadImagePreviews(scope.images.slice(0, scope.preview));
				});

				scope.modal = false;
				scope.viewImage = function (index) {
					scope.modal = true;
					loadImage(scope.images[0].original);
				};
			}
		};
	}
	return imageGallery;
});
