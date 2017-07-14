/**
* setupController
**/

var cssService = require("services/css.service").default;

"use strict";

const h = require("whispeerHelper").default;
const State = require("asset/state");
const qr = require("libs/qr");
const saveAs = require("libs/filesaver");
const controllerModule = require("controllers/controllerModule");

function fundController($scope) {
    cssService.setClass("fundView");

    $scope.paypal = false;
    $scope.bank = false;

    $scope.togglePaypal = function() {
        $scope.paypal = !$scope.paypal;
        $scope.bank = false;
    };

    $scope.toggleBank = function() {
        $scope.bank = !$scope.bank;
        $scope.paypal = false;
    };
}

fundController.$inject = ["$scope"];

controllerModule.controller("ssn.fundController", fundController);
