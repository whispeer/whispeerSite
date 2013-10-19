/**
* loginController
**/

define(["step"], function (step) {
	"use strict";

	function registerController($scope, sessionHelper, sessionService, cssService) {
		cssService.setClass("registerView");

		$scope.registrationStep = 1;
		
		var ENDSIZE = 250;

		var imageData;

		$scope.imageChange = function (e) {
			var doneCanvasE = jQuery("#cropped");
			var originalCanvasE = jQuery("#original");

			doneCanvasE.width = ENDSIZE;
			doneCanvasE.height = ENDSIZE;

			var doneCanvas = doneCanvasE.getContext("2d");

			var file = e.target.files[0];
			if (!file.type.match(/image.*/i)) {
				$scope.validImage = false;
				return;
			}

			$scope.validImage = true;

			var url;

			var image = new Image();
			image.addEventListener("load", function () {
				var width = image.width;
				var height = image.height;

				width = width;
				height = height;

				var get = Math.min(width, height);

				doneCanvas.drawImage(image, 0, 0, get, get, 0, 0, ENDSIZE, ENDSIZE);
				imageData = doneCanvasE.toDataURL();
			});

			if (typeof URL !== "undefined") {
				url = URL.createObjectURL(file);
				image.src = url;
			} else if (typeof webkitURL !== "undefined") {
				url = webkitURL.createObjectURL(file);
				image.src = url;
			} else if (typeof FileReader !== "undefined") {
				var reader = new FileReader();
				reader.onload = function (e) {
					image.src = e.target.result;
				};
				reader.readAsDataURL(file);
			} else {
				//da da dam ...
			}
		};

		$scope.password = "";
		$scope.password2 = "";

		$scope.mail = "";
		$scope.mail2 = "";

		$scope.nickname = "";

		$scope.identifier = "";

		$scope.mailCheck = false;
		$scope.mailCheckError = false;
		$scope.mailCheckLoading = false;

		$scope.profileAttributes = [
			{
				topic: "basic",
				name: "firstname",
				placeHolder: "Vorname",
				value: "",
				encrypted: false,
				hoverText: "Vorname!"
			},
			{
				topic: "basic",
				name: "lastname",
				placeHolder: "Nachname",
				value: "",
				encrypted: false
			}
		];

		$scope.validImage = true;

		$scope.showMoreInfo = function showMoreInfo() {
			$scope.loginForm = "moreInfo";
			$scope.registrationStep = 1;
		};
		
		$scope.nextRegisterStep = function nextRegisterStep() {
			$scope.registrationStep++;
		};
		
		$scope.prevRegisterStep = function prevRegisterStep() {
			$scope.registrationStep--;
		};
		
		$scope.passwordStrength = function passwordStrengthC() {
			return sessionHelper.passwordStrength($scope.password);
		};

		$scope.registerFormClick = function formClickF() {
			sessionHelper.startKeyGeneration();
		};

		$scope.acceptIcon = function acceptIconC(value1, value2) {
			if (value1 === value2) {
				return "assets/img/accept.png";
			}

			return "assets/img/fail.png";
		};

		$scope.startKeyGeneration = function startKeyGen1() {
			sessionHelper.startKeyGeneration();
		};

		$scope.mailChange = function mailChange() {
			step(function doMailCheck() {
				var internalMail = $scope.mail;
				$scope.mailCheckLoading = true;
				$scope.mailCheck = false;
				$scope.mailCheckError = false;

				sessionHelper.mailUsed(internalMail, this);
			}, function mailChecked(e, mailUsed) {
				if (e) {
					console.log(e);
				}

				$scope.mailCheckLoading = false;

				if (mailUsed === false) {
					$scope.mailCheck = true;
				} else if (mailUsed === true) {
					$scope.mailCheck = false;
				} else {
					$scope.mailCheckError = true;
				}
			});
		};

		$scope.lock = function lockF(bool) {
			if (bool) {
				return "assets/img/lock_closed.png";
			} else {
				return "assets/img/lock_open.png";
			}
		};

		$scope.red = function redF(bool) {
			if (!bool) {
				return "red";
			} else {
				return "";
			}
		};

		$scope.acceptIconMailFree = function acceptIconMail() {
			if ($scope.mailCheckLoading) {
				return "assets/img/loading.gif";
			}

			if ($scope.mailCheckError === true) {
				return "assets/img/error.png";
			}

			if ($scope.mailCheck) {
				return "assets/img/accept.png";
			}

			if ($scope.mail === "") {
				return "assets/img/accept.png";
			}

			return "assets/img/fail.png";
		};

		$scope.nicknameChange = function nicknameChange() {
			step(function nicknameCheck() {
				var internalNickname = $scope.nickname;
				$scope.nicknameCheckLoading = true;
				$scope.nicknameCheck = false;
				$scope.nicknameCheckError = false;

				sessionHelper.nicknameUsed(internalNickname, this);
			}, function nicknameChecked(e, nicknameUsed) {
				if (e) {
					console.log(e);
				}

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

		$scope.acceptIconNicknameFree = function acceptIconNickname() {
			if ($scope.nicknameCheckLoading) {
				return "assets/img/loading.gif";
			}

			if ($scope.nicknameCheckError === true) {
				return "assets/img/error.png";
			}

			if ($scope.nicknameCheck) {
				return "assets/img/accept.png";
			}

			return "assets/img/fail.png";
		};

		$scope.register = function doRegisterC() {
			var profile = {
				pub: {},
				priv: {}
			};

			var i, cur;
			for (i = 0; i < $scope.profileAttributes.length; i += 1) {
				cur = $scope.profileAttributes[i];

				if (cur.value !== "") {
					if (cur.encrypted === true) {
						if (!profile.priv[cur.topic]) {
							profile.priv[cur.topic] = {};
						}

						profile.priv[cur.topic][cur.name] = cur.value;
					} else {
						if (!profile.pub[cur.topic]) {
							profile.pub[cur.topic] = {};
						}

						profile.pub[cur.topic][cur.name] = cur.value;
					}
				}
			}

			if (imageData) {
				profile.pub.image = imageData;
			}

			sessionHelper.register($scope.nickname, $scope.mail, $scope.password, profile, function () {
				console.log("register done!");
				console.log(arguments);
			});
		};
	}

	registerController.$inject = ["$scope", "ssn.sessionHelper", "ssn.sessionService", "ssn.cssService"];

	return registerController;
});