define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function ($timeout, $rootScope, socketService, sessionService) {
		var toGet = {}, callbacks = [];
		function loadData() {
			step(function () {
				socketService.emit("data", toGet, this);
			}, h.sF(function (result) {
				var i, cur;
				for (i = 0; i < callbacks.length; i += 1) {
					cur = callbacks[i];
					try {
						cur.cb(h.deepGet(result, cur.domain.split(".")));
					} catch (e) {
						console.log(e);
					}
				}
				$rootScope.$broadcast("ssn.ownLoaded");
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
				var domains = domain.split(".");
				h.deepSetCreate(toGet, domains, data);
				callbacks.push({domain: domain, cb: cb});
			}
		};
	};

	service.$inject = ["$timeout", "$rootScope", "ssn.socketService", "ssn.sessionService"];

	return service;
});