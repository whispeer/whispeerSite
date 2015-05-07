define(["app"], function (app) {
	"use strict";

	return app.config(["$stateProvider", "$provide", "$locationProvider", "localizationLoaderProvider", function ($stateProvider, $provide, $locationProvider, localizationLoaderProvider) {
		localizationLoaderProvider.setAvailableLanguages(["en-us", "de"]);

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

			$stateProvider.state(name, {
				url: "/" + name,
				templateUrl: "assets/views/pages/" + name + ".html",
				controller: "ssn." + name + "Controller",
				reloadOnSearch: reloadOnSearch
			});
		}

		addMain("login");
		addMain("invite");
		addMain("setup");
		addMain("main");
		addMain("friends");
		addMain("messages", false);
		addMain("circles");
		addMain("settings");
		addMain("acceptInvite");

		//TODO: move all of these into own html files!
		addMain("start", false);
		addMain("help");
		addMain("version");
		addMain("legal");
		addMain("impressum");
		addMain("agb");
		addMain("privacyPolicy");

		$stateProvider.state("logout", {
			url: "/logout",
			templateUrl: "assets/views/pages/loading.html",
			controller: "ssn.logoutController"
		});

		/*$stateProvider.state("/verifyMail/:challenge", {
			templateUrl: "assets/views/pages/mail.html",
			controller: "ssn.mailController"
		});

		$stateProvider.state("/user/:identifier", {
			templateUrl: "assets/views/pages/user.html",
			controller: "ssn.userController"
		});

		$stateProvider.state("/:identifier", {
			redirectTo: function (params) {
				if (params.identifier.match(/^[A-z0-9]+$/)) {
					return "/user/" + params.identifier;
				}

				return "/start";
			}
		});

		$stateProvider.otherwise({redirectTo: "/start"});*/
	}]);

});
