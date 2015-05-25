define([
	"step",
	"asset/state",
	"crypto/helper",
	"login/loginModule",
	"services/locationService",
	"services/socketService",
	"services/storageService"
], function (step, State, chelper, loginModule) {
	"use strict";

	var service = function ($rootScope, locationService, socketService, Storage) {
		var loginState = new State();

		var failureCodes = {
			UNKNOWNNAME: 0,
			WRONGPASSWORD: 1,
			NOCONNECTION: 2,
			UNKNOWN: 5
		};

		var sessionStorage = new Storage("whispeer.session");
		var loginStorage = new Storage("whispeer.login");

		if (localStorage.getItem("loggedin") === "true") {
			var sid = localStorage.getItem("loggedin");
			var userid = localStorage.getItem("userid");
			var password = localStorage.getItem("password");

			//migrate to new format
			sessionStorage.set("loggedin", "true");
			sessionStorage.set("sid", sid);
			sessionStorage.set("userid", userid);
			sessionStorage.set("loggedin", password);
		}

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

						var hash = chelper.hashPW(password, data.salt);

						hash = chelper.hash(hash + data.token);
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

	service.$inject = ["$rootScope", "ssn.locationService", "ssn.socketService", "ssn.storageService"];

	loginModule.factory("ssn.loginDataService", service);
});
