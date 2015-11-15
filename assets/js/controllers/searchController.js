define(["controllers/controllerModule"], function (controllerModule) {
	"use strict";

	function searchController($scope, cssService) {
		cssService.setClass("searchView", true);

		$scope.visitUserProfile = function (user) {
			user.user.visitProfile();
			$scope.closeSidebar();
		};
	}

	searchController.$inject = ["$scope", "ssn.cssService"];

	controllerModule.controller("ssn.searchController", searchController);
});
