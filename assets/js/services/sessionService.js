/**
* SessionService
**/
define(["services/serviceModule", "asset/observer"], function (serviceModule, Observer) {
	"use strict";

	var provider = function () {
		var redirect = true;

		this.noRedirect = function () {
			redirect = false;
		};

		var service = function ($rootScope, $timeout, locationService, Storage, keyStore) {
			var sid = "", loggedin = false, userid, sessionService;

			var sessionStorage = Storage.withPrefix("whispeer.session");

			function saveSession() {
				sessionStorage.set("sid", sid);
				sessionStorage.set("userid", userid);
				sessionStorage.set("loggedin", true);
			}

			function setLoginData(_sid, _userid, noRedirect) {
				sid = _sid;
				userid = _userid;
				loggedin = true;

				$timeout(function () {
					sessionService.notify("", "ssn.login");
					if (!noRedirect) {
						locationService.loadInitialURL();
					}
				});
			}

			function setPassword(password) {
				keyStore.security.setPassword(password);
				sessionStorage.set("password", password);
			}

			function loadOldLogin() {
				sessionStorage.awaitLoading().then(function () {
					if (sessionStorage.get("loggedin") === "true" && sessionStorage.get("password")) {
						setPassword(sessionStorage.get("password"));
						setLoginData(sessionStorage.get("sid"), sessionStorage.get("userid"));
					} else {
						sessionStorage.clear().then(function () {
							if (redirect) {
								locationService.landingPage();
							}
						});
					}
				});
			}

			loadOldLogin();

			$rootScope.$on("$stateChangeStart", function (scope, next) {
				sessionStorage.awaitLoading().then(function () {
					return locationService.updateURL(loggedin, next.controller);
				});

				return null;
			});

			sessionService = {
				setPassword: setPassword,
				saveSession: saveSession,
				setLoginData: setLoginData,
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
						sessionStorage.clear().then(function () {
							locationService.landingPage();
							$rootScope.$broadcast("ssn.reset");

							if (window.indexedDB) {
								window.indexedDB.deleteDatabase("whispeerCache");
							}
						});
					}
				},

				isLoggedin: function () {
					return loggedin;
				}
			};

			Observer.call(sessionService);

			return sessionService;
		};

		this.$get = ["$rootScope", "$timeout", "ssn.locationService", "ssn.storageService", "ssn.keyStoreService", service];
	};

	serviceModule.provider("ssn.sessionService", provider);
});
