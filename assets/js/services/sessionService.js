/**
* SessionService
**/
define(["services/serviceModule"], function (serviceModule) {
	"use strict";

	var service = function ($rootScope, $location, $route, Storage) {
		var sid = "", loggedin = false, ownLoaded = false, userid, returnURL, loaded = false;

		var noLoginRequired = ["ssn.startController", "ssn.loginController", "ssn.recoveryController", "ssn.versionController", "ssn.mailController", "ssn.agbController", "ssn.privacyPolicyController", "ssn.impressumController"];
		var loggoutRequired = ["ssn.startController", "ssn.loginController", "ssn.loadingController"];

		var sessionStorage = new Storage("whispeer.session");

		function loadOldLogin() {
			if (sessionStorage.get("loggedin") === "true" && sessionStorage.get("password")) {
				sid = sessionStorage.get("sid");
				loggedin = true;
				userid = sessionStorage.get("userid");

				loginChange();

				return true;
			} else {
				sessionStorage.clear();
			}
		}

		function updateURL(c, logout) {
			if (!loaded) {
				loadOldLogin();

				loaded = true;
			}

			$location.replace();

			//save return path if we are 
			// - not logging out
			// - not already fully loaded 
			// - do not already have a return path
			if (!ownLoaded && !logout && !returnURL) {
				returnURL = $location.path();
			}

			//not logged in but on a page requiring logout --> landing
			if (!loggedin && noLoginRequired.indexOf(c) === -1) {
				$location.path("/start");
				return;
			}

			//logged in but not yet loaded -> loading page
			if (loggedin && !ownLoaded) {
				$location.path("/loading");
			}

			if (loggedin && ownLoaded && loggoutRequired.indexOf(c) > -1) {
				if (returnURL && returnURL !== "/loading") {
					$location.path(returnURL);
					returnURL = undefined;
				} else {
					$location.path("/main");
				}
			}
		}

		$rootScope.$on("$routeChangeStart", function (scope, next) {
			updateURL(next.controller);
		});

		$rootScope.$on("ssn.ownLoaded", function () {
			ownLoaded = true;
			updateURL($route.current.controller);
		});

		function loginChange(logout) {
			$rootScope.$broadcast("ssn.login");
			if ($route.current) {
				updateURL($route.current.controller, logout);
			}
		}

		var sessionService = {
			setReturnURL: function (url) {
				returnURL = url;
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

					$location.search("");

					userid = 0;
					sid = "";
					loggedin = false;
					ownLoaded = false;

					sessionStorage.clear();

					window.top.location = "/start";
				}
			},

			isLoggedin: function () {
				return loggedin;
			}
		};

		return sessionService;
	};

	service.$inject = ["$rootScope", "$location", "$route", "ssn.storageService"];

	serviceModule.factory("ssn.sessionService", service);
});
