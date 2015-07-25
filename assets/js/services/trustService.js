define(["step", "whispeerHelper", "crypto/trustManager", "crypto/signatureCache", "services/serviceModule"], function (step, h, trustManager, signatureCache, serviceModule) {
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
		window.setInterval(uploadSignatureCache, 10000);

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

		initService.get("trustManager.get", undefined, function (data, cb) {
			if (data.content) {
				trustManager.loadDatabase(data.content, cb);
			} else {
				trustManager.createDatabase(userService.getown());
				uploadDatabase(cb);
			}
		});

		initService.get("signatureCache.get", undefined, function (data, cb) {
			if (data.content) {
				step(function () {
					signatureCache.loadDatabase(data.content, userService.getown().getSignKey(), this);
				}, function (e) {
					if (e) {
						signatureCache.createDatabase(userService.getown().getSignKey());		
					}

					this.ne();
				}, cb);
			} else {
				signatureCache.createDatabase(userService.getown().getSignKey());
				cb();
			}
		}, { priorized: true });

		$rootScope.$on("ssn.reset", function () {
			trustManager.reset();
			signatureCache.reset();
		});

		socketService.channel("notify.trustManager", function (e, data) {
			trustManager.updateDatabase(data, function (e) {
				if (e) {
					throw e;
				}
			});
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

	serviceModule.factory("ssn.trustService", service);
});
