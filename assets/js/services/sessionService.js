/**
* SessionService
**/
define([], function () {
	"use strict";

	var service = function ($rootScope, $location, $route, storage) {
		var sid = "", loggedin = false, ownLoaded = false, userid, returnURL, loaded = false;

		var noLoginRequired = ["ssn.startController", "ssn.loginController", "ssn.versionController", "ssn.mailController"];
		var loggoutRequired = ["ssn.startController", "ssn.loginController", "ssn.loadingController"];

		function setSID(newSID, user) {
			if (newSID !== sid) {
				sid = newSID;
				loggedin = true;
				userid = user;

				storage.set("sid", newSID);
				storage.set("userid", userid);
				storage.set("loggedin", true);

				loginChange();

				return true;
			}

			return false;
		}

		function loadOldLogin() {
			if (storage.get("loggedin") === "true" && storage.get("passwords")) {
				var sid = storage.get("sid");
				var userid = storage.get("userid");
				setSID(sid, userid);
			} else {
				storage.clear();
			}
		}

		function updateURL(c, logout) {
			if (!loaded) {
				loadOldLogin();

				loaded = true;
			}

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

			setSID: function (newSID, userid) {
				setSID(newSID, userid);
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
				}

				$location.search("");

				userid = 0;
				sid = "";
				loggedin = false;
				ownLoaded = false;
				storage.clear();

				loginChange(true);
			},

			isLoggedin: function () {
				return loggedin;
			}
		};

		return sessionService;
	};

	service.$inject = ["$rootScope", "$location", "$route", "ssn.storageService"];

	return service;
});