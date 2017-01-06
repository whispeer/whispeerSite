define([
	"asset/state",
	"crypto/helper",
	"login/loginModule",
	"asset/errors",
	"bluebird",
	"services/locationService",
	"services/socketService",
	"services/storageService"
], function (State, chelper, loginModule, errors, Bluebird) {
	"use strict";

	var service = function ($rootScope, locationService, socketService, Storage) {
		var loginState = new State.default();

		var failureCodes = {
			UNKNOWNNAME: 0,
			WRONGPASSWORD: 1,
			NOCONNECTION: 2,
			UNKNOWN: 5
		};

		var sessionStorage = Storage.withPrefix("whispeer.session");
		var loginStorage = Storage.withPrefix("whispeer.login");

		try {
			if (localStorage.getItem("loggedin") === "true") {
				var sid = localStorage.getItem("sid");
				var userid = localStorage.getItem("userid");
				var password = localStorage.getItem("password");

				localStorage.clear();

				//migrate to new format
				sessionStorage.set("loggedin", "true");
				sessionStorage.set("sid", sid);
				sessionStorage.set("userid", userid);
				sessionStorage.set("password", password);
			}
		} catch (e) {
			console.warn("no local storage");
		}

		var isViewForm = locationService.isLoginPage();

		sessionStorage.awaitLoading().then(function () {
			if (sessionStorage.get("loggedin") === "true") {
				locationService.mainPage();
			}
		});

		var res = {
			identifier: loginStorage.get("identifier"),
			password: "",
			failureCode: parseInt(loginStorage.get("failureCode"), 10),
			state: loginState.data,
			

			loginServer: function (name, password, callback) {
				return Bluebird.try(function () {
					return socketService.emit("session.token", {
						identifier: name
					});
				}).catch(function (e) {
					if (e.name === "disconnectedError") {
						throw new errors.LoginError("Login failed", { failure: failureCodes.NOCONNECTION });	
					}

					console.log(e);
					throw new errors.LoginError("Login failed", { failure: failureCodes.UNKNOWNNAME });
				}).then(function (data) {
					if (data.salt.length !== 16) {
						throw new errors.LoginError("Login failed", { failure: failureCodes.SECURITY });
					}

					var hash = chelper.hashPW(password, data.salt);

					hash = chelper.hash(hash + data.token);
					return socketService.emit("session.login", {
						identifier: name,
						password: hash,
						token: data.token
					}).catch(function (e) {
						if (e.name === "disconnectedError") {
							throw new errors.LoginError("Login failed", { failure: failureCodes.NOCONNECTION });	
						}

						console.log(e);
						throw new errors.LoginError("Login failed", { failure: failureCodes.WRONGPASSWORD });
					});
				}).then(function (data) {
					sessionStorage.set("sid", data.sid);
					sessionStorage.set("userid", data.userid);
					sessionStorage.set("loggedin", true);
					sessionStorage.set("password", password);
					
					return sessionStorage.save();
				}).catch(function (e) {
					console.log(e);
					throw e;
				}).nodeify(callback);
			},

			login: function () {
				loginState.pending();

				loginStorage.set("identifier", res.identifier || "");
				loginStorage.save().then(function () {
					return res.loginServer(res.identifier, res.password);
				}).then(function () {
					loginState.success();
					locationService.mainPage();
				}).catch(function (e) {
					loginState.failed();

					res.failureCode = e.data.failure;
					res.failedOnce = true;

					if (!isViewForm) {
						loginStorage.set("failureCode", e.failure);
						loginStorage.save().then(function () {
							locationService.loginPage();
						});
					}
				});
			}
		};

		res.loadedStorage = loginStorage.awaitLoading().then(function () {
			res.identifier = loginStorage.get("identifier");
			res.failureCode = parseInt(loginStorage.get("failureCode"), 10);

			loginStorage.remove("failureCode");
			loginStorage.save();

			return null;
		});

		return res;
	};

	service.$inject = ["$rootScope", "ssn.locationService", "ssn.socketService", "ssn.storageService"];

	loginModule.factory("ssn.loginDataService", service);
});
