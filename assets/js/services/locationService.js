define(["services/serviceModule", "whispeerHelper"], function (serviceModule, h) {
	"use strict";

	serviceModule.factory("ssn.locationService", ["$location", "ssn.storageService", function ($location, Storage) {
		var loginStorage = Storage.withPrefix("whispeer.login");
		var sessionStorage = Storage.withPrefix("whispeer.session");

		var blockedReturnUrls = ["/b2c", "/recovery"];

		function removeOther(ele) {
			ele.siblings().remove();

			if (!ele.parent().is("body")) {
				removeOther(ele.parent());
			} else {
				ele.hide();
			}
		}

		var api = {
			setTopLocation: function (url) {
				var locale = h.getLanguageFromPath() || "";

				if (Storage.broken && url !== "/") {
					//if you read this code, welcome to my personal hell!

					/*
						So let me explain why this is necessary.
						Whispeer needs to store data locally, usually we use localStorage or indexedDB for that.
						This is an ugly quirks to move all content into an iframe and take the outer iframe as the
						storage area. This way the inner iframe could redirect as it wishes to without loosing the state.
						But why not use localStorage? We do, this is a fallback.
						Localstorage is not available in Safari Private Mode for example. Or if your disk is full.
					*/

					console.log("promoting as main window");
					Storage.promoteMainWindow();

					if (window.frameElement) {
						removeOther(jQuery(window.frameElement));
					} else {
						jQuery(document.body).empty();
					}

					var body = jQuery(window.top.document.body);
					var iframe = jQuery("<iframe class='contentFallBack'></iframe>");

					body.append(iframe);
					iframe.attr("src", url);
				} else {
					window.top.location = "/" + locale + url;
				}
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
