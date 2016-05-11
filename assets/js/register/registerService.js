/* jshint undef: true, unused: true */

/**
* SessionHelper
**/
define([
		"step",
		"whispeerHelper",
		"crypto/trustManager",
		"asset/securedDataWithMetaData",
		"register/registerModule",

		"services/socketService",
		"services/keyStoreService",
		"services/profileService",
		"services/storageService"
	], function (step, h, trustManager, SecuredData, registerModule) {
	"use strict";

	registerModule.factory("ssn.registerService", [
		"ssn.socketService",
		"ssn.keyStoreService",
		"ssn.profileService",
		"ssn.storageService",
		"ssn.errorService",
	function (socketService, keyStoreService, ProfileService, Storage, errorService) {
		var keyGenerationStarted = false, keys = {}, keyGenListener = [], keyGenDone, sessionStorage = Storage.withPrefix("whispeer.session"), clientStorage = Storage.withPrefix("whispeer.client");

		var registerService = {
			register: function (nickname, mail, password, profile, settings, inviteCode, callback) {
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

					trustManager.allow(5);

					this.parallel.unflatten();

					privateProfile.signAndEncrypt(keys.sign, keys.profile, this.parallel());
					privateProfileMe.signAndEncrypt(keys.sign, keys.main, this.parallel());
					publicProfile.sign(keys.sign, this.parallel());

					SecuredData.create(settings.content, settings.meta, { type: "settings" }, keys.sign, keys.main, this.parallel());

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

					if (inviteCode) {
						registerData.inviteCode = inviteCode;
					}

					registerData.preID = clientStorage.get("preID") || "";

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
			setPreID: function () {
				step(function () {
					if (socketService.isConnected()) {
						this();
					} else {
						socketService.once("connect", this.ne);
					}
				}, h.sF(function () {
					if (clientStorage.get("preID")) {
						this.ne(clientStorage.get("preID"));
					} else {
						keyStoreService.random.hex(40, this);
					}
				}), h.sF(function (preID) {
					clientStorage.set("preID", preID);

					socketService.emit("preRegisterID", {
						id: preID
					}, this);
				}), errorService.criticalError);
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
						socketService.awaitConnection().then(this, this.ne);
					}
				}, h.sF(function () {
					socketService.emit("nicknameFree", {
						nickname: nickname
					}, this);
				}), h.sF(function nicknameResult(data) {
					if (data.nicknameUsed === true) {
						this.ne(true);
					} else if (data.nicknameUsed === false) {
						this.ne(false);
					} else {
						this.ne(new Error());
					}
				}), callback);
			}
		};

		return registerService;
	}]);
});
