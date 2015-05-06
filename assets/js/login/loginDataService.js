define([
	"step",
	"asset/state",
	"login/loginModule",
	"services/locationService",
	"services/keyStoreService",
	"services/socketService",
	"services/storageService"
], function (step, State, loginModule) {
	"use strict";

	var service = function ($rootScope, locationService, keyStoreService, socketService, Storage) {
		var loginState = new State();

		var failureCodes = {
			UNKNOWNNAME: 0,
			WRONGPASSWORD: 1,
			NOCONNECTION: 2,
			UNKNOWN: 5
		};

		var sessionStorage = new Storage("whispeer.session");
		var loginStorage = new Storage("whispeer.login");

		var isViewForm = locationService.isLoginPage();

		if (sessionStorage.get("loggedin") === "true") {
			locationService.mainPage();
		}

		var res = {
			identifier: loginStorage.get("identifier"),
			password: "",
			failureCode: parseInt(loginStorage.get("failureCode"), 10),
			state: loginState.data,
			

			loginServer: function (name, password, callback) {
				step(function loginStartup() {
					socketService.emit("session.token", {
						identifier: name
					}, this);
				}, function hashWithToken(e, data) {
					if (e) {
						this.last({ failure: failureCodes.UNKNOWNNAME });
					} else {
						if (data.salt.length !== 16) {
							this.last({ failure: failureCodes.SECURITY });
							return;
						}

						var hash = keyStoreService.hash.hashPW(password, data.salt);

						hash = keyStoreService.hash.hash(hash + data.token);
						socketService.emit("session.login", {
							identifier: name,
							password: hash,
							token: data.token
						}, this);
					}
				}, function loginResults(e, data) {
					if (e) {
						this.last({ failure: failureCodes.WRONGPASSWORD });
					} else {
						sessionStorage.set("sid", data.sid);
						sessionStorage.set("userid", data.userid);
						sessionStorage.set("loggedin", true);
						sessionStorage.set("password", password);

						this.last.ne();
					}
				}, callback);
			},

			login: function () {
				loginState.pending();

				loginStorage.set("identifier", res.identifier || "");

				step(function () {
					res.loginServer(res.identifier, res.password, this);
				}, function (e) {
					if (e) {
						loginState.failed();

						res.failureCode = e.failure;

						if (!isViewForm) {
							loginStorage.set("failureCode", e.failure);
							locationService.loginPage();
						}
					} else {
						loginState.success();
						locationService.mainPage();
					}
				});
			}
		};

		loginStorage.remove("failureCode");

		return res;
	};

	service.$inject = ["$rootScope", "ssn.locationService", "ssn.keyStoreService", "ssn.socketService", "ssn.storageService"];

	loginModule.factory("ssn.loginDataService", service);
});
