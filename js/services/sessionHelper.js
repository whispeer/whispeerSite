/* jshint undef: true, unused: true */

/**
* SessionHelper
**/
define(['step', 'helper'], function (step, h) {
	"use strict";

	var service = function (socketService, keyStoreService, ProfileService, sessionService) {
		var keyGenerationStarted = false, asym, sign, sym, keyGenListener = [], keyGenDone;

		var sessionHelper = {
			logout: function () {
				step(function sendLogout() {
					socketService.emit("logout", true);
				}, function logoutResult(e, data) {
					debugger;
				});
			},

			login: function (name, password, callback) {
				step(function loginStartup() {
					socketService.emit("token", {
						identifier: name
					}, this);
				}, h.sF(function hashWithToken(data) {
					if (data.error) {
						this.last(data.errorData);
					} else {
						var hash = keyStoreService.hash.hashPW(password);

						hash = keyStoreService.hash.hash(hash + data.token);
						socketService.emit("login", {
							identifier: name,
							password: hash,
							token: data.token
						}, this);
					}
				}), h.sF(function loginResults(data) {
					if (data.error) {
						this.last.ne(data.errorData);
					} else {
						sessionHelper.resetKey();
						
						sessionService.setSID(data.sid);

						this.last.ne();
					}
				}), callback);
			},

			register: function (nickname, mail, password, profile, callback) {
				var sym, asym, sign;
				step(function register1() {
					sessionHelper.startKeyGeneration(this);
				}, h.sF(function register2(symK, asymK, signK) {
					sym = symK;
					asym = asymK;
					sign = signK;

					if (mail) {
						keyStoreService.setKeyGenIdentifier(mail);
					} else if (nickname) {
						keyStoreService.setKeyGenIdentifier(nickname);
					} else {
						throw "need either nick or mail";
					}

					keyStoreService.sym.generateKey(this);
				}), h.sF(function register21(profileKey) {
					var privateProfile = new ProfileService(profile.priv);

					privateProfile.encrypt(profileKey, this.parallel());
					keyStoreService.sym.pwEncryptKey(sym, password, this.parallel());
					keyStoreService.sym.symEncryptKey(profileKey, sym, this.parallel());
				}), h.sF(function register3(data) {
					var decryptors = keyStoreService.upload.getDecryptors();

					var registerData = {
						password: keyStoreService.hash.hashPW(password),
						mainKey: keyStoreService.upload.getKey(sym),
						signKey: keyStoreService.upload.getKey(sign),
						cryptKey: keyStoreService.upload.getKey(asym),
						decryptors: decryptors,
						profile: {
							pub: profile.pub,
							priv: data[0]
						}
					};

					if (mail) {
						registerData.mail = mail;
					}

					if (nickname) {
						registerData.nickname = nickname;
					}

					socketService.emit("register", registerData, this);
				}), h.sF(function (result) {
					sessionHelper.resetKey();
					this.ne(result);
				}), callback);
			},

			resetKey: function () {
				if (keyGenDone) {
					keyGenerationStarted = false;
					keyGenDone = false;
					asym = undefined;
					sym = undefined;
					sign = undefined;
					keyGenListener = [];
				}
			},

			startKeyGeneration: function startKeyGen(callback) {
				var kAsym = keyStoreService.asym, kSign = keyStoreService.sign, kSym = keyStoreService.sym;
				step(function keyGen1() {
					if (typeof callback === "function") {
						if (keyGenDone) {
							callback(null, sym, asym, sign);
							return;
						}

						keyGenListener.push(callback);
					}

					if (!keyGenerationStarted) {
						keyGenerationStarted = true;
						kAsym.generateKey(this.parallel());
						kSign.generateKey(this.parallel());
						kSym.generateKey(this.parallel());
					}
				}, h.sF(function keyGen2(keys) {
					asym = keys[0];
					sign = keys[1];
					sym = keys[2];

					kAsym.symEncryptKey(asym, sym, this.parallel());
					kSign.symEncryptKey(sign, sym, this.parallel());
				}), function keyGen3(e) {
					if (!e) {
						keyGenDone = true;
					}

					var i;
					for (i = 0; i < keyGenListener.length; i += 1) {
						try {
							keyGenListener[i](e, sym, asym, sign);
						} catch (e2) {
							console.log("Listener error!");
							console.log(e2);
						}
					}
				});
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
					Gross&Klein +2
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

		return sessionHelper;
	};

	service.$inject = ['ssn.socketService', 'ssn.keyStoreService', 'ssn.profileService', 'ssn.sessionService'];

	return service;
});