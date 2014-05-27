define(["app"], function (app) {
	"use strict";

	return app.config(["$routeProvider", "$provide", "$locationProvider", function ($routeProvider, $provide, $locationProvider) {
		if (window.location.href.indexOf("file:///") !== 0) {
			$locationProvider.html5Mode(true);
			$locationProvider.hashPrefix("!");
		}

		function addMain(name, reloadOnSearch) {
			if (reloadOnSearch !== false) {
				reloadOnSearch = true;
			}

			$routeProvider.when("/" + name, {
				templateUrl: "assets/views/pages/" + name + ".html",
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
		addMain("version");

		$routeProvider.when("/logout", {
			templateUrl: "assets/views/pages/loading.html",
			controller: "ssn.logoutController"
		});

		$routeProvider.when("/verifyMail/:challenge", {
			templateUrl: "assets/views/pages/mail.html",
			controller: "ssn.mailController"
		});

		$routeProvider.when("/user/:identifier", {
			templateUrl: "assets/views/pages/user.html",
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
		$routeProvider.otherwise({redirectTo: "/start"});
	}]);

});