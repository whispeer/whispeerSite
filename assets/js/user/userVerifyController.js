/**
* userController
**/

define(["step", "whispeerHelper", "bluebird", "asset/resizableImage", "asset/state", "user/userModule"], function (step, h, Promise, ResizableImage, State, userModule) {
	"use strict";

	function userController($scope, $stateParams, $timeout, cssService, errorService, userService) {
		var identifier = $stateParams.identifier;
		var userObject;

		var saveUserState = new State();
		$scope.saveUserState = saveUserState.data;

		$scope.user = {};

		$scope.loading = true;
		$scope.notExisting = false;

		var verifyState = new State();
		$scope.verifyingUser = verifyState.data;

		$scope.qr = {
			enabled: false
		};

		$scope.verifyCode = false;
		$scope.$watch(function () { return $scope.qr.available; }, function (isAvailable) {
			if (isAvailable === false) {
				$scope.verifyCode = true;
			}
		});

		$scope.verifyWithCode = function () {
			$scope.verifyCode = true;
		};

		$scope.resetVerifcationMethod = function () {
			$scope.verifyCode = false;
			$scope.qr.enabled = false;
		};

		$scope.verifyWithQrCode = function () {
			$scope.qr.enabled = true;
		};

		$scope.givenPrint = ["", "", "", ""];
		$scope.faEqual = function (val1, val2) {
			if (val1.length < val2.length) {
				return "";
			}

			if (val1 === val2) {
				return "fa-check";
			} else {
				return "fa-times";
			}
		};

		function partitionInput() {
			var fpLength = $scope.fingerPrint[0].length, i;
			var given = $scope.givenPrint.join("");

			for (i = 0; i < $scope.fingerPrint.length - 1; i += 1) {
				$scope.givenPrint[i] = given.substr(i * fpLength, fpLength);
			}

			$scope.givenPrint[$scope.fingerPrint.length - 1] = given.substr(i * fpLength);
		}

		function focusMissingField() {
			var fpLength = $scope.fingerPrint[0].length, i;

			for (i = 0; i < $scope.givenPrint.length; i += 1) {
				if ($scope.givenPrint[i].length < fpLength) {
					jQuery(".verify input")[i].focus();
					return;
				}
			}

			jQuery(".verify input")[$scope.givenPrint.length - 1].focus();
		}

		$scope.nextInput = function (index) {
			$scope.givenPrint[index] = $scope.givenPrint[index].toUpperCase().replace(/[^A-Z0-9]/g, "");

			partitionInput();
			focusMissingField();
		};

		$scope.verify = function (fingerPrint) {
			verifyState.pending();
			if (typeof fingerPrint.join === "function") {
				fingerPrint = fingerPrint.join("");
			}

			step(function () {
				var ok = userObject.verifyFingerPrint(fingerPrint, this);	

				if (!ok) {
					this(new Error("wrong code"));
				}
			}, errorService.failOnError(verifyState));
		};

		cssService.setClass("profileView", true);

		step(function () {
			userService.get(identifier, this);
		}, h.sF(function (user) {
			userObject = user;

			var fp = user.getFingerPrint();
			$scope.fingerPrint = [fp.substr(0,13), fp.substr(13,13), fp.substr(26,13), fp.substr(39,13)];

			user.loadFullData(this);
		}), h.sF(function () {
			$scope.user = userObject.data;
			$scope.adv = $scope.user.advanced;

			$scope.loading = false;
		}));
	}

	userController.$inject = ["$scope", "$stateParams", "$timeout", "ssn.cssService", "ssn.errorService", "ssn.userService"];

	userModule.controller("ssn.userVerifyController", userController);
});
