/**
* setupController
**/

define(["step", "whispeerHelper", "asset/state", "libs/qr", "libs/filesaver", "controllers/controllerModule"], function (step, h, State, qr, saveAs, controllerModule) {
	"use strict";

	function setupController($scope, $location, cssService, errorService, userService) {
		cssService.setClass("setupView");

		$scope.backupFailed = false;

		$scope.goToNext = function () {
			$location.path("/setup");
		};

		function createBackup(cb) {
			var image, keyData;

			step(function () {
				userService.getown().createBackupKey(this);
			}, h.sF(function (_keyData) {
				keyData = _keyData;
				image = new Image(100, 200);

				image.onload = this.ne;

				qr.image({
					image: image,
					value: keyData,
					size: 7,
					level: "L"
				});
			}), h.sF(function () {
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

				$scope.goToNext();
			}, errorService.criticalError);
		};

		$scope.printBackup = function () {
			step(function () {
				backupCanvas.className = "printCanvas";
				document.body.appendChild(backupCanvas);

				window.print();
				$scope.goToNext();
			}, errorService.criticalError);
		};
	}

	setupController.$inject = ["$scope", "$location", "ssn.cssService", "ssn.errorService", "ssn.userService", "ssn.settingsService"];

	controllerModule.controller("ssn.backupController", setupController);
});
