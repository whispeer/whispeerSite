/**
* sessionController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function rootController($scope, sessionService, sessionHelper, userService, cssService, messageService, friendsService) {
		$scope.loggedin = false;
		$scope.mobile = true;
		$scope.user = {};
		$scope.friends = friendsService.data;

		$scope.user.name = "";
		$scope.user.image = "/assets/img/user.png";
		$scope.user.id = "0";

		$scope.$on("ssn.login", function () {
			$scope.loggedin = sessionService.isLoggedin();
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

				console.log("Own Name loaded:" + (new Date().getTime() - startup));
			}));
			messageService.listenNewMessage(function(m) {
				if (!m.isOwn()) {
					document.getElementById("sound").play();
				}
			});
		});

		$scope.sidebarActive = false;
		$scope.searchActive = false;

		$scope.toggleSidebar = function() {
			$scope.sidebarActive = !$scope.sidebarActive;
			$scope.searchActive = false;
		};

		$scope.mobileActivateView = function() {
			$scope.sidebarActive = false;
			$scope.searchActive = false;
			$scope.cssClass = cssService.getClass();
		};
		
		$scope.toggleSearch = function() {
			$scope.searchActive = !$scope.searchActive;
			$scope.sidebarActive = false;
		};

		cssService.addListener(function (newClass) {
			$scope.cssClass = newClass;
		});

		$scope.cssClass = cssService.getClass();

		$scope.logout = function () {
			sessionHelper.logout();
		};
	}

	rootController.$inject = ["$scope", "ssn.sessionService", "ssn.sessionHelper", "ssn.userService", "ssn.cssService", "ssn.messageService", "ssn.friendsService"];

	return rootController;
});