/**
* setupController
**/

define(["step", "whispeerHelper", "asset/state", "libs/qr", "libs/filesaver"], function (step, h, State, qr, saveAs) {
	"use strict";

	function setupController($scope, $location, cssService, errorService, userService, settingsService) {
		cssService.setClass("setupView");

		var saveSetupState = new State();
		$scope.saveSetupState = saveSetupState.data;

		$scope.backupFailed = false;

		$scope.backupClicked = false;
		$scope.backupWarning = false;
		$scope.profileSaved = false;
		$scope.profile = {
			privateName: false,
			firstName: "",
			lastName: "",
			mail: ""
		};

		function makeNamePrivate(cb) {
			step(function () {
				settingsService.getBranch("privacy", this);
			}, h.sF(function (safetySettings) {
				safetySettings = h.deepCopyObj(safetySettings, 4);
				safetySettings.basic = {
					firstname: {
						encrypt: true,
						visibility: ["always:allfriends"]
					},
					lastname: {
						encrypt: true,
						visibility: ["always:allfriends"]
					}
				};
				settingsService.updateBranch("privacy", safetySettings, this);
			}), h.sF(function () {
				settingsService.uploadChangedData(this);
			}), cb);
		}

		step(function () {
			var me = userService.getown();
			$scope.profile.mail = me.getMail();
			me.getName(this);
		}, h.sF(function (names) {
			$scope.profile.firstName = names.firstname;
			$scope.profile.lastName = names.lastname;
		}), errorService.criticalError);

		$scope.saveProfile = function () {
			saveSetupState.pending();

			var me = userService.getown();
			step(function () {
				if ($scope.profile.privateName) {
					makeNamePrivate(this);
				} else {
					this.ne();
				}
			}, h.sF(function () {
				me.setProfileAttribute("basic", {
					firstname: $scope.profile.firstName,
					lastname: $scope.profile.lastName
				}, this);
			}), h.sF(function () {
				me.uploadChangedProfile(this);
			}), h.sF(function () {
				if (h.isMail($scope.profile.mail)) {
					me.setMail($scope.profile.mail, this);
				} else {
					this.ne();
				}
			}), h.sF(function () {
				if ($scope.backupClicked || $scope.backupFailed) {
					$location.path("/main");
				} else {
					$scope.profileSaved = true;
				}
				this.ne();
			}), errorService.failOnError(saveSetupState));
		};

		function createBackup(cb) {
			step(function () {
				userService.getown().createBackupKey(this);
			}, h.sF(function (keyData) {
				var image = new Image(100, 200);
				qr.image({
					image: image,
					value: keyData,
					size: 7,
					level: "L"
				});
				
				var c=document.createElement("canvas");
				c.width = image.width + 200;
				c.height = image.height + 200;

				var ctx=c.getContext("2d");

				ctx.fillStyle = "white";
				ctx.fillRect(0,0,c.width,c.height);

				ctx.drawImage(image,0,0);

				ctx.fillStyle = "black";
				ctx.font="20px Arial";
				ctx.fillText(keyData.substr(0, 26), 10, image.height + 50);
				ctx.fillText(keyData.substr(26), 10, image.height + 75);

				ctx.fillText("whispeer-Passwort vergessen?", 10, image.height + 125);
				ctx.fillText("https://whispeer.de/recovery", 10, image.height + 150);

				this.ne(c);
			}), cb);
		}

		var backupBlob;
		var backupCanvas;

		step(function () {
			createBackup(this);
		}, h.sF(function (canvas) {
			backupCanvas = canvas;
			canvas.toBlob(this.ne);
		}), h.sF(function (blob) {
			backupBlob = blob;
		}), function (e) {
			if (e) {
				errorService.criticalError(e);
				$scope.backupFailed = true;
			}
		});

		$scope.downloadBackup = function () {
			step(function () {
				saveAs(backupBlob, "whispeer-backup.png");
				$scope.backupClicked = true;
			}, errorService.criticalError);
		};

		$scope.printBackup = function () {
			step(function () {
				backupCanvas.className = "printCanvas";
				document.body.appendChild(backupCanvas);

				window.print();
				$scope.backupClicked = true;
			}, errorService.criticalError);
		};
	}

	setupController.$inject = ["$scope", "$location", "ssn.cssService", "ssn.errorService", "ssn.userService", "ssn.settingsService"];

	return setupController;
});