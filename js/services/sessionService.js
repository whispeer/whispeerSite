/* jshint undef: true, unused: true */


/**
* SessionService
**/
define([], function () {
	"use strict";

	var service = function ($rootScope, $location, $route, keyStore) {
		var sid = "", loggedin = false, returnURL;

		var noLoginRequired = ["ssn.loginController"];
		var loggoutRequired = ["ssn.loginController"];

		function updateURL(c) {
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
				if (newSID !== sid) {
					sid = newSID;
					loggedin = true;
					loginChange();
				}
			},

			getSID: function () {
				return sid;
			},

			logout: function () {
				if (loggedin) {
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

	service.$inject = ['$rootScope', '$location', '$route', 'ssn.keyStoreService'];

	return service;
});