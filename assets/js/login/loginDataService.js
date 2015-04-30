define(["step", "asset/state", "login/loginModule"], function (step, State, loginModule) {
	"use strict";

	var service = function ($rootScope, $location, sessionHelper) {
		var loginState = new State();

		var res = {
			identifier: "",
			password: "",
			state: loginState.data,
			success: false,
			unknownName: false,
			wrongPassword: false,
			failure: false,
			failedOnce: false,
			isHeaderForm: false,

			loginServer: function (name, password, callback) {
				step(function loginStartup() {
					socketService.emit("session.token", {
						identifier: name
					}, this);
				}, function hashWithToken(e, data) {
					if (e) {
						this.last({ unknownName: true });
					} else {
						if (data.salt.length !== 16) {
							throw new SecurityError("server wut?");
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
						this.last({ wrongPassword: true });
					} else {
						sessionHelper.resetKey();
						
						sessionService.setSID(data.sid, data.userid);
						keyStoreService.security.setPassword(password);

						this.last.ne();
					}
				}, callback);
			},

			login: function () {
				loginState.pending();

				res.failure = {};
				res.failure.UNKNOWNNAME = 0;
				res.failure.WRONGPASSWORD = 1;
				res.failure.NOCONNECTION = 2;
				res.failure.UNKNOWN = 5;

				res.success = false;
				res.unknownName = false;
				res.wrongPassword = false;
				res.failure = false;

				step(function () {
					sessionHelper.login(res.identifier, res.password, this);
				}, function (e) {
					if (e) {
						loginState.failed();

						/* write username and failure reason to localstorage */
						/* redirect to loginDetailed.html (except if we are there) */
						res.failedOnce = true;
						if (e.wrongPassword) {
							res.wrongPassword = true;
						} else if (e.unknownName) {
							res.unknownName = true;
						} else {
							res.failure = true;
						}

						window.top.location = "loginDetail.html";
					} else {
						loginState.success();

						window.location.href = "/main";

						res.failedOnce = false;
						res.identifier = "";
						res.password = "";
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

	service.$inject = ["$rootScope", "$location"];

	loginModule.factory("ssn.loginDataService", service);
});
