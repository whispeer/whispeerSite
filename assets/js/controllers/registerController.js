/**
* loginController
**/

define(["step", "asset/resizable", "asset/observer"], function (step, Resizable, Observer) {
	"use strict";

	function registerController($scope, sessionHelper, sessionService, cssService) {
		var observer = new Observer();
		cssService.setClass("registerView");
		
		var ENDSIZE = 250;
		var image, paintRatio, resizable, CANVASWIDTH = 600, CANVASHEIGHT = 300, position;

		function paintImageOnCanvas() {
			if (image) {
				var originalCanvasE = document.getElementById("original");
				var originalCanvas = originalCanvasE.getContext("2d");

				originalCanvasE.width = CANVASWIDTH;
				originalCanvasE.height = CANVASHEIGHT;

				originalCanvas.clearRect (0, 0, CANVASWIDTH, CANVASHEIGHT);

				var width = image.width;
				var height = image.height;

				paintRatio = Math.min(CANVASWIDTH / width, CANVASHEIGHT / height);
				var paintWidth = paintRatio * width;
				var paintHeight = paintRatio * height;

				var paintLeft = (CANVASWIDTH - paintWidth) / 2;
				var paintTop = (CANVASHEIGHT - paintHeight) / 2;

				var offset = jQuery(originalCanvasE).offset();

				var top = offset.top + paintTop;
				var left = offset.left + paintLeft;

				resizable = new Resizable({
					element: originalCanvasE.parentElement,
					boundary: {
						top: top,
						left: left,
						bottom: top + paintHeight,
						right: left + paintWidth,
					},
					size: {
						init: 50,
						min: 50
					},
					position: position
				});

				originalCanvas.drawImage(image, 0, 0, width, height, paintLeft, paintTop, paintWidth, paintHeight);
			}
		}

		$scope.imageChange = function (e) {
			var file = e.target.files[0];
			if (!file.type.match(/image.*/i)) {
				$scope.validImage = false;
				return;
			}

			$scope.validImage = true;

			var url;

			image = new Image();
			image.addEventListener("load", paintImageOnCanvas);

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

		observer.listen(function () {
			if (resizable) {
				position = resizable.getPosition();
				resizable.kill();
			}
		}, "stepLeave3");
		observer.listen(paintImageOnCanvas, "stepLoaded3");

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
		
		function setStep(step) {
			if (step > 0 && step < 4) {
				var oldStep = $scope.registerState.step;
				observer.notify(oldStep, "stepLeave");
				observer.notify(oldStep, "stepLeave" + oldStep);

				$scope.registerState.step = step;
				observer.notify(step, "stepChanged");
				observer.notify(step, "stepChanged" + step);

			}
		}

		$scope.stepLoaded = function stepLoadedF() {
			var step = $scope.registerState.step;
			observer.notify(step, "stepLoaded" + step);
		};

		$scope.nextRegisterStep = function nextRegisterStep() {
			setStep($scope.registerState.step+1);
		};
		
		$scope.prevRegisterStep = function prevRegisterStep() {
			setStep($scope.registerState.step-1);
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

			Observer.call(this);
		};
	}

	registerController.$inject = ["$scope", "ssn.sessionHelper", "ssn.sessionService", "ssn.cssService"];

	return registerController;
});