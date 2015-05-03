define([
	"step",
	"asset/state",
	"login/loginModule",
	"services/keyStoreService",
	"services/socketService",
	"services/keyStoreService",
	"services/storageService"
], function (step, State, loginModule) {
	"use strict";

	var service = function ($rootScope, $location, keyStoreService, socketService, Storage) {
		var loginState = new State();

		var failureCodes = {
			UNKNOWNNAME: 0,
			WRONGPASSWORD: 1,
			NOCONNECTION: 2,
			UNKNOWN: 5
		};

		var sessionStorage = new Storage("whispeer.session");
		var loginStorage = new Storage("whispeer.login");

		var res = {
			identifier: loginStorage.get("identifier"),
			password: "",
			state: loginState.data,
			isHeaderForm: false,

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

				loginStorage.set("identifier", res.identifier);

				step(function () {
					res.loginServer(res.identifier, res.password, this);
				}, function (e) {
					if (e) {
						loginState.failed();
						loginStorage.set("failureCode", e.failure);
						window.top.location = "/login";
					} else {
						loginState.success();

						window.top.location = "/main";
					}
				});
			}
		};


		$rootScope.$watch(function () {
			return $location.path() !== "/login";
		}, function (val) {
			res.isHeaderForm = val;
		});

		return res;
	};

	service.$inject = ["$rootScope", "$location", "ssn.keyStoreService", "ssn.socketService", "ssn.storageService"];

	loginModule.factory("ssn.loginDataService", service);
});
