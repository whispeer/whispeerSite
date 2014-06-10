define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function ($timeout, $rootScope, errorService, socketService, sessionService, migrationService) {
		var callbacks = [], priorizedCallbacks = [];

		function createData() {
			var toGet = {};

			function createDataFromCallback(cur) {
				var data = cur.data;

				if (typeof data === "function") {
					data = data();
				}

				h.deepSetCreate(toGet, cur.domain, data);				
			}

			priorizedCallbacks.forEach(createDataFromCallback);
			callbacks.forEach(createDataFromCallback);

			return toGet;
		}

		function loadData() {
			var serverData;
			step(function () {
				socketService.emit("data", createData(), this);
			}, h.sF(function (result) {
				serverData = result;
				priorizedCallbacks.forEach(function (cur) {
					try {
						cur.cb(h.deepGet(serverData, cur.domain), this.parallel());
					} catch (e) {
						errorService.criticalError(e);
					}
				}, this);

				this.parallel()();
			}), h.sF(function () {
				callbacks.forEach(function (cur) {
					try {
						cur.cb(h.deepGet(serverData, cur.domain), this.parallel());
					} catch (e) {
						errorService.criticalError(e);
					}
				}, this);

				this.parallel()();
			}), h.sF(function () {
				migrationService();
				$rootScope.$broadcast("ssn.ownLoaded");
			}), errorService.criticalError);
		}

		$rootScope.$on("ssn.login", function () {
			if (sessionService.isLoggedin()) {
				$timeout(function () {
					loadData();
				});
			}
		});

		return {
			register: function (domain, data, cb, priorized) {
				domain = domain.split(".");
				var callbackData = {
					domain: domain,
					data: data,
					cb: cb
				};

				if (priorized) {
					priorizedCallbacks.push(callbackData);
				} else {
					callbacks.push(callbackData);
				}
			}
		};
	};

	service.$inject = ["$timeout", "$rootScope", "ssn.errorService", "ssn.socketService", "ssn.sessionService", "ssn.migrationService"];

	return service;
});