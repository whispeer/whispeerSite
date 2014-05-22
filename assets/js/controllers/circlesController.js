/**
* circlesController
**/

define(["whispeerHelper"], function (h) {
	"use strict";

	function circlesController($scope, cssService, circleService) {
		$scope.circleid = 0;
		$scope.showCircle = !$scope.mobile;
		
		$scope.editingTitle = {
			"success":		true,
			"failure":		false,
			"operation":	false,
			"active":		false
		}
		
		$scope.editTitle = function () {
			$scope.editingTitle.active = true;
		};
		
		$scope.saveTitle = function () {
			$scope.editingTitle.success = true;
			$scope.editingTitle.active = false;
		}

		$scope.thisCircle = {};

		$scope.circles = circleService.data.circles;

		cssService.setClass("circlesView");
		
		$scope.getLength = function(obj) {
			return obj.length;
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

			$scope.showCircle = !$scope.mobile;
		};

		$scope.unloadCircle = function () {
			$scope.showCircle = true;

			$scope.circleLoaded = false;
			$scope.thisCircle = {};
			$scope.circleid = 0;
		};

		$scope.loadActiveCircle = function (id) {
			$scope.showCircle = true;
			$scope.circleLoaded = true;
			$scope.circleid = id;

			circleService.get(id).loadPersons(function () {
				console.log("loaded");
			});
			$scope.thisCircle = circleService.get(id).data;
		};
	}

	circlesController.$inject = ["$scope", "ssn.cssService", "ssn.circleService"];

	return circlesController;
});