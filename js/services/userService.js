/* jshint undef: true, unused: true */


/**
* SessionService
**/
define(["step"], function (step) {
	"use strict";

	var service = function (socketService) {
		var User = function (identifier) {
			function loadData(cb) {
				step(function () {
					socketService.emit("user.get", {identifier: identifier}, this);
				}, cb);
			}

			this.getNickname = function (cb) {
				loadData(cb);
			};
		};

		return User;
	};

	service.$inject = ["ssn.socketService"];

	return service;
});