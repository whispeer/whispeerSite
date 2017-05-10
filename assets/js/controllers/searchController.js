var cssService = require("services/css.service").default;

define(["controllers/controllerModule"], function (controllerModule) {
	"use strict";

	function searchController($scope, $state) {
		cssService.setClass("searchView", true);

		$scope.visitUserProfile = function (user) {
			$state.go("app.user.info", {
				identifier: user.getNickname()
			});
			$scope.closeSidebar();
		};
	}

	searchController.$inject = ["$scope", "$state"];

	controllerModule.controller("ssn.searchController", searchController);
});
