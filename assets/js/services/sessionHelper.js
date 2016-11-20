/* jshint undef: true, unused: true */

/**
* SessionHelper
**/
define(["bluebird", "whispeerHelper", "services/serviceModule"], function (Bluebird, h, serviceModule) {
	"use strict";

	var service = function (socketService) {
		var sessionHelper = {
			logout: function () {
				return Bluebird.try(function sendLogout() {
					return socketService.emit("session.logout", {logout: true});
				});
			}
		};

		return sessionHelper;
	};

	service.$inject = ["ssn.socketService"];

	serviceModule.factory("ssn.sessionHelper", service);
});
