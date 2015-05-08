/**
* imageUploadService
**/
define(["step", "whispeerHelper", "asset/observer", "jquery", "services/serviceModule"], function (step, h, Observer, jQuery, serviceModule) {
	"use strict";

	var service = function ($timeout) {
		var api = {};
		Observer.call(api);

		function updateMobile() {
			var mobile = jQuery(window.top).width() < 1025;

			if (mobile !== api.mobile) {
				api.mobile = mobile;

				$timeout(function () {
					api.notify(mobile);
				});
			}
		}

		jQuery(window.top).resize(updateMobile);
		updateMobile();

		return api;
	};

	service.$inject = ["$timeout"];

	serviceModule.factory("ssn.screenSizeService", service);
});
