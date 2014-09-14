/**
* setupController
**/

define(["step", "whispeerHelper", "asset/state", "libs/qr"], function (step, h, State, qr) {
	"use strict";

	function setupController($scope, cssService, errorService, userService) {
		cssService.setClass("setupView");

		var saveSetupState = new State();
		$scope.saveSetupState = saveSetupState.data;

		$scope.downloadBackup = function () {
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

				console.log(keyData);

				var a = document.createElement("a");
				a.href = c.toDataURL();
				a.download = "whispeer-backup.png";
				a.click();
			}), errorService.criticalError);
			//create backup key
			//encrypt main key w/ backup key
			//download backup key
		};
	}

	setupController.$inject = ["$scope", "ssn.cssService", "ssn.errorService", "ssn.userService"];

	return setupController;
});