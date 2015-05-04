/* jshint undef: true, unused: true */

/**
* SessionHelper
**/
define(["step", "whispeerHelper", "services/serviceModule"], function (step, h, serviceModule) {
	"use strict";

	var service = function (socketService) {
		var sessionHelper = {
			logout: function () {
				step(function sendLogout() {
					socketService.emit("session.logout", {logout: true}, this);
				});
			}
		};

		return sessionHelper;
	};

	service.$inject = ["ssn.socketService"];

	serviceModule.factory("ssn.sessionHelper", service);
});
