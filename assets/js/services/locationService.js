define(["services/serviceModule"], function (serviceModule) {
	"use strict";

	serviceModule.factory("ssn.locationService", ["$location", "$route", "ssn.storageService", function ($location, $route, Storage) {
		var noLoginRequired = ["ssn.startController", "ssn.recoveryController", "ssn.versionController", "ssn.mailController", "ssn.agbController", "ssn.privacyPolicyController", "ssn.impressumController"];

		var loginStorage = new Storage("whispeer.login");

		var api = {
			mainPage: function () {
				window.top.location = "/main";
			},
			landingPage: function () {
				window.top.location = "/start";
			},
			setReturnUrl: function (url) {
				loginStorage.set("returnUrl", url);
			},
			loadInitialURL: function () {
				var returnURL = loginStorage.get("returnUrl");
				if (returnURL) {
					$location.path(returnURL);
					loginStorage.remove("returnUrl");
				} else {
					$location.path("/main");
				}
			},
			updateURL: function (loggedin, controller) {
				if (!controller && $route.current) {
					controller = $route.current.controller;
				}

				//not logged in but on a page requiring login --> landing
				if (!loggedin && noLoginRequired.indexOf(controller) === -1) {
					api.setReturnUrl($location.path());
					api.landingPage();
					return;
				}
			}
		};

		return api;
	}]);
});
