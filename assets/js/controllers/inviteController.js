/**
* inviteController
**/

define(["step", "whispeerHelper", "asset/state", "controllers/controllerModule"], function (step, h, State, controllerModule) {
	"use strict";

	function inviteController($scope, $location, socketService, errorService, cssService, localize) {
		cssService.setClass("inviteView");

		$scope.domain = $location.protocol() + "://" + $location.host() + ( window.location.port ? ":" + window.location.port : "" ) + "/" + localize.getLanguage();
		$scope.anonymous = false;

		var inviteGenerateState = new State();
		$scope.inviteGenerateState = inviteGenerateState.data;

		var code;

		function generateCode() {
			inviteGenerateState.pending();

			step(function () {
				socketService.emit("invites.generateCode", {}, this);
			}, h.sF(function (result) {
				code = result.inviteCode;

				this.ne();
			}), errorService.failOnError(inviteGenerateState));
		}
		generateCode();

		function activateCode(code) {
			socketService.emit("invites.activateCode", {
				code: code
			});
		}

		function getUrl(name) {
			var params = {};

			if (code && !$scope.anonymous) {
				params.code = code;
			}

			if (name) {
				params[name] = null;
			}

			return encodeURIComponent($scope.domain + h.encodeParameters(params));
		}

		var urls = {
			"facebook": "'http://www.facebook.com/sharer.php?u=' + url('fb')",
			"twitter": "'https://twitter.com/intent/tweet?url=' + url() + '&text=' + text + '&hashtags=' + hashtags",
			"google": "'https://plus.google.com/share?url=' + url('gp')",
			"reddit": "'http://reddit.com/submit?url=' + url() + '&title=' + text",
		};

		$scope.open = function (type) {
			var url = $scope.$eval(urls[type], {
				url: getUrl.bind(null),
				text: localize.getLocalizedString("views.invite.shareText", {}),
				hashtags: localize.getLocalizedString("views.invite.shareHashTags", {})
			});
			window.open(url);

			activateCode(code);
			generateCode();
		};
	}

	inviteController.$inject = ["$scope", "$location", "ssn.socketService", "ssn.errorService", "ssn.cssService", "localize"];

	controllerModule.controller("ssn.inviteController", inviteController);
});
