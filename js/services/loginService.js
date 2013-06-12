/**
* SessionService
**/
define(['angular', 'step', 'helper'], function (angular, step, h) {
	"use strict";

	var service = function (socketService, keyStoreService) {
		var sid = "";

		return {
			login: function (name, password, callback) {
				step(function loginStartup() {
					socketService.emit("token", {
						identifier: name
					}, this);
				}, h.sF(function hashWithToken(data) {
					if (data.error) {
						this.last(data.errorData);
					} else {
						var hash = keyStoreService.hash(password);

						hash = hash(hash.substr(0, 10) + data.token);
						socketService.emit("login", {
							identifier: name,
							passwordHash: hash
						}, this);
					}
				}), h.sF(function loginResults(data) {
					if (data.error) {
						this.last(data.errorData);
					} else {
						//TODO: go forward, login was successful
					}
				}), callback);
			},

			register: function (nickname, mail, password, profile, callback) {
				step(function register1() {
					
				}, callback);
			},

			mailUsed: function (mail, callback) {
				step(function mailCheck() {
					if (mail === "" || !h.isMail(mail)) {
						this.last.ne(true);
					} else {
						socketService.emit("mailFree", {
							mail: mail
						}, this);
					}
				}, h.sF(function mailResult(data) {
					if (data.mailUsed === true) {
						this.ne(true);
					} else if (data.mailUsed === false) {
						this.ne(false);
					} else {
						this.ne(new Error());
					}
				}), callback);
			},

			nicknameUsed: function (nickname, callback) {
				step(function nicknameCheck() {
					if (nickname === "" || !h.isNickname(nickname)) {
						this.last.ne(true);
					} else {
						socketService.emit("nicknameFree", {
							nickname: nickname
						}, this);
					}
				}, h.sF(function nicknameResult(data) {
					if (data.nicknameUsed === true) {
						this.ne(true);
					} else if (data.nicknameUsed === false) {
						this.ne(false);
					} else {
						this.ne(new Error());
					}
				}), callback);
			},

			passwordStrength: function (password) {
				var strength = 0;

				/*
					>=7  +1
					>=10 +1
					>=13 +1
					>=16 +1
					>=20 +1
					Groß&Klein +2
					1 Sonderzeichen +1
					1 Sonderzeichen +1
					Zahl +1
				*/

				// Adapted from http://www.codeproject.com/KB/scripting/passwordstrength.aspx
				if (password.length >= 7) { strength += 1; } // Greater than 4 chars long
				if (password.length >= 10) { strength += 1; } // Longer than 10 chars
				if (password.length >= 13) { strength += 1; } // Longer than 15 chars
				if (password.length >= 16) { strength += 1; } // Longer than 15 chars
				if (password.length >= 20) { strength += 1; } // Longer than 20 chars
				if ((password.match(/[a-z]/)) && (password.match(/[A-Z]/))) { strength += 2; } // Mix of upper and lower chars
				if (password.match(/\d+/)) { strength += 1; } // Contains a number
				if (password.match(/[+,!,@,#,$,%,\^,&,*,?,_,~,\-]/)) { strength += 1; } // Contains a special chars
				if (password.match(/[+,!,@,#,$,%,\^,&,*,?,_,~,\-]([\w\W]*)[+,!,@,#,$,%,\^,&,*,?,_,~,\-]/)) { strength += 1; } // Contains two special chars

				return strength;
			}
		};
	};

	service.$inject = ['ssn.socketService', 'ssn.keyStoreService'];

	return service;
});