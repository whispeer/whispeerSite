/**
* messagesController
**/

define(["messages/messagesModule"], function (messagesModule) {
	"use strict";

	function messagesController($scope, $rootScope, $state, cssService) {
		cssService.setClass("messagesView", true);

		function checkState() {
			var stateName = $state.current.name;
			if (stateName === "app.messages.list" && !$scope.mobile) {
				$state.go("app.messages.new");
			}

			if (stateName === "app.messages") {
				if ($scope.mobile) {
					$state.go("app.messages.list");
				} else {
					$state.go("app.messages.new");
				}
			}
		}

		checkState();

		$rootScope.$on("$stateChangeSuccess", checkState);

		$scope.$watch(function () {
			return $scope.mobile;
		}, checkState);
	}

	messagesController.$inject = ["$scope", "$rootScope", "$state", "ssn.cssService"];

	messagesModule.controller("ssn.messagesRedirectController", messagesController);
});
