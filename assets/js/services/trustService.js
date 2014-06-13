define(["step", "whispeerHelper", "crypto/trustManager"], function (step, h, trustManager) {
	"use strict";

	var service = function ($rootScope, initService, userService, socketService, errorService) {
		var THROTTLE = 20;

		function uploadDatabase(cb) {
			step(function () {
				trustManager.getUpdatedVersion(userService.getown().getSignKey(), this);
			}, h.sF(function (newTrustContent) {
				socketService.emit("trustManager.set", {
					content: newTrustContent
				}, this);
			}), h.sF(function (result) {
				if (result.success) {
					this.ne();
				} else {
					errorService.criticalError(result.error);
				}
			}), cb);
		}

		var delay = h.aggregateOnce(THROTTLE, uploadDatabase);

		function addNewUsers(user) {
			if (trustManager.isLoaded() && !trustManager.hasKeyData(user.getSignKey())) {
				trustManager.addUser(user);
				delay();
			}
		}

		userService.listen(addNewUsers, "loadedUser");

		initService.register("trustManager.get", {}, function (data, cb) {
			if (data.content) {
				trustManager.loadDatabase(data.content, userService.getown().getSignKey(), cb);
			} else {
				trustManager.createDatabase(userService.getown());
				uploadDatabase(cb);
			}
		}, true);

		$rootScope.$on("ssn.reset", function () {
			trustManager.reset();
		});

		return {
			hasKey: function (keyid) {
				return trustManager.hasKeyData(keyid);
			},
			getKey: function (keyid) {
				return trustManager.getKeyData(keyid);
			},
			addUser: function (user) {
				return trustManager.addUser(user);
			}
		};
	};

	service.$inject = ["$rootScope", "ssn.initService", "ssn.userService", "ssn.socketService", "ssn.errorService"];

	return service;
});