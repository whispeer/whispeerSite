define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function ($timeout, $rootScope, socketService, sessionService, migrationService) {
		var callbacks = [];

		function createData() {
			var i, toGet = {};
			for (i = 0; i < callbacks.length; i += 1) {
				var data = callbacks[i].data;

				if (typeof data === "function") {
					data = data();
				}

				h.deepSetCreate(toGet, callbacks[i].domain, data);
			}

			return toGet;
		}

		function loadData() {
			step(function () {
				socketService.emit("data", createData(), this);
			}, h.sF(function (result) {
				var i, cur;
				for (i = 0; i < callbacks.length; i += 1) {
					cur = callbacks[i];
					try {
						cur.cb(h.deepGet(result, cur.domain));
					} catch (e) {
						console.log(e);
					}
				}

				$rootScope.$broadcast("ssn.ownLoaded");
				migrationService();
			}), function (e) {
				console.error(e);
			});
		}

		$rootScope.$on("ssn.login", function () {
			if (sessionService.isLoggedin()) {
				$timeout(function () {
					loadData();
				});
			}
		});

		return {
			register: function (domain, data, cb) {
				domain = domain.split(".");

				callbacks.push({
					domain: domain,
					data: data,
					cb: cb
				});
			}
		};
	};

	service.$inject = ["$timeout", "$rootScope", "ssn.socketService", "ssn.sessionService", "ssn.migrationService"];

	return service;
});