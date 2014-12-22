/* jshint undef: true, unused: true */

/**
* SessionHelper
**/
define(["step", "whispeerHelper", "crypto/trustManager", "asset/securedDataWithMetaData"], function (step, h, trustManager, SecuredData) {
	"use strict";

	var service = function (socketService, keyStoreService, ProfileService, sessionService, blobService) {
		var keyGenerationStarted = false, keys = {}, keyGenListener = [], keyGenDone;

		var sessionHelper = {
			checkInviteCode: function (code, cb) {
				step(function () {
					if (code.length !== 10) {
						this.last.ne(false);
					} else {
						socketService.emit("invites.checkCode", { inviteCode: code }, this);
					}
				}, h.sF(function (result) {
					this.ne(result.valid);
				}), cb);
			},

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
				}, function hashWithToken(e, data) {
					if (e) {
						this.last({ unknownName: true });
					} else {
						if (data.salt.length !== 16) {
							throw new SecurityError("server wut?");
						}

						var hash = keyStoreService.hash.hashPW(password, data.salt);

						hash = keyStoreService.hash.hash(hash + data.token);
						socketService.emit("session.login", {
							identifier: name,
							password: hash,
							token: data.token
						}, this);
					}
				}, function loginResults(e, data) {
					if (e) {
						this.last({ wrongPassword: true });
					} else {
						sessionHelper.resetKey();
						
						sessionService.setSID(data.sid, data.userid);
						keyStoreService.security.setPassword(password);

						this.last.ne();
					}
				}, callback);
			},

			register: function (nickname, mail, inviteCode, password, profile, imageBlob, settings, callback) {
				var keys, result;
				step(function register1() {
					this.parallel.unflatten();

					sessionHelper.startKeyGeneration(this.parallel());

					if (imageBlob) {
						imageBlob = blobService.createBlob(imageBlob);
						imageBlob.preReserveID(this.parallel());
						imageBlob.getHash(this.parallel());
					}
				}, h.sF(function register2(theKeys, blobid, imageHash) {
					keys = theKeys;

					if (imageBlob) {
						profile.pub.imageBlob = {
							blobid: blobid,
							imageHash: imageHash
						};
					}

					if (nickname) {
						keyStoreService.setKeyGenIdentifier(nickname);
					} else {
						throw new Error("need nickname");
					}

					var privateProfile = new ProfileService({
						content: profile.priv
					}, { isDecrypted: true });

					var privateProfileMe = new ProfileService({
						content: h.objectJoin(h.objectJoin(profile.priv, profile.pub), profile.nobody),
						meta: { myProfile: true }
					}, { isDecrypted: true });

					var publicProfile = new ProfileService({
						content: profile.pub || {}
					}, { isPublicProfile: true });

					var correctKeys = h.objectMap(keys, keyStoreService.correctKeyIdentifier);
					var ownKeys = {main: correctKeys.main, sign: correctKeys.sign};
					delete correctKeys.main;
					delete correctKeys.profile;

					var signedKeys = SecuredData.load(undefined, correctKeys, { type: "signedKeys" });

					trustManager.allow(4);

					this.parallel.unflatten();

					privateProfile.signAndEncrypt(keys.sign, keys.profile, this.parallel());
					privateProfileMe.signAndEncrypt(keys.sign, keys.main, this.parallel());
					publicProfile.sign(keys.sign, this.parallel());

					keyStoreService.sym.encryptObject(settings, keys.main, 0, this.parallel());
					signedKeys.sign(keys.sign, this.parallel());

					keyStoreService.security.makePWVerifiable(ownKeys, password, this.parallel());

					keyStoreService.random.hex(16, this.parallel());

					keyStoreService.sym.pwEncryptKey(keys.main, password, this.parallel());
					keyStoreService.sym.symEncryptKey(keys.profile, keys.friends, this.parallel());
				}), h.sF(function register3(privateProfile, privateProfileMe, publicProfile, settings, signedKeys, signedOwnKeys, salt) {
					keys = h.objectMap(keys, keyStoreService.correctKeyIdentifier);
					trustManager.disallow();

					var registerData = {
						password: {
							salt: salt,
							hash: keyStoreService.hash.hashPW(password, salt),
						},
						inviteCode: inviteCode,
						keys: h.objectMap(keys, keyStoreService.upload.getKey),
						signedKeys: signedKeys,
						signedOwnKeys: signedOwnKeys,
						profile: {
							pub: publicProfile,
							priv: [privateProfile],
							me: privateProfileMe
						},
						settings: settings
					};

					if (mail) {
						registerData.mail = mail;
					}

					if (nickname) {
						registerData.nickname = nickname;
					}

					socketService.emit("session.register", registerData, this);
				}), h.sF(function (_result) {
					result = _result;

					sessionHelper.resetKey();
					keyStoreService.security.setPassword(password);

					if (imageBlob) {
						imageBlob.upload(this);
					} else {
						this.ne();
					}
				}), h.sF(function () {
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
					["friends", "sym"]
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
						getCorrectKeystore(i).generateKey(this.parallel(), toGenKeys[i][0]);
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
				if (!password) { return 0; }

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

	service.$inject = ["ssn.socketService", "ssn.keyStoreService", "ssn.profileService", "ssn.sessionService", "ssn.blobService"];

	return service;
});