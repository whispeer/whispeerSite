define(["services/serviceModule"], function (serviceModule) {
	"use strict";

	serviceModule.factory("ssn.locationService", ["$location", "ssn.storageService", function ($location, Storage) {
		var noLoginRequired = ["ssn.startController", "ssn.versionController", "ssn.mailController", "ssn.agbController", "ssn.privacyPolicyController", "ssn.impressumController"];

		var loginStorage = new Storage("whispeer.login");

		var blockedReturnUrls = ["/start", "/recovery"];

		var api = {
			setTopLocation: function (url) {
				window.top.location = url;
			},
			mainPage: function () {
				api.setTopLocation("/main");
			},
			landingPage: function () {
				api.setTopLocation("/start");
			},
			isLoginPage: function () {
				return window.top.location.pathname.indexOf("/login") === 0;
			},
			loginPage: function () {
				api.setTopLocation("/login");
			},
			isBlockedReturnUrl: function (url) {
				return blockedReturnUrls.filter(function (blockedUrl) {
					return blockedUrl.indexOf(url) === 0;
				}).length > 0;
			},
			setReturnUrl: function (url) {
				if (api.isBlockedReturnUrl(url)) {
					return;
				}

				loginStorage.set("returnUrl", url);
			},
			loadInitialURL: function () {
				var returnURL = loginStorage.get("returnUrl");
				if (returnURL && !api.isBlockedReturnUrl(returnURL)) {
					$location.path(returnURL);
					loginStorage.remove("returnUrl");
				}
			},
			updateURL: function (loggedin, controller) {
				//not logged in but on a page requiring login --> landing
				if (!loggedin && controller && noLoginRequired.indexOf(controller) === -1) {
					api.setReturnUrl($location.path());
					api.landingPage();
					return;
				}
			}
		};

		return api;
	}]);
});
