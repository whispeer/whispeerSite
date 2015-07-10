/**
* setupController
**/

define(["step", "whispeerHelper", "asset/state", "libs/qr", "libs/filesaver", "controllers/controllerModule"], function (step, h, State, qr, saveAs, controllerModule) {
	"use strict";

	function patronizeController($scope, cssService) {
		cssService.setClass("patronizeView");

		$scope.paypal = false;
		$scope.bank = false;

		$scope.togglePaypal = function() {
			$scope.paypal = !$scope.paypal;
			$scope.bank = false;
		}

		$scope.toggleBank = function() {
			$scope.bank = !$scope.bank;
			$scope.paypal = false;
		}
	}

	patronizeController.$inject = ["$scope", "ssn.cssService"];

	controllerModule.controller("ssn.patronizeController", patronizeController);
});