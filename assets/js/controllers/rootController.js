/**
* sessionController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function rootController($scope, sessionService, sessionHelper, userService, cssService, messageService, friendsService) {
		$scope.loggedin = false;

		$scope.user = {};
		$scope.friends = friendsService.data;

		$scope.user.name = "";
		$scope.user.image = "/assets/img/user.png";
		$scope.user.id = "0";

		$scope.$on("ssn.login", function () {
			$scope.loggedin = sessionService.isLoggedin();
		});

		$scope.$on("ssn.ownLoaded", function () {
			step(function () {
				if ($scope.loggedin) {
					var user = userService.getown();
					$scope.user.id = user.getID();
					$scope.user.url = user.getUrl();
					this.parallel.unflatten();

					user.getName(this.parallel());
					user.getImage(this.parallel());
				}
			}, h.sF(function (name, image) {
				$scope.user.name = name;
				$scope.user.image = image;

				console.log("Own Name loaded:" + (new Date().getTime() - startup));
			}));
			messageService.listenNewMessage(function(m) {
				if (!m.isOwn()) {
					document.getElementById("sound").play();
				}
			});
		});
		
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