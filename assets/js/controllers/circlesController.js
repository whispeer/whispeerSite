/**
* circlesController
**/

define(["whispeerHelper"], function (h) {
	"use strict";

	function circlesController($scope, cssService, circleService) {
		cssService.setClass("circlesView");
		$scope.getLength = function(obj) {
			return obj.length;
		};

		$scope.shortenString = function(string, length) {
			if (string.length > length) {
				return string.substr(0, length-3) + "...";
			}
			return string;
		};

		circleService.loadAll(function (e) {
			if (e) {
				debugger;
			}
		});

		$scope.selectedUsers = [];

		$scope.$on("selectionChange", function (event, newSelection) {
			$scope.selectedUsers = newSelection;
		});

		$scope.createNew = function (name) {
			circleService.create(name, h.sF(function (theCircle) {
				var i, ids = $scope.selectedUsers.map(h.qm("id"));

				for (i = 0; i < ids.length; i += 1) {
					theCircle.addPerson(ids[i], h.sF(h.nop));
				}
			}));
		};

		$scope.showCircle = true;
		$scope.circles = circleService.data.circles;
		$scope.thisCircle = {
			"id": "1",
			"name":	"Liste der geilsten Personen auf der Ganzen Welt, oh mein Gott bin ich hipster! xoxoxoxo dreieck!!",
			"image": "/assets/img/user.png",
			"persons": [
				{
					"id": "1",
					"name":"Testy Test",
					"samefriends":	"23",
					"image":	"/assets/img/user.png"
				}
			]
		};
	}

	circlesController.$inject = ["$scope", "ssn.cssService", "ssn.circleService"];

	return circlesController;
});