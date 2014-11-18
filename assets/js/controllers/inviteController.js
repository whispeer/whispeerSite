/**
* inviteController
**/

define(["step", "whispeerHelper", "asset/state"], function (step, h, State) {
	"use strict";

	function inviteController($scope, $location, cssService, keyStore, socketService, errorService) {
		cssService.setClass("inviteView");

		$scope.inviteMails = [""];

		var inviteMailState = new State();
		$scope.inviteMailState = inviteMailState.data;

		$scope.domain = $location.protocol() + "://" + $location.host();;

		$scope.$watch(function () {
			return $scope.inviteMails.filter(function (e) {
				return e !== "";
			}).length;
		}, function () {
			var inviteMails = $scope.inviteMails.filter(function (e) {
				return e !== "";
			});
			inviteMails.push("");

			if (inviteMails.length !== $scope.inviteMails.length) {
				$scope.inviteMails = inviteMails;
			}
		});

		$scope.$watch(function () {
			return $scope.inviteMails[$scope.inviteMails.length - 1];
		}, function (val) {
			if (val !== "") {
				$scope.inviteMails.push("");
			}
		});

		$scope.empty = function (val) {
			return val === "" || !h.isset(val);
		};

		$scope.isMail = function (mail) {
			return h.isMail(mail);
		};

		$scope.inviteUsers = function (name, mails) {
			inviteMailState.pending();

			step(function () {
				var mailsToSend = $scope.inviteMails.filter(function (e) {
					return h.isMail(e);
				});

				socketService.emit("inviteUsers", {
					mails: mailsToSend,
					name: name
				}, this);
			}, h.sF(function () {
				$scope.inviteMails = $scope.inviteMails.filter(function (e) {
					return !h.isMail(e);
				});

				this.ne();
			}), errorService.failOnError(inviteMailState))
		};

		$scope.generateInvite = function () {
			keyStore.format.createInviteCode(function (e, code) {
				$scope.inviteCode = keyStore.format.base32(code);
			});
		};
	}

	inviteController.$inject = ["$scope", "$location", "ssn.cssService", "ssn.keyStoreService", "ssn.socketService", "ssn.errorService"];

	return inviteController;
});