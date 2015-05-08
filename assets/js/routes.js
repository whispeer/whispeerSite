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

		$stateProvider.state("app", {
			url: "/{locale}",
			abstract: true,
			template: "<ui-view/>"
		});

		function addMain(name) {
			$stateProvider.state("app." + name, {
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

		$stateProvider.state("app.logout", {
			url: "/logout",
			controller: ["ssn.sessionHelper", function (sessionHelper) {
				sessionHelper.logout();
			}]
		});

		$stateProvider.state("app.messages", {
			url: "/messages?topicid&userid",
			templateUrl: "assets/views/pages/messages.html",
			controller: "ssn.messagesController",
			reloadOnSearch: false
		});

		$stateProvider.state("app.verifyMail", {
			url: "/verifyMail/:challenge",
			templateUrl: "assets/views/pages/mail.html",
			controller: "ssn.mailController"
		});

		$stateProvider.state("app.user", {
			url: "/user/:identifier",
			templateUrl: "assets/views/pages/user.html",
			controller: "ssn.userController"
		});

		$urlRouterProvider.otherwise(function ($injector, url) {
			var locale = $injector.get("localize").getLanguage();

			if (url.$$path) {
				return locale + url.$$path;
			} else {
				return locale + "/main";
			}
		});
	}]);

});
