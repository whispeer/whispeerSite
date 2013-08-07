/**
* SessionService
**/
define([], function () {
	"use strict";

	var service = function ($rootScope, $location, $route, storage) {
		var sid = "", loggedin = false, userid, returnURL, loaded = false;

		var noLoginRequired = ["ssn.loginController"];
		var loggoutRequired = ["ssn.loginController"];

		function setSID(newSID, user) {
			if (newSID !== sid) {
				sid = newSID;
				loggedin = true;
				userid = user;

				storage.set("sid", newSID);
				storage.set("userid", newSID);
				storage.set("loggedin", true);

				return true;
			}

			return false;
		}

		function loadOldLogin() {
			if (storage.get("loggedin") === "true") {
				var sid = storage.get("sid");
				var userid = storage.get("userid");
				setSID(sid, userid);

				$rootScope.$broadcast("ssn.login");
			}
		}

		function updateURL(c) {
			if (!loaded) {
				loadOldLogin();

				loaded = true;
			}

			if (loggedin) {
				if (loggoutRequired.indexOf(c) > -1) {
					if (returnURL) {
						$location.path(returnURL);
						returnURL = undefined;
					} else {
						$location.path("/main");
					}
				}
			} else {
				if (noLoginRequired.indexOf(c) === -1) {
					returnURL = $location.path();
					$location.path("/login");
				}
			}
		}

		$rootScope.$on("$routeChangeStart", function (scope, next) {
			updateURL(next.controller);
		});

		function loginChange() {
			$rootScope.$broadcast("ssn.login");
			updateURL($route.current.controller);
		}

		var sessionService = {
			setSID: function (newSID, userid) {
				if (setSID(newSID, userid)) {
					loginChange();
				}
			},

			getSID: function () {
				return sid;
			},

			getUserID: function () {
				return userid;
			},

			logout: function () {
				if (loggedin) {
					$rootScope.$broadcast("ssn.reset");
				}

				sid = "";
				loggedin = false;

				loginChange();
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