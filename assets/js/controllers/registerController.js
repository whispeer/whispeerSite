/**
* loginController
**/

define(["step", "asset/resizable"], function (step, Resizable) {
	"use strict";

	function registerController($scope, sessionHelper, sessionService, cssService) {
		cssService.setClass("registerView");
		
		var ENDSIZE = 250;
		var image, paintRatio, resizable;

		$scope.imageChange = function (e) {
			var originalCanvasE = document.getElementById("original");
			var originalCanvas = originalCanvasE.getContext("2d");
			var canvasW = 600;
			var canvasH = 300;

			originalCanvasE.width = canvasW;
			originalCanvasE.height = canvasH;

			originalCanvas.clearRect (0, 0, canvasW, canvasH);

			var file = e.target.files[0];
			if (!file.type.match(/image.*/i)) {
				$scope.validImage = false;
				return;
			}

			$scope.validImage = true;

			var url;

			image = new Image();
			image.addEventListener("load", function () {
				var width = image.width;
				var height = image.height;

				paintRatio = Math.min(canvasW / width, canvasH / height);
				var paintWidth = paintRatio * width;
				var paintHeight = paintRatio * height;

				var paintLeft = (canvasW - paintWidth) / 2;
				var paintTop = (canvasH - paintHeight) / 2;

				var offset = jQuery(originalCanvasE).offset();

				var top = offset.top + paintTop;
				var left = offset.left + paintLeft;

				resizable = new Resizable({
					element: originalCanvasE.parentElement,
					top: top,
					left: left,
					bottom: top + paintHeight,
					right: left + paintWidth,
					initSize: 50,
					minSize: 50
				});

				originalCanvas.drawImage(image, 0, 0, width, height, paintLeft, paintTop, paintWidth, paintHeight);
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
		
		$scope.nextRegisterStep = function nextRegisterStep() {
			$scope.registerState.step++;
		};
		
		$scope.prevRegisterStep = function prevRegisterStep() {
			$scope.registerState.step--;
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

		function loadImageData() {
			var doneCanvasE = document.createElement("canvas");

			doneCanvasE.width = ENDSIZE;
			doneCanvasE.height = ENDSIZE;

			var doneCanvas = doneCanvasE.getContext("2d");

			var pos = resizable.getRelativePosition();
			resizable.kill();

			var ratio = (1/paintRatio);
			var get =  ratio * pos.width;
			doneCanvas.drawImage(image, ratio * pos.left, ratio * pos.top, get, get, 0, 0, ENDSIZE, ENDSIZE);

			return doneCanvasE.toDataURL();
		}

		$scope.register = function doRegisterC() {
			var profile = {
				pub: {},
				priv: {}
			};

			var imageData = loadImageData();

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