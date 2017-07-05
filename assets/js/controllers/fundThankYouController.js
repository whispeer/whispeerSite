/**
* setupController
**/

var cssService = require("services/css.service").default;
var errorService = require("services/error.service").errorServiceInstance;
var socketService = require("services/socket.service").default;

"use strict";

const h = require("whispeerHelper").default;
const controllerModule = require('controllers/controllerModule');

function fundThankYouController() {
    cssService.setClass("fundView");

    socketService.emit("user.donated", {}, errorService.criticalError);
}

fundThankYouController.$inject = [];

controllerModule.controller("ssn.fundThankYouController", fundThankYouController);
