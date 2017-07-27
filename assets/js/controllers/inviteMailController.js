/**
* inviteController
**/

var socketService = require("services/socket.service").default;
var errorService = require("services/error.service").errorServiceInstance;
var localize = require("i18n/localizationConfig");

"use strict";

const Bluebird = require("bluebird");
const h = require("whispeerHelper").default;
const State = require("asset/state");
const controllerModule = require("controllers/controllerModule");

function inviteController($scope) {
	$scope.inviteMails = [""];

	var inviteMailState = new State.default();
	$scope.inviteMailState = inviteMailState.data;

	$scope.addInviteMail = function () {
		$scope.inviteMails.push("");
	};

	$scope.empty = function (val) {
		return val === "" || !h.isset(val);
	};

	$scope.isMail = function (mail) {
		return h.isMail(mail);
	};

	$scope.inviteUsers = function (name, mails) {
		inviteMailState.pending();

		var inviteMailPromise = Bluebird.resolve(mails).filter(function(e) {
			return h.isMail(e);
		}).then(function(mailsToSend) {
			return socketService.emit("invites.byMail", {
				mails: mailsToSend,
				name: name,
				language: localize.getLanguage()
			});
		}).then(function () {
            // to too sure about changing this filter to a promise
            // as this works on $scope.
			$scope.inviteMails = $scope.inviteMails.filter(function (e) {
				return !h.isMail(e);
			});
		});

		return errorService.failOnErrorPromise(inviteMailState, inviteMailPromise);
	};

	$scope.removeInput = function (i) {
		$scope.inviteMails.splice(i, 1);
	};
}

inviteController.$inject = ["$scope"];

controllerModule.controller("ssn.inviteMailController", inviteController);
