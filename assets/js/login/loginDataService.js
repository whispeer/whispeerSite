define([
	"step",
	"asset/state",
	"crypto/helper",
	"login/loginModule",
	"bluebird",
	"services/locationService",
	"services/socketService",
	"services/storageService"
], function (step, State, chelper, loginModule, Bluebird) {
	"use strict";

	var service = function ($rootScope, locationService, socketService, Storage) {
		var loginState = new State();

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
						
						sessionStorage.save().then(this.ne, this);
					}
				}, callback);
			},

			login: function () {
				var loginServer = Bluebird.promisify(res.loginServer, res);

				loginState.pending();

				loginStorage.set("identifier", res.identifier || "");
				loginStorage.save().then(function () {
					return loginServer(res.identifier, res.password);
				}).then(function () {
					loginState.success();
					locationService.mainPage();
					$rootScope.$apply();
				}).catch(function (e) {
					loginState.failed();

					res.failureCode = e.failure;
					res.failedOnce = true;

					if (!isViewForm) {
						loginStorage.set("failureCode", e.failure);
						loginStorage.save().then(function () {
							locationService.loginPage();
						});
					}

					$rootScope.$apply();
				});
			}
		};

		res.loadedStorage = loginStorage.awaitLoading().then(function () {
			res.identifier = loginStorage.get("identifier");
			res.failureCode = parseInt(loginStorage.get("failureCode"), 10);

			$rootScope.$apply();

			loginStorage.remove("failureCode");
			loginStorage.save();
		});

		return res;
	};

	service.$inject = ["$rootScope", "ssn.locationService", "ssn.socketService", "ssn.storageService"];

	loginModule.factory("ssn.loginDataService", service);
});
