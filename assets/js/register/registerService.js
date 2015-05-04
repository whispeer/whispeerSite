/* jshint undef: true, unused: true */

/**
* SessionHelper
**/
define(["step", "whispeerHelper", "crypto/trustManager", "asset/securedDataWithMetaData", "services/serviceModule"], function (step, h, trustManager, SecuredData, serviceModule) {
	"use strict";

	serviceModule.factory("ssn.registerService", [
		"ssn.socketService",
		"ssn.keyStoreService",
		"ssn.profileService",
		"ssn.storageService",
	function (socketService, keyStoreService, ProfileService, Storage) {
		var keyGenerationStarted = false, keys = {}, keyGenListener = [], keyGenDone, sessionStorage = new Storage("whispeer.session");

		var registerService = {
			register: function (nickname, mail, password, profile, settings, callback) {
				var keys;
				step(function register1() {
					this.parallel.unflatten();

					registerService.startKeyGeneration(this);
				}, h.sF(function register2(theKeys) {
					keys = theKeys;

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
						keys: h.objectMap(keys, keyStoreService.upload.getKey),
						signedKeys: signedKeys,
						signedOwnKeys: signedOwnKeys,
						inviteCode: "whispeerfj",
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
				}), h.sF(function (result) {
					if (result.sid) {
						sessionStorage.set("sid", result.sid);
						sessionStorage.set("userid", result.userid);
						sessionStorage.set("loggedin", true);
						sessionStorage.set("password", password);
					}

					keyStoreService.security.setPassword(password);

					this.ne(result);
				}), callback);
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

		return registerService;
	}]);
});
