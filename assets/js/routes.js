define(["app"], function (app) {
	"use strict";

	return app.config(["$stateProvider", "$urlRouterProvider", "$provide", "$locationProvider", "localizationLoaderProvider", function ($stateProvider, $urlRouterProvider, $provide, $locationProvider, localizationLoaderProvider) {
		localizationLoaderProvider.setAvailableLanguages(["en-us", "de"]);

		$locationProvider.html5Mode(true);
		$locationProvider.hashPrefix("!");

		if (window.location.href.indexOf("file:///") === 0) {
			$provide.decorator("$sniffer", function($delegate) {
				$delegate.history = false;
				return $delegate;
			});
		}

		function addMain(name) {
			$stateProvider.state(name, {
				url: "/" + name,
				templateUrl: "assets/views/pages/" + name + ".html",
				controller: "ssn." + name + "Controller"
			});
		}

		addMain("login");
		addMain("invite");
		addMain("setup");
		addMain("main");
		addMain("friends");
		addMain("circles");
		addMain("settings");
		addMain("acceptInvite");

		//TODO: move all of these into own html files!
		addMain("start");
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

		$stateProvider.state("messages", {
			url: "/messages?topicid&userid",
			templateUrl: "assets/views/pages/messages.html",
			controller: "ssn.messagesController",
			reloadOnSearch: false
		});

		$stateProvider.state("verifyMail", {
			url: "/verifyMail/:challenge",
			templateUrl: "assets/views/pages/mail.html",
			controller: "ssn.mailController"
		});

		$stateProvider.state("user", {
			url: "/user/:identifier",
			templateUrl: "assets/views/pages/user.html",
			controller: "ssn.userController"
		});

		$stateProvider.state("short.user", {
			url: "/{identifier:[A-z0-9]+}",
			templateUrl: "assets/views/pages/user.html",
			controller: "ssn.userController"
		});

		$urlRouterProvider.when("/", "/start");
	}]);

});
