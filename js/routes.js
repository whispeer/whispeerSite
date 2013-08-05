define(["app"], function (app) {
	"use strict";

	return app.config(["$routeProvider", "$locationProvider", function ($routeProvider, $locationProvider) {
		$locationProvider.html5Mode(false);

		function addMain(name) {
			$routeProvider.when("/" + name, {
				templateUrl: "views/" + name + "/" + name + ".html",
				controller: "ssn." + name + "Controller"
			});
		}
		
		addMain("login");
		addMain("main");
		addMain("friends");
		addMain("messages");
		addMain("settings");
		addMain("help");

		$routeProvider.when("/user/:identifier", {
			templateUrl: "views/user/user.html",
			controller: "ssn.userController"
		});
		$routeProvider.when("/:identifier", {
			redirectTo: function (params) {
				return "/user/" + params.identifier;
			}
		});
		$routeProvider.otherwise({redirectTo: "/login"});
	}]);

});