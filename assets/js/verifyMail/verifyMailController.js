var errorService = require("services/error.service").errorServiceInstance;
var socketService = require("services/socket.service").default;

"use strict";

const Bluebird = require('bluebird');
const SuccessState = require('asset/state');
const controllerModule = require('verifyMail/verifyMailModule');

function verifyMailController($scope) {
    $scope.mails = true;

    var verifying = new SuccessState.default();
    $scope.verifying = verifying;

    var parts = window.location.pathname.split("/");
    parts = parts.filter(function (v) {
        return v !== "";
    });

    $scope.challenge = "";

    if (parts.length > 2) {
        $scope.challenge = parts.pop();
    }

    $scope.verify = function (mailsEnabled) {
        verifying.reset();
        verifying.pending();

        var verifyPromise = socketService.emit("verifyMail", {
            challenge: $scope.challenge,
            mailsEnabled: mailsEnabled
        }).then(function (data) {
            if (data.mailVerified) {
                verifying.success();
            } else {
                $scope.verifying.failed();
            }
        });

        errorService.failOnErrorPromise(verifying, verifyPromise);
    };
}

verifyMailController.$inject = ["$scope"];

controllerModule.controller("ssn.verifyMailController", verifyMailController);
