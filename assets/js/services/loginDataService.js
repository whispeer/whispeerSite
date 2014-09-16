define(["step"], function (step) {
	"use strict";

	var service = function ($rootScope, $location, sessionHelper) {
		var res = {
			identifier: "",
			password: "",
			success: false,
			unknownName: false,
			wrongPassword: false,
			failure: false,
			isHeaderForm: false,
			login: function () {
				step(function () {
					sessionHelper.login(res.identifier, res.password, this);
				}, function (e) {
					res.success = false;
					res.unknownName = false;
					res.wrongPassword = false;
					res.failure = false;

					if (e) {
						if (e.wrongPassword) {
							res.wrongPassword = true;
						} else if (e.unknownName) {
							res.unknownName = true;
						} else {
							res.failure = true;
						}

						if ($location.path() !== "/login") {
							$location.path("/login");
						}
					} else {
						res.success = true;
						res.identifier = "";
						res.password = "";
					}
				});
			}
		};


		$rootScope.$watch(function () {
			return $location.path() !== "/login";
		}, function (val) {
			console.log(val);
			res.isHeaderForm = val;
		});

		return res;
	};

	service.$inject = ["$rootScope", "$location", "ssn.sessionHelper"];

	return service;
});