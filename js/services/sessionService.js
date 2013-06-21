/**
* SessionService
**/
define(['step', 'helper'], function (step, h) {
	"use strict";

	var service = function ($rootScope, $location, socketService, keyStoreService) {
		var sid = "", loggedin = false, keyGenerationStarted = false, asym, sign, sym, keyGenListener = [], keyGenDone, returnURL;

		function loginChange() {
			$rootScope.$broadcast('ssn.login');

			if (loggedin) {
				if (returnURL) {
					$location.path(returnURL);
					returnURL = undefined;
				} else {
					$location.path("/main");
				}
			} else {
				$location.path("/login");
			}
		}

		var sessionService = {
			loginRequired: function () {
				if (!loggedin) {
					returnURL = $location.path();
					loginChange();

					return false;
				}

				return true;
			},

			loggoutRequired: function () {
				if (loggedin) {
					loginChange();

					return false;
				}

				return true;
			},

			login: function (name, password, callback) {
				loggedin = true;
				loginChange();

				step(function loginStartup() {
					socketService.emit("token", {
						identifier: name
					}, this);
				}, h.sF(function hashWithToken(data) {
					if (data.error) {
						this.last(data.errorData);
					} else {
						var hash = keyStoreService.hashPW(password);

						hash = keyStoreService.hash(hash + data.token);
						socketService.emit("login", {
							identifier: name,
							passwordHash: hash
						}, this);
					}
				}), h.sF(function loginResults(data) {
					if (data.error) {
						this.last(data.errorData);
					} else {
						sessionService.resetKey();
						loggedin = true;
						sid = data.sid;
					}
				}), callback);
			},

			logout: function () {
				if (loggedin) {
					sid = "";
					loggedin = false;

					loginChange();
				}
			},

			register: function (nickname, mail, password, profile, callback) {
				var sym, asym, sign, keyData;
				step(function register1() {
					sessionService.startKeyGeneration(this)
				}, h.sF(function register2(symK, asymK, signK) {
					sym = symK;
					asym = asymK;
					sign = signK;

					keyStore.sym.pwEncryptKey(sym, password, this);
				}), h.sF(function register3() {
					keyData = keyStore.getUploadData();

					{
						keyData: keyData,
						nickname: nickname,
						mail: mail,
						password: keyStore.hashPW(password),
						profile: {
							pub: profile.pub,
							priv: encryptProfile(profile.priv)
						}
					}
				}), callback);
			},

			isLoggedin: function () {
				return loggedin;
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
					console.log("key generation done!");
					console.log(keys);
					asym = keys[0];
					sign = keys[1];
					sym = keys[2];

					kAsym.symEncryptKey(asym, sym, this.parallel());
					kSign.symEncryptKey(sign, sym, this.parallel());
				}), function keyGen3(e) {
					if (e) {
						console.log("Key Generation Error!");
						console.log(e);
					} else {
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

		return sessionService;
	};

	service.$inject = ['$rootScope', '$location', 'ssn.socketService', 'ssn.keyStoreService'];

	return service;
});