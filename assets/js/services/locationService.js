define(["services/serviceModule", "whispeerHelper"], function (serviceModule, h) {
	"use strict";

	serviceModule.factory("ssn.locationService", ["$location", "ssn.storageService", function ($location, Storage) {
		var loginStorage = Storage.withPrefix("whispeer.login");
		var sessionStorage = Storage.withPrefix("whispeer.session");

		var blockedReturnUrls = ["/b2c", "/recovery"];

		var api = {
			setTopLocation: function (url) {
				var locale = h.getLanguageFromPath() || "";
				window.top.location = "/" + locale + url;
			},
			mainPage: function () {
				api.setTopLocation("/main");
			},
			landingPage: function () {
				api.setTopLocation("/");
			},
			isLoginPage: function () {
				return window.top.location.pathname.indexOf("/login") !== -1;
			},
			loginPage: function () {
				api.setTopLocation("/login");
			},
			isBlockedReturnUrl: function (url) {
				return blockedReturnUrls.filter(function (blockedUrl) {
					return url.indexOf(blockedUrl) !== -1;
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

				if (api.isBlockedReturnUrl(window.top.location.pathname)) {
					$location.path("/main");
				}
			},
			getUrlParameter: function (param) {
				var search = window.top.location.search;
				var pairs = search.substr(1).split("&");

				var result = h.array.find(pairs.map(function (pair) {
					if (pair.indexOf("=") !== -1) {
						return {
							key: pair.substr(0, pair.indexOf("=")),
							value: pair.substr(pair.indexOf("=") + 1)
						};
					} else {
						return {
							key: pair,
							value: ""
						};
					}
				}), function (pair) {
					return pair.key === param;
				});

				if (result) {
					return result.value;
				}
			},
			updateURL: function (loggedin) {
				//not logged in but on a page requiring login --> landing
				if (!loggedin) {
					//this is only here to make absolutely sure that the localStorage is cleared to protect from infinite redirects.
					sessionStorage.clear();
					api.setReturnUrl($location.path());
					api.landingPage();
					return;
				}
			}
		};

		return api;
	}]);
});
