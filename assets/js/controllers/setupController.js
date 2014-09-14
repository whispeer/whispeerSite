/**
* setupController
**/

define(["step", "whispeerHelper", "asset/state", "libs/qr"], function (step, h, State, qr) {
	"use strict";

	function setupController($scope, cssService, errorService, userService) {
		cssService.setClass("setupView");

		var saveSetupState = new State();
		$scope.saveSetupState = saveSetupState.data;

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
				ctx.fillText("https://beta.whispeer.de/recovery", 10, image.height + 150);

				this.ne(c);
			}), cb);
		}

		$scope.downloadBackup = function () {
			step(function () {
				createBackup(this);
			}, h.sF(function (canvas) {
				var a = document.createElement("a");
				a.href = canvas.toDataURL();
				a.download = "whispeer-backup.png";
				a.click();
			}), errorService.criticalError);
		};

		$scope.printBackup = function () {
			step(function () {
				createBackup(this);
			}, h.sF(function (canvas) {
				canvas.className = "printCanvas";
				document.body.appendChild(canvas);

				window.print();
			}), errorService.criticalError);
		};
	}

	setupController.$inject = ["$scope", "ssn.cssService", "ssn.errorService", "ssn.userService"];

	return setupController;
});