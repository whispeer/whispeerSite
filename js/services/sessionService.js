/* jshint undef: true, unused: true */


/**
* SessionService
**/
define([], function () {
	"use strict";

	var service = function ($rootScope, $location, $route, keyStore, storage) {
		var sid = "", loggedin = false, returnURL, loaded = false;

		var noLoginRequired = ["ssn.loginController"];
		var loggoutRequired = ["ssn.loginController"];

		function setSID(newSID) {
			if (newSID !== sid) {
				sid = newSID;
				loggedin = true;

				storage.set("sid", newSID);
				storage.set("loggedin", true);

				return true;
			}

			return false;
		}

		function loadOldLogin() {
			debugger;
			if (storage.get("loggedin") === "true") {
				var sid = storage.get("sid");
				setSID(sid);

				$rootScope.$broadcast('ssn.login');
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
			$rootScope.$broadcast('ssn.login');

			updateURL($route.current.controller);
		}

		var sessionService = {
			setSID: function (newSID) {
				if (setSID(newSID)) {
					loginChange();
				}
			},

			getSID: function () {
				return sid;
			},

			logout: function () {
				if (loggedin) {
					storage.clear();
					keyStore.reset();
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

	service.$inject = ['$rootScope', '$location', '$route', 'ssn.keyStoreService', 'ssn.storageService'];

	return service;
});