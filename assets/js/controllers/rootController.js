/**
* sessionController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function getVersionString(data) {
		if (typeof data === "object" && !(data instanceof Array)) {
			var keys = Object.keys(data);
			keys.sort();

			var newest = keys[keys.length - 1];

			return newest + "." + getVersionString(data[newest]);
		} else {
			return "";
		}
	}

	function rootController($scope, $timeout, $http, socketService, sessionService, sessionHelper, userService, cssService, messageService, friendsService) {
		var buildDate = "20140412";

		$http({ method: "GET", url: "changelog.json?t=" + (new Date()).getTime(), cache: false }).success(function (data) {
			var version = getVersionString(data);
			version = version.substr(0, version.length - 1);
			
			$scope.version = version + "-" + buildDate;
		});

		$scope.version = "";
		$scope.loggedin = false;

		function updateMobile() {
			var old = $scope.mobile;
			$scope.mobile = jQuery(window).width() <= 1023;

			if ($scope.mobile !== old) {
				$timeout(h.nop);
			}
		}

		jQuery(window).resize(updateMobile);
		updateMobile();

		var nullUser = {
			name: "",
			basic: {
				image: "/assets/img/user.png"
			},
			id: 0
		};

		$scope.user = nullUser;
		$scope.friends = friendsService.data;

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

				console.log("Own Name loaded:" + (new Date().getTime() - startup));
			}));
		});

		$scope.sidebarActive = false;
		$scope.searchActive = false;

		$scope.$on("elementSelected", function () {
			$scope.searchActive = false;
			$scope.sidebarActive = false;
		});

		$scope.lostConnection = false;

		socketService.on("disconnect", function () {
			$scope.$apply(function () {
				$scope.lostConnection = true;
			});
		});

		socketService.on("reconnect", function () {
			$scope.$apply(function () {
				$scope.lostConnection = false;
			});
		});

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

		jQuery(document.body).removeClass("loading");

		$scope.cssClass = cssService.getClass();

		$scope.logout = function () {
			sessionHelper.logout();
		};
	}

	rootController.$inject = ["$scope", "$timeout", "$http", "ssn.socketService", "ssn.sessionService", "ssn.sessionHelper", "ssn.userService", "ssn.cssService", "ssn.messageService", "ssn.friendsService"];

	return rootController;
});