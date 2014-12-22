/**
* loginController
**/

define(["step", "whispeerHelper", "asset/state"], function (step, h, State) {
	"use strict";

	function registerController($scope, $timeout, $routeParams, keyStore, errorService, sessionHelper, sessionService, socketService) {
		var inviteCodeState = new State();
		var inviteMailState = new State();
		var registerState = new State();

		$scope.registerState = registerState.data;

		$scope.invite = {
			code: $routeParams.inviteCode || "",
			valid: inviteCodeState.data,
			mailValid: inviteMailState.data,
			request: function (mail) {
				inviteMailState.pending();

				if (!h.isMail(mail)) {
					inviteMailState.failed();
					return;
				}

				step(function () {
					socketService.emit("invites.requestWithMail", { mail: mail }, this);
				}, errorService.failOnError(inviteMailState));
			}
		};

		$scope.$watch(function () {
			return $scope.invite.code;
		}, function (value) {
			if (value.length !== 10) {
				inviteCodeState.failed();
				return;
			}

			inviteCodeState.pending();
			step(function () {
				if (socketService.isConnected()) {
					this();
				} else {
					socketService.once("connect", this.ne);
				}
			}, h.sF(function () {
				sessionHelper.checkInviteCode(value, this);
			}), h.sF(function (valid) {
				if (!valid) {
					throw new Error("code not valid");
				}

				this.ne();
			}), errorService.failOnError(inviteCodeState));
		});

		$scope.password = "";
		$scope.password2 = "";

		$scope.nickname = "";
		$scope.nicknameCheckLoading = false;
		$scope.nicknameCheck = false;
		$scope.nicknameCheckError = false;

		$scope.nickNameError = true;
		$scope.registerFailed = false;

		$scope.agb = false;

		$scope.passwordStrength = function passwordStrengthC() {
			return sessionHelper.passwordStrength($scope.password);
		};

		if ($routeParams.register) {
			$timeout(function () {
				jQuery("#rnickname").focus();
			}, 50);
		}

		var onlyErrors = false;
		$scope.inputsUsed = function () {
			$scope.registerFailed = false;
			onlyErrors = false;
		};

		var timeout;

		$scope.inputUsed = function (checkFunctions) {
			if (timeout) {
				$timeout.cancel(timeout);
			}

			timeout = $timeout(function () {
				if (!$scope.registerFailed) {
					onlyErrors = checkFunctions;
					$scope.registerFailed = true;
				}
			}, 500);
		};

		$scope.registerFormClick = function formClickF() {
			sessionHelper.startKeyGeneration();
		};

		$scope.acceptIcon = function acceptIconC(value1, value2) {
			if (value1 === value2) {
				return "fa-check";
			}

			return "fa-times";
		};

		$scope.startKeyGeneration = function startKeyGen1() {
			sessionHelper.startKeyGeneration();
		};

		$scope.nicknameChange = function nicknameChange() {
			step(function nicknameCheck() {
				var internalNickname = $scope.nickname;
				$scope.nicknameCheckLoading = true;
				$scope.nicknameCheck = false;
				$scope.nicknameCheckError = false;

				sessionHelper.nicknameUsed(internalNickname, this);
			}, function nicknameChecked(e, nicknameUsed) {
				errorService.criticalError(e);

				$scope.nicknameCheckLoading = false;

				if (nicknameUsed === false) {
					$scope.nicknameCheck = true;
				} else if (nicknameUsed === true) {
					$scope.nicknameCheck = false;
				} else {
					$scope.nicknameCheckError = true;
				}
			});
		};

		$scope.showHint = false;

		var errors = [];

		function notPrevious(func) {
			if (onlyErrors && onlyErrors.indexOf(func) === -1) {
				return false;
			}

			var filter = true, result = true;
			errors.filter(function (val) {
				if (onlyErrors) {
					return onlyErrors.indexOf(val) !== -1;
				}

				return true;
			}).filter(function (val) {
				if (val === func) {
					filter = false;
				}
				return filter;
			}).map(function (func) {
				return func();
			}).forEach(function (invalid) {
				if (invalid) {
					result = false;
				}
			});

			return result;
		}

		$scope.empty = function (val) {
			return val === "" || !h.isset(val);
		};

		$scope.nicknameEmpty = function () {
			return notPrevious($scope.nicknameEmpty) && $scope.empty($scope.nickname);
		};

		$scope.nicknameInvalid = function () {
			return notPrevious($scope.nicknameInvalid) && !$scope.empty($scope.nickname) && !h.isNickname($scope.nickname);
		};

		$scope.nicknameUsed = function () {
			return notPrevious($scope.nicknameUsed) && !$scope.empty($scope.nickname) && !$scope.nicknameCheck && !$scope.nicknameCheckLoading;
		};

		$scope.passwordEmpty = function () {
			return notPrevious($scope.passwordEmpty) && $scope.empty($scope.password);
		};

		$scope.passwordToWeak = function () {
			return notPrevious($scope.passwordToWeak) && $scope.passwordStrength() < 1;
		};

		$scope.password2Empty = function () {
			return notPrevious($scope.password2Empty) && $scope.empty($scope.password2);
		};

		$scope.noPasswordMatch = function () {
			return notPrevious($scope.noPasswordMatch) &&  $scope.password !== $scope.password2;
		};

		$scope.isAgbError = function () {
			return notPrevious($scope.isAgbError) && !$scope.agb;
		};

		errors = [
			$scope.nicknameEmpty,
			$scope.nicknameInvalid,
			$scope.nicknameUsed,
			$scope.passwordEmpty,
			$scope.passwordToWeak,
			$scope.password2Empty,
			$scope.noPasswordMatch,
			$scope.isAgbError
		];

		$scope.acceptIconNicknameFree = function acceptIconNickname() {
			if ($scope.nicknameCheckLoading) {
				return "fa-spinner";
			}

			if ($scope.nicknameCheckError === true) {
				return "fa-warning";
			}

			if ($scope.nicknameCheck) {
				return "fa-check";
			}

			return "fa-times";
		};


		$scope.register = function doRegisterC() {
			registerState.pending();
			if ($scope.passwordStrength() === 0 || $scope.password !== $scope.password2 || !$scope.agb || !h.isNickname($scope.nickname)) {
				$scope.registerFailed = true;
				onlyErrors = false;
				registerState.failed();
				return;
			}

			var settings = {};
			var imageBlob;

			var profile = {
				pub: {},
				priv: {},
				nobody: {},
				metaData: {
					scope: "always:allfriends"
				}
			};

			step(function () {
				console.time("register");
				sessionService.setReturnURL("/setup");
				sessionHelper.register($scope.nickname, "", $scope.invite.code, $scope.password, profile, imageBlob, settings, this);
			}, function (e) {
				console.timeEnd("register");
				console.log("register done!");

				this(e);
			}, errorService.failOnError(registerState));
		};
	}

	registerController.$inject = ["$scope", "$timeout", "$routeParams", "ssn.keyStoreService", "ssn.errorService", "ssn.sessionHelper", "ssn.sessionService", "ssn.socketService"];

	return registerController;
});