/**
* SessionService
**/
define(["services/serviceModule"], function (serviceModule) {
	"use strict";

	var service = function ($rootScope, $timeout, locationService, Storage) {
		var sid = "", loggedin = false, userid;

		var sessionStorage = new Storage("whispeer.session");

		function loadOldLogin() {
			if (sessionStorage.get("loggedin") === "true" && sessionStorage.get("password")) {
				sid = sessionStorage.get("sid");
				loggedin = true;
				userid = sessionStorage.get("userid");

				$timeout(function () {
					$rootScope.$broadcast("ssn.login");
					locationService.loadInitialURL();
				});
			} else {
				sessionStorage.clear();
			}
		}

		loadOldLogin();

		$rootScope.$on("$routeChangeStart", function (scope, next) {
			locationService.updateURL(loggedin, next.controller);
		});

		var sessionService = {
			setReturnUrl: function (url) {
				locationService.setReturnUrl(url);
			},

			getSID: function () {
				return sid;
			},

			getUserID: function () {
				return parseInt(userid, 10);
			},

			logout: function () {
				if (loggedin) {
					$rootScope.$broadcast("ssn.reset");
					sessionStorage.clear();
					locationService.landingPage();
				}
			},

			isLoggedin: function () {
				return loggedin;
			}
		};

		return sessionService;
	};

	service.$inject = ["$rootScope", "$timeout", "ssn.locationService", "ssn.storageService"];

	serviceModule.factory("ssn.sessionService", service);
});
