var State = require("asset/state");
var chelper = require("crypto/helper");
var loginModule = require("login/loginModule");
var errors = require("asset/errors");
var Bluebird = require("bluebird");

var socketService = require("services/socket.service.ts").default;
var Storage = require("services/storage.service.ts");

var locationService = require("services/location.manager.ts");

var service = function () {
	var loginState = new State.default();

	var failureCodes = {
		UNKNOWNNAME: 0,
		WRONGPASSWORD: 1,
		NOCONNECTION: 2,
		NOBUSINESSLICENSE: 3,
		UNKNOWN: 5
	};

	const sessionStorage = Storage.withPrefix("whispeer.session");
	const loginStorage = Storage.withPrefix("whispeer.login");
	const tokenStorage = Storage.withPrefix("whispeer.token")

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
					token: data.token,
					companyToken: tokenStorage.get("token")
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

				return sessionStorage.save().thenReturn(data);
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

loginModule.factory("ssn.loginDataService", service);
