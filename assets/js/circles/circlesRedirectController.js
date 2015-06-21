/**
* circlesRedirectController
**/

define(["circles/circlesModule"], function (circlesModule) {
	"use strict";

	function circlesRedirectController($scope, $state, cssService) {
		cssService.setClass("circlesView", true);

		function checkState() {
			var stateName = $state.current.name;
			if (stateName === "app.circles.list" && !$scope.mobile) {
				$state.go("app.circles.new");
			}

			if (stateName === "app.circles") {
				if ($scope.mobile) {
					$state.go("app.circles.list");
				} else {
					$state.go("app.circles.new");
				}
			}
		}

		checkState();

		$scope.$watch(function () {
			return $scope.mobile;
		}, checkState);
	}

	circlesRedirectController.$inject = ["$scope", "$state", "ssn.cssService"];

	circlesModule.controller("ssn.circlesRedirectController", circlesRedirectController);
});
