/* jshint undef: true, unused: true */

/**
* SessionHelper
**/
define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function (socketService, keyStoreService, ProfileService, sessionService) {
		var keyGenerationStarted = false, asym, sign, sym, profile, keyGenListener = [], keyGenDone;

		var sessionHelper = {
			logout: function () {
				step(function sendLogout() {
					socketService.emit("session.logout", {logout: true}, this);
				});
			},

			login: function (name, password, callback) {
				step(function loginStartup() {
					socketService.emit("session.token", {
						identifier: name
					}, this);
				}, h.sF(function hashWithToken(data) {
					if (data.error) {
						this.last(data.errorData);
					} else {
						var hash = keyStoreService.hash.hashPW(password);

						hash = keyStoreService.hash.hash(hash + data.token);
						socketService.emit("session.login", {
							identifier: name,
							password: hash,
							token: data.token
						}, this);
					}
				}), h.sF(function loginResults(data) {
					if (data.error) {
						this.last(data.errorData);
					} else {
						sessionHelper.resetKey();
						
						sessionService.setSID(data.sid, data.userid);
						keyStoreService.addPassword(password);

						this.last.ne();
					}
				}), callback);
			},

			register: function (nickname, mail, password, profile, callback) {
				var sym, asym, sign, profileKey;
				step(function register1() {
					sessionHelper.startKeyGeneration(this);
				}, h.sF(function register2(symK, asymK, signK, profileK) {
					sym = symK;
					asym = asymK;
					sign = signK;
					profileKey = profileK;

					if (nickname) {
						keyStoreService.setKeyGenIdentifier(nickname);
					} else {
						throw "need nickname";
					}

					var privateProfile = new ProfileService(profile.priv);

					privateProfile.signAndEncrypt(sign, profileKey, this.parallel());
					keyStoreService.sign.signObject(profile.pub, sign, this.parallel());
					keyStoreService.sym.pwEncryptKey(sym, password, this.parallel());
				}), h.sF(function register3(data) {
					sym = keyStoreService.correctKeyIdentifier(sym);
					asym = keyStoreService.correctKeyIdentifier(asym);
					sign = keyStoreService.correctKeyIdentifier(sign);
					profileKey = keyStoreService.correctKeyIdentifier(profileKey);

					profile.pub.signature = data[1];

					var registerData = {
						password: keyStoreService.hash.hashPW(password),
						mainKey: keyStoreService.upload.getKey(sym),
						signKey: keyStoreService.upload.getKey(sign),
						cryptKey: keyStoreService.upload.getKey(asym),
						profileKey: keyStoreService.upload.getKey(profileKey),
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

					socketService.emit("session.register", registerData, this);
				}), h.sF(function (result) {
					sessionHelper.resetKey();
					keyStoreService.addPassword(password);
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
					profile = undefined;
					keyGenListener = [];
				}
			},

			startKeyGeneration: function startKeyGen(callback) {
				var kAsym = keyStoreService.asym, kSign = keyStoreService.sign, kSym = keyStoreService.sym;
				step(function keyGen1() {
					if (typeof callback === "function") {
						if (keyGenDone) {
							callback(null, sym, asym, sign, profile);
							return;
						}

						keyGenListener.push(callback);
					}

					if (!keyGenerationStarted) {
						keyGenerationStarted = true;
						kAsym.generateKey(this.parallel());
						kSign.generateKey(this.parallel());
						kSym.generateKey(this.parallel());
						kSym.generateKey(this.parallel());
					}
				}, h.sF(function keyGen2(keys) {
					asym = keys[0];
					sign = keys[1];
					sym = keys[2];
					profile = keys[3];

					kAsym.symEncryptKey(asym, sym, this.parallel());
					kSign.symEncryptKey(sign, sym, this.parallel());
					kSym.symEncryptKey(profile, sym, this.parallel());
				}), function keyGen3(e) {
					if (!e) {
						keyGenDone = true;
					}

					var i;
					for (i = 0; i < keyGenListener.length; i += 1) {
						try {
							keyGenListener[i](e, sym, asym, sign, profile);
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
				var strength = 1;

				/*
					>=7  +1*1
					>=10 +1
					>=13 +1
					>=16 +1
					>=20 +1
					Gross&Klein +2
					1 Sonderzeichen +1
					1 Sonderzeichen +1
					Zahl +1
				*/

				if (password.length < 8) { return 0; } // Greater than 8 chars minimum!

				// Adapted from http://www.codeproject.com/KB/scripting/passwordstrength.aspx
				if (password.length >= 10) { strength += 1; } // Longer than 10 chars
				if (password.length >= 13) { strength += 2; } // Longer than 13 chars
				if (password.length >= 16) { strength += 2; } // Longer than 16 chars
				if (password.length >= 20) { strength += 1; } // Longer than 20 chars
				if ((password.match(/[a-z]/)) && (password.match(/[A-Z]/))) { strength += 1; } // Mix of upper and lower chars
				if (password.match(/\d+/)) { strength += 1; } // Contains a number
				if (password.match(/[+,!,@,#,$,%,\^,&,*,?,_,~,\-]/)) { strength += 1; } // Contains a special chars

				return strength;
			}
		};

		return sessionHelper;
	};

	service.$inject = ["ssn.socketService", "ssn.keyStoreService", "ssn.profileService", "ssn.sessionService"];

	return service;
});