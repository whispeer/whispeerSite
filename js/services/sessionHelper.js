/* jshint undef: true, unused: true */

/**
* SessionHelper
**/
define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function (socketService, keyStoreService, ProfileService, sessionService) {
		var keyGenerationStarted = false, keys = {}, keyGenListener = [], keyGenDone;

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
						this.last.ne(data.errorData);
					} else {
						sessionHelper.resetKey();
						
						sessionService.setSID(data.sid, data.userid);
						keyStoreService.addPassword(password);

						this.last.ne();
					}
				}), callback);
			},

			register: function (nickname, mail, password, profile, callback) {
				var keys;
				step(function register1() {
					sessionHelper.startKeyGeneration(this);
				}, h.sF(function register2(theKeys) {
					keys = theKeys;

					if (nickname) {
						keyStoreService.setKeyGenIdentifier(nickname);
					} else {
						throw "need nickname";
					}

					var privateProfile = new ProfileService(profile.priv);

					privateProfile.signAndEncrypt(keys.sign, keys.profile, this.parallel());
					keyStoreService.sign.signObject(profile.pub, keys.sign, this.parallel());
					keyStoreService.sym.pwEncryptKey(keys.main, password, this.parallel());
					keyStoreService.sym.symEncryptKey(keys.friendsLevel2, keys.friends, this.parallel());
				}), h.sF(function register3(data) {
					keys = h.objectMap(keys, keyStoreService.correctKeyIdentifier);

					profile.pub.signature = data[1];

					var registerData = {
						password: keyStoreService.hash.hashPW(password),
						keys: h.objectMap(keys, keyStoreService.upload.getKey),
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
					keys = {};
					keyGenListener = [];
				}
			},

			startKeyGeneration: function startKeyGen(callback) {
				var toGenKeys = [
					["main", "sym"],
					["sign", "sign"],
					["crypt", "asym"],
					["profile", "sym"],
					["friends", "sym"],
					["friendsLevel2", "sym"]
				];

				function getCorrectKeystore(index) {
					return ks[toGenKeys[index][1]];
				}

				var ks = keyStoreService;
				step(function keyGen1() {
					if (typeof callback === "function") {
						if (keyGenDone) {
							callback(null, keys);
							return;
						}

						keyGenListener.push(callback);
					}

					if (!keyGenerationStarted) {
						this.ne();
					}
				}, h.sF(function keyGenStart() {
					keyGenerationStarted = true;
					var i;
					for (i = 0; i < toGenKeys.length; i += 1) {
						getCorrectKeystore(i).generateKey(this.parallel());
					}
				}), h.sF(function keyGen2(resultKeys) {
					var i;
					for (i = 0; i < toGenKeys.length; i += 1) {
						keys[toGenKeys[i][0]] = resultKeys[i];

						if (i > 0) {
							getCorrectKeystore(i).symEncryptKey(resultKeys[i], resultKeys[0], this.parallel());
						}
					}
				}), function keyGen3(e) {
					if (!e) {
						keyGenDone = true;
					}

					h.callEach(keyGenListener, [e, keys]);
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