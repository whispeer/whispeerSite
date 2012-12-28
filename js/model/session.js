define(['jquery', 'display', 'model/storage', 'asset/logger', 'asset/helper', 'libs/step', "crypto/privateKey", "crypto/sessionKey", "model/state", 'libs/jquery.json.min'], function ($, display, storage, logger, h, step, PrivateKey, SessionKey, state) {
	"use strict";

	/** user loged in? */
	var logedin = false;
	/** loged in user identifier */
	var identifier = "";
	/** loged in users password */
	var password = "";
	/** session id for currently loged in user */
	var sid = "";
	/** key of currently logged in user */
	var key = null;
	/** main symmetric key of currently logged in user */
	var mainKey = null;
	/** userid of logged in user */
	var userid = 0;

	//TODO

	var session = {
		storageAvailable: function () {
			return storage.available;
		},

		logedin: function () {
			return logedin;
		},

		isOldSession: function () {
			return !!storage.getItem("logedin");
		},

		/** get the main key */
		getMainKey: function () {
			return mainKey;
		},

		getKey: function () {
			return key;
		},

		/** get session id */
		getSID: function () {
			return sid;
		},

		userid: function () {
			return userid;
		},

		/** Called when we logged in / restore our old session. */
		loadData: function () {
			console.time("loadData");
			var u, userManager, display;
			step(function getDisplay() {
				$("#main").hide();
				$("nav").show();
				require.wrap(['display', 'model/userManager', "asset/i18n!menu"], this);
			}, h.sF(function rSession(d, um, i18n) {
				i18n.translate($("#menu"));
				display = d;
				userManager = um;
				logger.log("Loading Data!");

				display.setBodyClass("main");
				display.setProfilePic("img/profil.jpg");

				display.loadingMain();

				$("#sidebar-left, #sidebar-right, #nav-icons, #nav-search").show();
				$("#loginform").hide();

				mainKey.decryptKey(key, this);
			}), h.sF(function mainKeyDecrypt(decrypted) {
				if (!decrypted) {
					throw new Error("could not decrypt main key");
				}

				session.getOwnUser(this);
			}), h.sF(function ownUserLoaded5(ownUser) {
				u = ownUser;
				display.loadingMainProgress(10);
				u.decryptKeys(this);
			}), h.sF(function ownKeysDecrypted13() {
				display.loadingMainProgress(13);
				u.getName(this);
			}), h.sF(function ownName15(name) {
				console.log("OWN NAME: " + name);
				display.loadingMainProgress(15);
				$("#username").text(name);
				userManager.loadFriends(this, true);
			}), h.sF(function friendsLoaded20() {
				display.loadingMainProgress(20);

				u.friends(this);
			}), h.sF(function ownUserFriendsLoaded30(friends) {
				display.loadingMainProgress(30);

				require.wrap("model/state", this);
			}), function loadingDone(err, state) {
				console.timeEnd("loadData");
				if (err) {
					console.log(err);
					throw err;
				}

				console.log(state);
				state.loaded = true;
				$(window).trigger('hashchange');

				//TODO think about something more robust here.
				//mainly we need to detect whether we are restoring a session
				// or whether we newly logged in.
				if (display.loadedView === "register") {
					display.loadView("main");
				}

				display.loadingMainProgress(100);

				display.endLoadingMain();
			});
		},

		/**
		 * Loads an old Session. Looks if the Session Key is still valid. If this is
		 * the case it looks if the key is there and tries decrypting it
		 * with the password.
		 */
		loadOldSession : function () {
			$.ajax({
				type : "POST",
				url : "api/session/checkSession.php",
				data : "sid=" + storage.getItem("session"),
				error : function (obj, error) {
					display.ajaxError(obj, error);
				},
				success : function (data) {
					data = $.parseJSON(data);
					if (parseInt(data.status, 10) === 1) {
						if (parseInt(data.sessionok, 10) === 1) {
							session.getStorage();
							session.loadData();
						} else {
							storage.clear();
							//ssn.loaded = true;
							display.loadView("register");
						}
					} else {
						display.ajaxError();
					}
				}
			});
		},

		/** save all data to localStorage */
		setStorage: function () {
			storage.setItem("logedin", logedin);
			storage.setItem("identifier", identifier);
			storage.setItem("password", password);
			storage.setItem("session", sid);
			storage.setItem("key", key.getEncrypted());
			storage.setItem("mainKey", mainKey.getOriginal());
		},

		/** get all data from localStorage */
		getStorage: function () {
			logedin = storage.getItem("logedin");
			state.logedin = logedin;
			identifier = storage.getItem("identifier");
			password = storage.getItem("password");
			sid = storage.getItem("session");
			key = new PrivateKey(storage.getItem("key"), password);
			mainKey = new SessionKey(storage.getItem("mainKey"));
			userid = key.id();
		},

		/**
		 * Login Function.
		 * 
		 * @param identifier:
		 *            the identifier (mail or nickname) we want to login with
		 * @param password:
		 *            the password we want to login with
		 * @return nothing
		 */
		login: function (identifierL, passwordL) {
			var crypto;
			step(function requireCrypto() {
				require.wrap(["crypto/crypto"], this);
			}, h.sF(function getCrypto(c) {
				crypto = c;

				logger.log("Login: " + identifierL);

				var hash = crypto.sha256(passwordL);

				try {
					display.loginStarted();
				} catch (e) { logger.log(e); }

				var data = {};
				data.identifier = identifierL;
				data.password = hash;

				h.ajax({
					type : "POST",
					url : "api/session/login.php",
					data : "data=" + encodeURI($.toJSON(data))
				}, this);
			}), h.sF(function (data) {
				data = $.parseJSON(data);

				var status = parseInt(data.status, 10);

				if (parseInt(status, 10) === 1) {
					if (parseInt(data.loginok, 10) === 1) {
						logger.log("Login ok! session:"
										+ data.session);

						logedin = true;
						state.logedin = logedin;
						identifier = identifierL;
						password = passwordL;
						sid = data.session;
						key = new PrivateKey($.toJSON(data.key), password);
						mainKey = new SessionKey(data.mainKey);
					} else {
						display.loginError(data.errorCode);
					}
				} else {
					display.ajaxError();
				}

				this();
			}), h.sF(function () {
				userid = key.id();

				session.setStorage();

				display.loginSuccess();
				session.loadData();
			}), function (e) {
				logger.log(e);
			});
		},

		/** log out. clears session and localStorage */
		logout: function () {
			if (logedin) {
				storage.clear();

				logedin = false;
				state.logedin = logedin;
				identifier = "";
				password = "";
				sid = "";
				key = "";

				require.wrap("model/userManager", function (err, userManager) {
					userManager.reset();
				});

				//ssn.messages.reset();

				h.getData({"logout" : 1});

				display.logout();
			}
		},

		/** get the own user
		* @param callback is called with the user object
		* @author Nilos
		*/
		getOwnUser: function (callback) {
			step(function loadUManager() {
				require.wrap("model/userManager", this);
			}, h.sF(function (userManager) {
				userManager.getUser(userid, userManager.FULL, this);
			}), callback);
		},

		/** Returns a number between 0 and 10 for the strength of the password.
		* @param password the password to calculate strength for
		* @function
		* @public
		*/
		passwordStrength: function (password) {
			var strength = 0;

			// Adapted from http://www.codeproject.com/KB/scripting/passwordstrength.aspx
			if (password.length > 4) {
				strength += 2; // Greater than 4 chars long
			}

			if (password.match(/[a-z]/) && password.match(/[A-Z]/)) {
				strength += 2; // Mix of upper and lower chars
			}
			if (password.match(/\d+/)) {
				strength += 2; // Contains a number
			}
			if (password.match(/[!,@,#,$,%,\^,&,*,?,_,~,-,(,)]/)) {
				strength += 2; // Contains a special char
			}
			if (password.length > 10) {
				strength += 2; // Longer than 10 chars
			}

			return strength;
		}
	};

	display.setLogin(session.login);

	display.hashHandles.logout = session.logout;

	return session;
});