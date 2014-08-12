define(["step", "whispeerHelper", "crypto/trustManager", "crypto/signatureCache"], function (step, h, trustManager, signatureCache) {
	"use strict";

	var service = function ($rootScope, initService, userService, socketService, errorService) {
		var THROTTLE = 20;


		function uploadSignatureCache() {
			if (!signatureCache.isLoaded() || !signatureCache.isChanged()) {
				return;
			}

			step(function () {
				signatureCache.getUpdatedVersion(this);
			}, h.sF(function (newTrustContent) {
				socketService.emit("signatureCache.set", {
					content: newTrustContent
				}, this);
			}), h.sF(function (result) {
				if (!result.success) {
					throw new Error(result.error);	
				}
			}), errorService.criticalError);
		}
		window.setInterval(uploadSignatureCache, 1000);

		function uploadDatabase(cb) {
			step(function () {
				trustManager.getUpdatedVersion(this);
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
		userService.listen(function () {
			trustManager.setOwnSignKey(userService.getown().getSignKey());
		}, "ownEarly");

		initService.register("trustManager.get", {}, function (data, cb) {
			trustManager.setOwnSignKey(userService.getown().getSignKey());
			if (data.content) {
				trustManager.loadDatabase(data.content, cb);
			} else {
				trustManager.createDatabase(userService.getown());
				uploadDatabase(cb);
			}
		});

		initService.register("signatureCache.get", {}, function (data, cb) {
			if (data.content) {
				signatureCache.loadDatabase(data.content, userService.getown().getSignKey(), cb);
			} else {
				signatureCache.createDatabase(userService.getown().getSignKey());
				cb();
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
			verifyUser: function (user, cb) {
				var keyData = trustManager.getKeyData(user.getSignKey());
				keyData.setTrust(trustManager.trustStates.VERIFIED);
				uploadDatabase(cb);
			},
			addUser: function (user) {
				return trustManager.addUser(user);
			}
		};
	};

	service.$inject = ["$rootScope", "ssn.initService", "ssn.userService", "ssn.socketService", "ssn.errorService"];

	return service;
});