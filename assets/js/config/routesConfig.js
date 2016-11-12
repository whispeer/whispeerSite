var app = require("app");

module.exports = app.config(["$stateProvider", "$urlRouterProvider", "$provide", "$locationProvider", function ($stateProvider, $urlRouterProvider, $provide, $locationProvider) {
	"use strict";

	var basicRoutes = [
		"setup",
		"backup",
		"friends",
		"acceptInvite",
		"search",
	];

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
			templateUrl: "pages/" + name + ".html",
			controller: "ssn." + name + "Controller"
		});
	}

	basicRoutes.forEach(function (name) {
		addMain(name);
	});

	$stateProvider.state("app.main", {
		url: "/main?sortByCommentTime",
		templateUrl: "pages/main.html",
		controller: "ssn.mainController",
		reloadOnSearch: false
	});

	$stateProvider.state("app.post", {
		url: "/post/{postID:[1-9][0-9]*}",
		templateUrl: "pages/post.html",
		controller: "ssn.postController"
	});

	$stateProvider.state("app.settings", {
		url: "/settings",
		abstract: true,
		templateUrl: "pages/settings.html",
		controller: "ssn.settingsController"
	});

	$stateProvider.state("app.settings.general", {
		url: "",
		templateUrl: "pages/settings/general.html",
		controller: "ssn.settingsController"
	});

	$stateProvider.state("app.settings.account", {
		url: "/account",
		templateUrl: "pages/settings/account.html",
		controller: "ssn.settingsController"
	});

	$stateProvider.state("app.settings.privacy", {
		url: "/privacy",
		templateUrl: "pages/settings/privacy.html",
		controller: "ssn.settingsController"
	});

	$stateProvider.state("app.invite", {
		url: "/invite",
		templateUrl: "pages/invites/invite.html",
		controller: "ssn.inviteController"
	});

	$stateProvider.state("app.invite.mail", {
		url: "/mail",
		templateUrl: "pages/invites/mail.html",
		controller: "ssn.inviteMailController"
	});

	$stateProvider.state("app.invite.link", {
		url: "/link",
		templateUrl: "pages/invites/link.html",
		controller: "ssn.inviteLinkController"
	});

	$stateProvider.state("app.fund", {
		url: "/fund",
		abstract: true,
		templateUrl: "pages/fund.html",
		controller: "ssn.fundController"
	});

	$stateProvider.state("app.fund.general", {
		url: "",
		templateUrl: "pages/fund/general.html",
		controller: "ssn.fundController"
	});

	$stateProvider.state("app.fund.thankyou", {
		url: "/thankyou",
		templateUrl: "pages/fund/thankyou.html",
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
				templateUrl: "messages/listTopics.html",
				controller: "ssn.messagesListController",
			},
			"": {
				templateUrl: "pages/messages.html",
				controller: "ssn.messagesRedirectController",
			}
		}
	});

	$stateProvider.state("app.messages.start", {
		url: "",
		templateUrl: "messages/start.html"
	});

	$stateProvider.state("app.messages.list", {
		url: "/list",
		templateUrl: "messages/listTopics.html",
		controller: "ssn.messagesListController"
	});

	$stateProvider.state("app.messages.new", {
		url: "/new?userid",
		templateUrl: "messages/newTopic.html",
		controller: "ssn.messagesCreateController"
	});

	$stateProvider.state("app.messages.show", {
		url: "/{topicid:[1-9][0-9]*}",
		templateUrl: "messages/showTopic.html",
		controller: "ssn.messagesShowController"
	});

	$stateProvider.state("app.messages.detail", {
		url: "/{topicid:[1-9][0-9]*}/detail",
		templateUrl: "messages/detail.html",
		controller: "ssn.messagesDetailController"
	});

	$stateProvider.state("app.circles", {
		url: "/circles",
		views: {
			"list@app.circles": {
				templateUrl: "circles/listCircles.html",
				controller: "ssn.circlesListController",
			},
			"": {
				templateUrl: "pages/circles.html",
				controller: "ssn.circlesRedirectController",
			}
		}
	});

	$stateProvider.state("app.circles.list", {
		url: "/list",
		templateUrl: "circles/listCircles.html",
		controller: "ssn.circlesListController"
	});

	$stateProvider.state("app.circles.new", {
		url: "/new?userid",
		templateUrl: "circles/newCircle.html",
		controller: "ssn.circlesCreateController"
	});

	$stateProvider.state("app.circles.show", {
		url: "/{circleid:[1-9][0-9]*}",
		templateUrl: "circles/circleShow.html",
		controller: "ssn.circlesShowController"
	});

	$stateProvider.state("app.user", {
		url: "/user/:identifier",
		abstract: true,
		templateUrl: "pages/userSubViews/user.html",
		controller: "ssn.userController"
	});

	$stateProvider.state("app.user.verify", {
		url: "/verify",
		templateUrl: "pages/userSubViews/userVerify.html",
		controller: "ssn.userVerifyController"
	});

	$stateProvider.state("app.user.info", {
		url: "",
		views: {
			"wall@app.user.info": {
				templateUrl: "pages/userSubViews/userWall.html",
				controller: "ssn.userWallController",
			},
			"": {
				templateUrl: "pages/userSubViews/userInfo.html"
			}
		}
	});

	$stateProvider.state("app.user.wall", {
		url: "/wall",
		templateUrl: "pages/userSubViews/userWall.html",
		controller: "ssn.userWallController"
	});

	$stateProvider.state("app.user.friends", {
		url: "/friends",
		templateUrl: "pages/userSubViews/userFriends.html",
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
