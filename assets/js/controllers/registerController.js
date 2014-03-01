/**
* loginController
**/

define(["step", "asset/resizableImage", "asset/observer"], function (step, ResizableImage, Observer) {
	"use strict";

	function registerController($scope, sessionHelper, sessionService, cssService) {
		var resizableImage = new ResizableImage();
		var observer = new Observer();
		cssService.setClass("registerView");
		
		var ENDSIZE = 250;
		var CANVASWIDTH = 600, CANVASHEIGHT = 300;

		$scope.imageChange = resizableImage.callBackForFileLoad(function () {
			resizableImage.paintImageOnCanvasWithResizer({
				element: document.getElementById("original"),
				width: CANVASWIDTH,
				height: CANVASHEIGHT
			});
		});

		observer.listen(function () {
			return $scope.nicknameCheck && $scope.password == $scope.password2;
		}, "stepLeave1");

		observer.listen(function () {
			resizableImage.removeResizable();
		}, "stepLeave3");

		observer.listen(function () {
			resizableImage.repaint({
				element: document.getElementById("original"),
				width: CANVASWIDTH,
				height: CANVASHEIGHT
			});
		}, "stepLoaded3");

		$scope.password = "";
		$scope.password2 = "";

		$scope.mail = "";
		$scope.mail2 = "";

		$scope.nickname = "";
		$scope.nicknameCheckLoading = false;
		$scope.nicknameCheck = false;
		$scope.nicknameCheckError = false;

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
		
		function falseAnd(a, b) {
			return a !== false && b !== false;
		}

		function setStep(step) {
			if (step > 0 && step < 4) {
				var oldStep = $scope.registerState.step;
				var result1 = observer.notify(oldStep, "stepLeave", falseAnd);
				var result2 = observer.notify(oldStep, "stepLeave" + oldStep, falseAnd);

				if (result1 !== false && result2 !== false) {
					$scope.registerState.step = step;
					observer.notify(step, "stepChanged");
					observer.notify(step, "stepChanged" + step);
				}
			}
		}

		$scope.stepLoaded = function stepLoadedF() {
			var step = $scope.registerState.step;
			observer.notify(step, "stepLoaded");
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

		$scope.register = function doRegisterC() {
			var settings = {
				privacy: {
					basic: {
						firstname: {
							encrypt: false,
							visibility: ["always:allfriends"]
						},
						lastname: {
							encrypt: false,
							visibility: ["always:allfriends"]
						}
					},
					location: {
						encrypt: true,
						visibility: ["always:allfriends"]
					},
					birthday: {
						encrypt: true,
						visibility: ["always:allfriends"]
					},
					relationship: {
						encrypt: true,
						visibility: ["always:allfriends"]
					},
					education: {
						encrypt: true,
						visibility: ["always:allfriends"]
					},
					work: {
						encrypt: true,
						visibility: ["always:allfriends"]
					},
					gender: {
						encrypt: true,
						visibility: ["always:allfriends"]
					},
					languages: {
						encrypt: true,
						visibility: ["always:allfriends"]
					}
				},
				sharePosts: ["always:allfriends"]
			};

			var profile = {
				pub: {},
				priv: {
					scope: "always:allfriends"
				}
			};

			var imageData = resizableImage.getImageData(ENDSIZE);

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
					settings.privacy[cur.topic][cur.name].encrypt = cur.encrypted;
				}
			}

			if (imageData) {
				profile.pub.image = imageData;
			}

			sessionHelper.register($scope.nickname, $scope.mail, $scope.password, profile,  settings, function () {
				console.log("register done!");
				console.log(arguments);
				resizableImage.removeResizable();
			});

			Observer.call(this);
		};
	}

	registerController.$inject = ["$scope", "ssn.sessionHelper", "ssn.sessionService", "ssn.cssService"];

	return registerController;
});