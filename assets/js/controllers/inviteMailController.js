/**
* inviteController
**/

define(["bluebird", "whispeerHelper", "asset/state", "controllers/controllerModule"], function (Bluebird, h, State, controllerModule) {
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

	inviteController.$inject = ["$scope", "ssn.socketService", "ssn.errorService", "localize"];

	controllerModule.controller("ssn.inviteMailController", inviteController);
});
