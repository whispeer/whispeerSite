"use strict";
if (typeof (ssn) === "undefined") {
	var ssn = {};
}

/** all session things are handled here 
* @author Nils
* @publicObject
*/
ssn.session = {
	/** register started? are we generating keys? */
	isRegisterStarted: false,
	listeners: [],

	privateKey: null,
	publicKey: null,

	/** user loged in? */
	logedin: false,
	/** loged in user identifier */
	identifier: "",
	/** loged in users password */
	password: "",
	/** session id for currently loged in user */
	session: "",
	/** key of currently logged in user */
	key: null,
	/** main symmetric key of currently logged in user */
	mainKey: null,

	/** add a listener for when keys are ready */
	addListener: function (listener) {
		this.listeners.push(listener);
	},

	/** get the main key */
	getMainKey: function () {
		return this.mainKey;
	},

	/** call all listeners */
	callListener: function () {
		var i;
		for (i = 0; i < this.listeners.length; i += 1) {
			if (typeof this.listeners[i] === "function") {
				this.listeners[i]();
			}
		}

		this.listeners = [];
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
			data : "sid=" + ssn.storage.getItem("session"),
			error : function (obj, error) {
				ssn.display.ajaxError(obj, error);
			},
			success : function (data) {
				data = jQuery.parseJSON(data);
				if (parseInt(data.status, 10) === 1) {
					if (parseInt(data.sessionok, 10) === 1) {
						ssn.session.getStorage();
						ssn.loadData();
					} else {
						ssn.storage.clear();
						ssn.loaded = true;
						ssn.display.loadView("register");
					}
				} else {
					ssn.display.ajaxError();
				}
			}
		});
	},

	/**
	* Should be called when the register process is
	* started e.g. one of the register fields is clicked.
	*/
	registerStarted: function () {
		if (!this.isRegisterStarted) {
			this.isRegisterStarted = true;
			ssn.logger.log("generating keys");

			var that = this;
			ssn.crypto.generate_Key("", function (privateKey, publicKey) {
				that.privateKey = privateKey;
				that.publicKey = publicKey;
				that.callListener();
			});
		}
	},

	/** register with a certain mail, nickname, password and profile
	* @param mail Mail of user
	* @param nickname nickname of user
	* @param password password for user
	* @param profil user profile.
	* @author Nilos
	*/
	register: function (mail, nickname, password, profil) {
		ssn.logger.log("Register: " + mail + " - " + nickname);
		this.registerStarted();

		if (this.privateKey === null) {
			this.addListener(function () {
				ssn.display.register.hideWarning("keygen");
				ssn.session.register(mail, nickname, password, profil);
			});
			ssn.display.register.showWarning("Dein Key wird generiert", "keygen");
			return;
		}

		if (nickname === "" && mail === "") {
			return;
		}

		this.privateKey.setPassword("", password);

		this.registerAjax(mail, nickname, this.privateKey, password, profil);
	},

	/** really send the register request
	* @param mail Mail of user
	* @param nickname nickname of user
	* @param key user key.
	* @param password password for user
	* @param profil user profile.
	* @author Nilos
	*/
	registerAjax: function (mail, nickname, key, password, profil) {
		var hash = ssn.crypto.sha256(password);

		this.privateKey = null;
		this.isRegisterStarted = false;
		var mainKey = new ssn.crypto.sessionKey();
		var profilKey =  new ssn.crypto.sessionKey();
		var wallKey =  new ssn.crypto.sessionKey();
		var shareKey =  new ssn.crypto.sessionKey();

		var data = {};
		if (mail !== "") {
			data.mail = mail;
		}

		if (nickname !== "") {
			data.nickname = nickname;
		}

		var publicProfile = {};
		var privateProfile = {};
		var privateProfileSig = {};

		privateProfile.iv = sjcl.codec.base64.fromBits(sjcl.random.randomWords(4, 0));

		var k;
		for (k in profil) {
			if (profil.hasOwnProperty(k)) {
				if (ssn.userManager.validAttributes[k.toLowerCase()]) {
					if (profil[k].e === "true") {
						privateProfileSig[k] = profil[k].v;
						privateProfile[k] = $.parseJSON(profilKey.encryptText(profil[k].v, privateProfile.iv)).ct;
					} else if (profil[k].e === "false") {
						publicProfile[k] = profil[k].v;
					}
				} else {
					ssn.logger.log("invalid: " + k);
				}
			}
		}

		privateProfile.sig = ssn.crypto.signText(key, $.toJSON(privateProfileSig));
		publicProfile.sig = ssn.crypto.signText(key, $.toJSON(publicProfile));

		data.key = jQuery.parseJSON(key.getJSON());
		data.password = hash;
		data.publicProfile = publicProfile;
		data.privateProfile = privateProfile;
		data.keys =  {
			"main": mainKey.getEncrypted(key),
			"profile": profilKey.getEncrypted(key),
			"wall": wallKey.getEncrypted(key),
			"share": shareKey.getEncrypted(key)
		};

		var encodedData = encodeURIComponent($.toJSON(data));

		//ssn.logger.log("Sending Register Request: " + encodedData);

		$.ajax({
			type: "POST",
			url: "api/session/register.php",
			data: "data=" + encodedData,
			error: function (obj, error) {
				ssn.display.ajaxError(obj, error);
			},
			success: function (data) {
				data = jQuery.parseJSON(data);
				if (parseInt(data.status, 10) === 1) {
					if (parseInt(data.error, 10) === 0) {
						ssn.session.logedin = true;
						if (mail !== "") {
							ssn.session.identifier = mail;
						} else {
							ssn.session.identifier = nickname;
						}

						ssn.session.password = password;
						ssn.session.session = data.session;
						ssn.session.key = key;
						ssn.session.mainKey = mainKey;
						ssn.session.userid = data.userid;
						ssn.session.key.id = data.userid;

						ssn.session.setStorage();

						ssn.loadData();
					} else {
						ssn.display.registerError(data);
					}
				}
			}
		});
	},

	/** save all data to localStorage */
	setStorage: function () {
		ssn.storage.setItem("logedin", this.logedin);
		ssn.storage.setItem("identifier", this.identifier);
		ssn.storage.setItem("password", this.password);
		ssn.storage.setItem("session", this.session);
		ssn.storage.setItem("key", this.key.getEncrypted());
		ssn.storage.setItem("mainKey", this.mainKey.getOriginal());
	},

	/** get all data from localStorage */
	getStorage: function () {
		this.logedin = ssn.storage.getItem("logedin");
		this.identifier = ssn.storage.getItem("identifier");
		this.password = ssn.storage.getItem("password");
		this.session = ssn.storage.getItem("session");
		this.key = new ssn.crypto.privateKey(ssn.storage.getItem("key"), this.password);
		this.mainKey = new ssn.crypto.sessionKey(ssn.storage.getItem("mainKey"));
		this.mainKey.decryptKey(this.key);
		this.userid = this.key.id;
	},

	/** get session id */
	getSID: function () {
		return this.session;
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
	login: function (identifier, password) {
		ssn.logger.log("Login: " + identifier);

		var hash = ssn.crypto.sha256(password);

		try {
			ssn.display.loginStarted();
		} catch (e) { ssn.logger.log(e); }

		var data = {};
		data.identifier = identifier;
		data.password = hash;

		$.ajax({
			type : "POST",
			url : "api/session/login.php",
			data : "data=" + encodeURI($.toJSON(data)),
			error : function (obj, error) {
				ssn.display.ajaxError(obj, error);
			},
			success : function (data) {
				try {
					data = jQuery.parseJSON(data);
				} catch (e) {
					ssn.display.ajaxError();
					return;
				}

				var status = parseInt(data.status, 10);

				if (parseInt(status, 10) === 1) {
					if (parseInt(data.loginok, 10) === 1) {
						ssn.logger.log("Login ok! session:"
										+ data.session);

						ssn.session.logedin = true;
						ssn.session.identifier = identifier;
						ssn.session.password = password;
						ssn.session.session = data.session;
						ssn.session.key = new ssn.crypto.privateKey($.toJSON(data.key), password);
						ssn.session.mainKey = new ssn.crypto.sessionKey(data.mainKey);
						ssn.session.mainKey.decryptKey(ssn.session.key);
						ssn.session.userid = ssn.session.key.id;

						ssn.session.setStorage();

						ssn.display.loginSuccess();
						ssn.loadData();
					} else {
						ssn.display.loginError(data.errorCode);
					}
				} else {
					ssn.display.ajaxError();
				}
			}
		});
	},

	/** log out. clears session and localStorage */
	logout: function () {
		if (ssn.session.logedin) {
			ssn.storage.clear();

			ssn.session.logedin = false;
			ssn.session.identifier = "";
			ssn.session.password = "";
			ssn.session.session = "";
			ssn.session.key = "";

			ssn.userManager.reset();
			//ssn.messages.reset();

			ssn.helper.getData({"logout" : 1});

			ssn.display.logout();
		}
	},

	/** get the own user
	* @param callback is called with the user object
	* @author Nilos
	*/
	getOwnUser: function (callback) {
		ssn.userManager.getUser(ssn.session.userid, ssn.userManager.FULL, callback);
	},

	/**
	 * Überprüft beim Server ob eine Mail schon existiert und ob die Mail Valide
	 * ist.
	 * 
	 * @param mail:
	 *            Mail zu testen
	 * @param callback:
	 *            funktion die mit dem ergebnis aufgerufen wird
	 *            (callback(true/false, true/false, mail))
	 */
	checkMail : function (mail, callback) {
		$.ajax({
			type : "GET",
			url : "api/session/checkMail.php",
			data : "mail=" + mail,
			error : function (obj, error) {
				ssn.display.ajaxError(obj, error);
			},
			success : function (data) {
				try {
					data = jQuery.parseJSON(data);
				} catch (e) {
					ssn.display.ajaxError();
				}

				callback(parseInt(data.mailUsed, 10) === 0, parseInt(data.mailValid, 10) === 1, mail);
			}
		});
	},

	/**
	 * Überprüft beim Server ob eine Mail schon existiert und ob die Mail Valide
	 * ist.
	 * 
	 * @param mail:
	 *            Mail zu testen
	 * @param callback:
	 *            funktion die mit dem ergebnis aufgerufen wird
	 *            (callback(true/false, true/false, mail))
	 */
	checkNickname : function (nickname, callback) {
		$.ajax({
			type : "GET",
			url : "api/session/checkNickname.php",
			data : "nickname=" + nickname,
			error : function (obj, error) {
				ssn.display.ajaxError(obj, error);
			},
			success : function (data) {
				try {
					data = jQuery.parseJSON(data);
				} catch (e) {
					ssn.display.ajaxError();
				}

				callback(parseInt(data.nicknameUsed, 10) === 0, parseInt(data.nicknameValid, 10) === 1, nickname);
			}
		});
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