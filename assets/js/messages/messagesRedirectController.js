/**
* messagesController
**/

define(["step", "whispeerHelper", "asset/state", "bluebird", "messages/messagesModule"], function (step, h, State, Bluebird, messagesModule) {
	"use strict";

	function messagesController($scope, $state, localize, cssService) {
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

		$scope.$watch(function () {
			return $scope.mobile;
		}, checkState);
	}

	messagesController.$inject = ["$scope", "$state", "localize", "ssn.cssService"];

	messagesModule.controller("ssn.messagesRedirectController", messagesController);
});
