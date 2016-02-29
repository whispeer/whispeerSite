define(["app"], function (app) {
	"use strict";

	return app.config(["$stateProvider", "$urlRouterProvider", "$provide", "$locationProvider", function ($stateProvider, $urlRouterProvider, $provide, $locationProvider) {
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

		addMain("setup");
		addMain("backup");
		addMain("main");
		addMain("friends");
		addMain("acceptInvite");
		addMain("search");

		$stateProvider.state("app.post", {
			url: "/post/{postID:[1-9][0-9]*}",
			templateUrl: "assets/views/pages/post.html",
			controller: "ssn.postController"
		});

		$stateProvider.state("app.settings", {
			url: "/settings",
			abstract: true,
			templateUrl: "assets/views/pages/settings.html",
			controller: "ssn.settingsController"
		});

		$stateProvider.state("app.settings.general", {
			url: "",
			templateUrl: "assets/views/pages/settings/general.html",
			controller: "ssn.settingsController"
		});

		$stateProvider.state("app.settings.account", {
			url: "/account",
			templateUrl: "assets/views/pages/settings/account.html",
			controller: "ssn.settingsController"
		});

		$stateProvider.state("app.settings.privacy", {
			url: "/privacy",
			templateUrl: "assets/views/pages/settings/privacy.html",
			controller: "ssn.settingsController"
		});

		$stateProvider.state("app.invite", {
			url: "/invite",
			templateUrl: "assets/views/pages/invites/invite.html",
			controller: "ssn.inviteController"
		});

		$stateProvider.state("app.invite.mail", {
			url: "/mail",
			templateUrl: "assets/views/pages/invites/mail.html",
			controller: "ssn.inviteMailController"
		});

		$stateProvider.state("app.invite.link", {
			url: "/link",
			templateUrl: "assets/views/pages/invites/link.html",
			controller: "ssn.inviteLinkController"
		});

		$stateProvider.state("app.fund", {
			url: "/fund",
			abstract: true,
			templateUrl: "assets/views/pages/fund.html",
			controller: "ssn.fundController"
		});

		$stateProvider.state("app.fund.general", {
			url: "",
			templateUrl: "assets/views/pages/fund/general.html",
			controller: "ssn.fundController"
		});

		$stateProvider.state("app.fund.thankyou", {
			url: "/thankyou",
			templateUrl: "assets/views/pages/fund/thankyou.html",
			controller: "ssn.fundThankYouController"
		});

		$stateProvider.state("app.logout", {
			url: "/logout",
			controller: ["ssn.sessionHelper", function (sessionHelper) {
				sessionHelper.logout();
			}]
		});

		$stateProvider.state("app.messages", {
			url: "/messages",
			views: {
				"list@app.messages": {
					templateUrl: "assets/views/messages/listTopics.html",
					controller: "ssn.messagesListController",
				},
				"": {
					templateUrl: "assets/views/pages/messages.html",
					controller: "ssn.messagesRedirectController",
				}
			}
		});

		$stateProvider.state("app.messages.start", {
			url: "",
			templateUrl: "assets/views/messages/start.html"
		});

		$stateProvider.state("app.messages.list", {
			url: "/list",
			templateUrl: "assets/views/messages/listTopics.html",
			controller: "ssn.messagesListController"
		});

		$stateProvider.state("app.messages.new", {
			url: "/new?userid",
			templateUrl: "assets/views/messages/newTopic.html",
			controller: "ssn.messagesCreateController"
		});

		$stateProvider.state("app.messages.show", {
			url: "/{topicid:[1-9][0-9]*}",
			templateUrl: "assets/views/messages/showTopic.html",
			controller: "ssn.messagesShowController"
		});

		$stateProvider.state("app.circles", {
			url: "/circles",
			views: {
				"list@app.circles": {
					templateUrl: "assets/views/circles/listCircles.html",
					controller: "ssn.circlesListController",
				},
				"": {
					templateUrl: "assets/views/pages/circles.html",
					controller: "ssn.circlesRedirectController",
				}
			}
		});

		$stateProvider.state("app.circles.list", {
			url: "/list",
			templateUrl: "assets/views/circles/listCircles.html",
			controller: "ssn.circlesListController"
		});

		$stateProvider.state("app.circles.new", {
			url: "/new?userid",
			templateUrl: "assets/views/circles/newCircle.html",
			controller: "ssn.circlesCreateController"
		});

		$stateProvider.state("app.circles.show", {
			url: "/{circleid:[1-9][0-9]*}",
			templateUrl: "assets/views/circles/circleShow.html",
			controller: "ssn.circlesShowController"
		});

		$stateProvider.state("app.user", {
			url: "/user/:identifier",
			abstract: true,
			templateUrl: "assets/views/pages/userSubViews/user.html",
			controller: "ssn.userController"
		});

		$stateProvider.state("app.user.verify", {
			url: "/verify",
			templateUrl: "assets/views/pages/userSubViews/userVerify.html",
			controller: "ssn.userVerifyController"
		});

		$stateProvider.state("app.user.info", {
			url: "",
			views: {
				"wall@app.user.info": {
					templateUrl: "assets/views/pages/userSubViews/userWall.html",
					controller: "ssn.userWallController",
				},
				"": {
					templateUrl: "assets/views/pages/userSubViews/userInfo.html"
				}
			}
		});

		$stateProvider.state("app.user.wall", {
			url: "/wall",
			templateUrl: "assets/views/pages/userSubViews/userWall.html",
			controller: "ssn.userWallController"
		});

		$stateProvider.state("app.user.friends", {
			url: "/friends",
			templateUrl: "assets/views/pages/userSubViews/userFriends.html",
			controller: "ssn.userFriendsController"
		});

		$urlRouterProvider.otherwise(function ($injector, url) {
			var locale = $injector.get("localize").getLanguage();
			console.log("Locale: " + locale);

			if (url.$$path && url.$$path.indexOf(locale) === -1) {
				return locale + url.$$path;
			} else {
				return locale + "/main";
			}
		});
	}]);

});
