/**
* SessionService
**/
define(['angular', 'step', 'helper'], function (angular, step, h) {
	"use strict";

	var service = function (socketService) {
		var sid = "";

		return {
			login: function (name, password) {
				step(function loginStartup() {
					socketService.emit("salt", {
						identifier: name
					}, this);
				}, h.sF(function hashSalt(data) {
					console.log(data);
					//var hash = keyStoreService.hash(password, data.salt);
					socketService.emit("login", {
						identifier: name,
						passwordHash: password
					}, this);
				}), h.sF(function loginResults(data) {
					console.log(data);
				}));
			},

			register: function () {

			},

			passwordStrength: function (password) {
				var strength = 0;

				// Adapted from http://www.codeproject.com/KB/scripting/passwordstrength.aspx
				if (password.length > 4) { strength += 1; } // Greater than 4 chars long
				if ((password.match(/[a-z]/)) && (password.match(/[A-Z]/))) { strength += 2; } // Mix of upper and lower chars
				if (password.match(/\d+/)) { strength += 1; } // Contains a number
				if (password.match(/[+,!,@,#,$,%,\^,&,*,?,_,~,-,(,)]/)) { strength += 1; } // Contains a special char
				if (password.match(/[+,!,@,#,$,%,\^,&,*,?,_,~,-,(,)]([\w\W]*)[+,!,@,#,$,%,\^,&,*,?,_,~,-,(,)]/)) { strength += 1; } // Contains two special char
				if (password.length > 10) { strength += 1; } // Longer than 10 chars
				if (password.length > 15) { strength += 1; } // Longer than 15 chars
				if (password.length > 20) { strength += 1; } // Longer than 20 chars
				if (password.length > 20) { strength += 1; } // Longer than 20 chars

				return strength;
			}
		};
	};

	service.$inject = ['ssn.socketService'];

	return service;
});