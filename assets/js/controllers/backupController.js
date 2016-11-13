/**
* setupController
**/

define(["asset/state", "libs/qr", "libs/filesaver", "controllers/controllerModule", "bluebird"], function (State, qr, saveAs, controllerModule, Bluebird) {
	"use strict";

	function setupController($scope, $location, cssService, errorService, userService) {
		cssService.setClass("setupView");

		$scope.backupFailed = false;

		$scope.goToNext = function () {
			$location.path("/setup");
		};

		function createBackup() {
			var image, keyData;

			return userService.getown().createBackupKey()
			.then(function (_keyData) {
				keyData = _keyData;

				return Bluebird.resolve(function (resolve) {
					image = new Image(100, 200);

					image.onload = resolve;

					qr.image({
						image: image,
						value: keyData,
						size: 7,
						level: "L"
					});
				});
			}).then(function () {
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

				return c;
			});
		}

		var backupBlob;
		var backupCanvas;

		var loadBackupPromise = Bluebird.try(function () {
			return createBackup();
		}).then(function (canvas) {
			backupCanvas = canvas;

			return new Bluebird(function (resolve) {
				canvas.toBlob(resolve);
			});
		}).then(function (blob) {
			backupBlob = blob;
		}).catch(function (e) {
			errorService.criticalError(e);
			$scope.backupFailed = true;

			throw e;
		});

		$scope.downloadBackup = function () {
			loadBackupPromise.then(function () {
				saveAs(backupBlob, "whispeer-backup-" + userService.getown().getNickname() + ".png");

				$scope.goToNext();
			}).catch(errorService.criticalError);
		};

		$scope.printBackup = function () {
			loadBackupPromise.then(function () {
				backupCanvas.className = "printCanvas";
				document.body.appendChild(backupCanvas);

				window.print();
				$scope.goToNext();
			}).catch(errorService.criticalError);
		};
	}

	setupController.$inject = ["$scope", "$location", "ssn.cssService", "ssn.errorService", "ssn.userService", "ssn.settingsService"];

	controllerModule.controller("ssn.backupController", setupController);
});
