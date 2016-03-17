/**
* sessionController
**/

define(["step", "whispeerHelper", "config", "controllers/controllerModule"], function (step, h, config, controllerModule) {
	"use strict";

	function rootController($scope, $http, $interval, localize, initService, socketService, sessionService, sessionHelper, userService, cssService, messageService, trustService, friendsService) {
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

		initService.listen(function () {
			var user;
			step(function () {
				user = userService.getown();
				user.loadBasicData(this);
			}, h.sF(function () {
				$scope.user = user.data;
				$scope.loading = false;

				console.log("Own Name loaded:" + (new Date().getTime() - startup));
			}));
		}, "initDone");

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

		function updateCssClass() {
			if (!$scope.loading) {
				$scope.cssClass = cssService.getClass();
			} else {
				$scope.cssClass = "loading";
			}
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

	rootController.$inject = ["$scope", "$http", "$interval", "localize", "ssn.initService", "ssn.socketService", "ssn.sessionService", "ssn.sessionHelper", "ssn.userService", "ssn.cssService", "ssn.messageService", "ssn.trustService", "ssn.friendsService"];

	controllerModule.controller("ssn.rootController", rootController);
});
