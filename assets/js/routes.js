define(["app"], function (app) {
	"use strict";

	return app.config(["$routeProvider", "$locationProvider", function ($routeProvider, $locationProvider) {
		$locationProvider.html5Mode(true);

		function addMain(name, reloadOnSearch) {
			if (reloadOnSearch !== false) {
				reloadOnSearch = true;
			}

			$routeProvider.when("/" + name, {
				templateUrl: "/assets/views/" + name + "/" + name + ".html",
				controller: "ssn." + name + "Controller",
				reloadOnSearch: reloadOnSearch
			});
		}

		addMain("start");
		addMain("main");
		addMain("friends");
		addMain("messages", false);
		addMain("circles");
		addMain("settings");
		addMain("help");
		addMain("loading");

		$routeProvider.when("/logout", {
			templateUrl: "/assets/views/loading/loading.html",
			controller: "ssn.logoutController"
		});

		$routeProvider.when("/user/:identifier", {
			templateUrl: "/assets/views/user/user.html",
			controller: "ssn.userController"
		});

		$routeProvider.when("/:identifier", {
			redirectTo: function (params) {
				if (params.identifier === "") {
					return "/start";
				}

				return "/user/" + params.identifier;
			}
		});
		$routeProvider.otherwise({redirectTo: "/login"});
	}]);

});