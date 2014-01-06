/**
* circlesController
**/

define(["whispeerHelper"], function (h) {
	"use strict";

	function circlesController($scope, cssService, circleService) {
		$scope.circleid = 0;
		$scope.showCircle = false;
		$scope.thisCircle = {};

		$scope.circles = circleService.data.circles;

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
			var ids = $scope.selectedUsers.map(h.qm("id"));
			circleService.create(name, h.sF(h.nop), ids);
		};

		$scope.unloadCircle = function () {
			$scope.circleLoaded = false;
			$scope.thisCircle = {};
			$scope.circleid = 0;
		};

		$scope.loadActiveCircle = function (id) {
			$scope.circleLoaded = true;
			$scope.circleid = id;

			circleService.get(id).loadPersons(function () {
				console.log("loaded");
			});
			$scope.thisCircle = circleService.get(id).data;
		};

		$scope.showCirlce = false;

		$scope.showCircleDo = function() {
			$scope.showCircle = true;
		};

		$scope.showCircleUnDo = function() {
			$scope.showCircle = false;
		};
	}

	circlesController.$inject = ["$scope", "ssn.cssService", "ssn.circleService"];

	return circlesController;
});