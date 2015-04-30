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
			login: function () {
				loginState.pending();

				res.success = false;
				res.unknownName = false;
				res.wrongPassword = false;
				res.failure = false;

				step(function () {
					sessionHelper.login(res.identifier, res.password, this);
				}, function (e) {
					if (e) {
						loginState.failed();
						res.failedOnce = true;
						if (e.wrongPassword) {
							res.wrongPassword = true;
						} else if (e.unknownName) {
							res.unknownName = true;
						} else {
							res.failure = true;
						}

						if ($location.path() !== "/login" && !$rootScope.$$childHead.mobile) {
							$location.path("/login");
						}
					} else {
						loginState.success();
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

	service.$inject = ["$rootScope", "$location", "ssn.sessionHelper"];

	loginModule.factory("ssn.loginDataService", service);
});
