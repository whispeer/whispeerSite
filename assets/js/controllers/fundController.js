/**
* setupController
**/

define(["whispeerHelper", "asset/state", "libs/qr", "libs/filesaver", "controllers/controllerModule"], function (h, State, qr, saveAs, controllerModule) {
	"use strict";

	function fundController($scope, cssService) {
		cssService.setClass("fundView");

		$scope.paypal = false;
		$scope.bank = false;

		$scope.togglePaypal = function() {
			$scope.paypal = !$scope.paypal;
			$scope.bank = false;
		};

		$scope.toggleBank = function() {
			$scope.bank = !$scope.bank;
			$scope.paypal = false;
		};
	}

	fundController.$inject = ["$scope", "ssn.cssService"];

	controllerModule.controller("ssn.fundController", fundController);
});
