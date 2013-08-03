/* jshint undef: true, unused: true */


/**
* SessionService
**/
define(["step"], function (step) {
	"use strict";

	var service = function (socketService) {
		var User = function (identifier) {
			var data;
			function loadData(cb) {
				step(function () {
					if (data) {
						this.last.ne(data);
					} else {
						socketService.emit("user.get", {identifier: identifier}, this);
					}
				}, h.sF(function (userData) {
					data = userData;

					this.last.ne(data);
				}), cb);
			}

			this.getNickname = function (cb) {
				loadData(cb);
			};

			this.getMail = function (cb) {
				loadData(cb);
			};
		};

		return User;
	};

	service.$inject = ["ssn.socketService"];

	return service;
});