/**
* sessionController
**/

define(["step", "whispeerHelper", "config", "controllers/controllerModule"], function (step, h, config, controllerModule) {
	"use strict";

	function getVersionString(data) {
		if (typeof data === "object" && !(data instanceof Array)) {
			var keys = Object.keys(data).map(h.parseDecimal);
			keys.sort(function(a, b){return a-b;});

			var newest = keys[keys.length - 1];

			return newest + "." + getVersionString(data[newest]);
		} else {
			return "";
		}
	}

	function rootController($scope, $http, localize, socketService, sessionService, sessionHelper, userService, cssService, messageService, trustService, friendsService) {
		$http({ method: "GET", url: "changelog.json", cache: false }).success(function (data) {
			var version = getVersionString(data);
			version = version.substr(0, version.length - 1);

			$scope.version = version + "-" + config.buildDate;
		});

		$scope.version = "";
		$scope.loggedin = false;

		$scope.loading = sessionService.isLoggedin();

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

		$scope.$on("ssn.login", function () {
			$scope.loggedin = sessionService.isLoggedin();

			if (!$scope.loggedin) {
				$scope.user = nullUser;
			}
		});

		$scope.$on("ssn.ownLoaded", function () {
			var user;
			step(function () {
				if ($scope.loggedin) {
					user = userService.getown();
					user.loadBasicData(this);
				}
			}, h.sF(function () {
				$scope.user = user.data;
				$scope.loading = false;

				console.log("Own Name loaded:" + (new Date().getTime() - startup));
			}));
		});

		$scope.sidebarActive = false;
		$scope.searchActive = false;

		$scope.lostConnection = false;

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

		$scope.toggleSidebar = function() {
			$scope.sidebarActive = !$scope.sidebarActive;
			$scope.searchActive = false;
		};

		function updateCssClass() {
			if (!$scope.loading) {
				$scope.cssClass = cssService.getClass();
			} else {
				$scope.cssClass = "loading";
			}
		}

		$scope.mobileActivateView = function() {
			$scope.sidebarActive = false;
			$scope.searchActive = false;
			updateCssClass();
		};

		$scope.visitUserProfile = function (user) {
			user.user.visitProfile();
			$scope.searchActive = false;
			$scope.sidebarActive = false;
		};

		$scope.toggleSearch = function() {
			$scope.searchActive = !$scope.searchActive;
			$scope.sidebarActive = false;
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

	rootController.$inject = ["$scope", "$http", "localize", "ssn.socketService", "ssn.sessionService", "ssn.sessionHelper", "ssn.userService", "ssn.cssService", "ssn.messageService", "ssn.trustService", "ssn.friendsService"];

	controllerModule.controller("ssn.rootController", rootController);
});
