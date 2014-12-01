define(["app"], function (app) {
	"use strict";

	return app.config(["$routeProvider", "$provide", "$locationProvider", function ($routeProvider, $provide, $locationProvider) {
		$locationProvider.html5Mode(true);
		$locationProvider.hashPrefix("!");

		if (window.location.href.indexOf("file:///") === 0) {
			$provide.decorator("$sniffer", function($delegate) {
				$delegate.history = false;
				return $delegate;
			});
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

		$routeProvider.when("/start/:inviteCode", {
			templateUrl: "assets/views/pages/start.html",
			controller: "ssn.startController",
		});

		addMain("start", false);
		addMain("login");
		addMain("invite");
		addMain("setup");
		addMain("main");
		addMain("friends");
		addMain("messages", false);
		addMain("circles");
		addMain("settings");
		addMain("help");
		addMain("loading");
		addMain("version");
		addMain("legal");
		addMain("impressum");
		addMain("agb");
		addMain("privacyPolicy");
		addMain("notificationCenter");

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
				if (params.identifier.match(/^(A-z0-9)+$/)) {
					return "/user/" + params.identifier;
				}

				return "/start";
			}
		});
		$routeProvider.otherwise({redirectTo: "/start"});
	}]);

});