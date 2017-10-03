/**
* sessionController
**/

var localize = require("i18n/localizationConfig");
var initService = require("services/initService");
var socketService = require("services/socket.service").default;
var sessionHelper = require("services/session.helper").default;
var userService = require("users/userService").default;
var cssService = require("services/css.service").default;
var messageService = require("messages/messageService");
var friendsService = require("services/friendsService");

"use strict";

const jQuery = require("jquery");
const controllerModule = require("controllers/controllerModule");
const debug = require("debug");
const Bluebird = require("bluebird");

var debugName = "whispeer:rootController";
var rootControllerDebug = debug(debugName);

function rootController($scope, $http, $interval) {
	$scope.loading = true;

	var nullUser = {
		name: "",
		basic: {
			image: "assets/img/user.png"
		},
		id: 0
	};

	$scope.addLocale = function (url) {
		return "/" + localize.getLanguage() + url;
	};

	$scope.user = nullUser;
	$scope.friends = friendsService.data;
	$scope.messages = messageService.data;

	$scope.noBusiness = !WHISPEER_BUSINESS

	var afterInitPromise = Bluebird.resolve();

	function loadUser() {
		var user = userService.getOwn();

		return user.loadBasicData().then(function () {
			$scope.user = user.data;
			$scope.loading = false;

			rootControllerDebug("Own Name loaded:" + (new Date().getTime() - startup));
		});
	}

	function afterInit() {
		afterInitPromise.finally(function () {
			loadUser();
		});
	}

	function afterInitCache() {
		afterInitPromise = loadUser();
	}

	initService.listen(afterInitCache, "initCacheDone");
	initService.listen(afterInit, "initDone");

	$scope.sidebarActive = false;
	$scope.showMenu = true;

	$scope.lostConnection = false;

	$interval(function () {
		$scope.lostConnection = !socketService.isConnected();
	}, 2000);

	socketService.on("disconnect", function () {
		$scope.$apply(function () {
			$scope.lostConnection = true;
		});
	});

	socketService.on("connect", function () {
		$scope.$apply(function () {
			$scope.lostConnection = false;
		});
	});

	$scope.activateSidebar = function () {
		if (!$scope.sidebarActive) {
			$scope.toggleSidebar();
		}
	};

	$scope.deactivateSidebar = function () {
		if ($scope.sidebarActive) {
			$scope.toggleSidebar();
		}
	};

	$scope.closeSidebar = function() {
		$scope.sidebarActive = false;
	};

	$scope.toggleSidebar = function() {
		$scope.sidebarActive = !$scope.sidebarActive;
	};

	function fixSafariScrolling(event) {
		event.target.style.overflowY = "hidden";
		setTimeout(function () { event.target.style.overflowY = "auto"; });
	}

	jQuery("#sidebar-left").on("webkitTransitionEnd", fixSafariScrolling);

	function updateCssClass() {
		if (!$scope.loading) {
			$scope.cssClass = cssService.getClass();
		} else {
			$scope.cssClass = "loading";
		}

		jQuery("html").attr("class", $scope.cssClass);
	}

	$scope.mobileActivateView = function() {
		$scope.closeSidebar();
		updateCssClass();
	};

	cssService.addListener(function (newClass, isBox) {
		updateCssClass();
		$scope.isBox = isBox;
	});

	jQuery(document.body).removeClass("loading");

	updateCssClass();

	$scope.logout = function () {
		sessionHelper.logout();
	};
}

rootController.$inject = ["$scope", "$http", "$interval"];

controllerModule.controller("ssn.rootController", rootController);
