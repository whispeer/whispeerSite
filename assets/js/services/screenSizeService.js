/**
* imageUploadService
**/
define(["step", "whispeerHelper", "asset/observer", "jquery"], function (step, h, Observer, jQuery) {
	"use strict";

	var service = function ($timeout) {
		var api = {};
		Observer.call(api);

		function updateMobile() {
			var mobile = jQuery(window).width() < 1025;

			if (mobile !== api.mobile) {
				api.mobile = mobile;

				$timeout(function () {
					api.notify(mobile);
				});
			}
		}

		jQuery(window).resize(updateMobile);
		updateMobile();

		return api;
	};

	service.$inject = ["$timeout"];

	return service;
});