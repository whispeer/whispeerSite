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

	function rootController($scope, $timeout, $http, sessionService, sessionHelper, userService, cssService, messageService, friendsService) {
		var buildDate = "20140404";

		$http({ method: "GET", url: "changelog.json", cache: false }).success(function (data) {
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
			messageService.listenNewMessage(function(m) {
				if (!m.isOwn()) {
					document.getElementById("sound").play();

					var title = "Nachricht von " + m.data.sender.basic.shortname;
					document.title = title;
				}
			});
		});

		$scope.sidebarActive = false;
		$scope.searchActive = false;

		$scope.$on("elementSelected", function () {
			$scope.searchActive = false;
			$scope.sidebarActive = false;
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

		$scope.cssClass = cssService.getClass();

		$scope.logout = function () {
			sessionHelper.logout();
		};
	}

	rootController.$inject = ["$scope", "$timeout", "$http", "ssn.sessionService", "ssn.sessionHelper", "ssn.userService", "ssn.cssService", "ssn.messageService", "ssn.friendsService"];

	return rootController;
});