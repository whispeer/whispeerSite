/**
* setupController
**/

var cssService = require("services/css.service").default;
var errorService = require("services/error.service").errorServiceInstance;
var userService = require("user/userService");

"use strict";

const qr = require("libs/qr");
const saveAs = require("libs/filesaver");
const controllerModule = require("controllers/controllerModule");
const Bluebird = require("bluebird");

function setupController($scope, $location) {
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

            return new Bluebird(function (resolve) {
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

setupController.$inject = ["$scope", "$location"];

controllerModule.controller("ssn.backupController", setupController);
