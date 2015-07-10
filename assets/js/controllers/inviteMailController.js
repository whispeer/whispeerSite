/**
* inviteController
**/

define(["step", "whispeerHelper", "asset/state", "controllers/controllerModule"], function (step, h, State, controllerModule) {
	"use strict";

	function inviteController($scope, socketService, errorService, localize) {
		$scope.inviteMails = [""];

		var inviteMailState = new State();
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

			step(function () {
				var mailsToSend = mails.filter(function (e) {
					return h.isMail(e);
				});

				socketService.emit("invites.byMail", {
					mails: mailsToSend,
					name: name,
					language: localize.getLanguage()
				}, this);
			}, h.sF(function () {
				$scope.inviteMails = $scope.inviteMails.filter(function (e) {
					return !h.isMail(e);
				});

				this.ne();
			}), errorService.failOnError(inviteMailState));
		};

		$scope.removeInput = function (i) {
			$scope.inviteMails.splice(i, 1);
		};
	}

	inviteController.$inject = ["$scope", "ssn.socketService", "ssn.errorService", "localize"];

	controllerModule.controller("ssn.inviteMailController", inviteController);
});
