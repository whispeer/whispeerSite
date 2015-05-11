/**
* imageUploadService
**/
define(["angular", "step", "whispeerHelper", "asset/observer", "services/serviceModule"], function (angular, step, h, Observer, serviceModule) {
	"use strict";

	var service = function ($timeout) {
		var api = {};
		Observer.call(api);

		function updateMobile() {
			var width = window.top.document.documentElement.clientWidth;
			var mobile = width < 1025;

			if (mobile !== api.mobile) {
				api.mobile = mobile;

				$timeout(function () {
					api.notify(mobile);
				});
			}
		}

		angular.element(window.top).on("resize", updateMobile);
		updateMobile();

		return api;
	};

	service.$inject = ["$timeout"];

	serviceModule.factory("ssn.screenSizeService", service);
});
