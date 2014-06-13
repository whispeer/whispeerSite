define (["whispeerHelper", "step", "asset/securedDataWithMetaData", "asset/enum", "asset/errors"], function (h, step, SecuredData, Enum, errors) {
	var database, loaded = false, trustManager;

	var trustStates = new Enum("BROKEN", "UNTRUSTED", "TIMETRUSTED", "WHISPEERVERIFIED", "NETWORKVERIFIED", "VERIFIED", "OWN");

	function serializeTrust(trustLevel) {
		return trustStates.toString(trustLevel);
	}

	function unserializeTrust(trustLevel) {
		return trustStates.fromString(trustLevel);
	}

	function keyTrustData(data) {
		var trustSymbol = unserializeTrust(data.trust);

		this.getAddedTime = function () {
			return data.added;
		};
		this.getKey = function () {
			return data.key;
		};
		this.getUserID = function () {
			return data.userid;
		};
		this.getNickname = function () {
			return data.nickname;
		};
		this.getTrust = function () {
			return trustSymbol;
		};


		this.isUntrusted = function () {
			return trustSymbol === trustStates.UNTRUSTED;
		};
		this.isTimeTrusted  = function () {
			return trustSymbol === trustStates.TIMETRUSTED;
		};
		this.isWhispeerVerified  = function () {
			return trustSymbol === trustStates.WHISPEERVERIFIED;
		};
		this.isNetworkVerified  = function () {
			return trustSymbol === trustStates.NETWORKVERIFIED;
		};
		this.isVerified = function () {
			return trustSymbol === trustStates.VERIFIE;
		};
		this.isOwn = function () {
			return trustSymbol === trustStates.OWN;
		};

		this.setTrust = function (trustLevel) {
			trustManager.setKeyTrustLevel(data.key, trustLevel);
		};
	}

	function userToDataSet(user, trustLevel) {
		var content = {
			added: new Date().getTime(),
			key: user.getSignKey(),
			userid: user.getID(),
			trust: serializeTrust(trustLevel || trustStates.UNTRUSTED)
		};

		if (user.getNickname()) {
			content.nickname = user.getNickname();
		}

		return content;
	}

	var fakeKeyExistence = 0;

	trustManager = {
		allow: function (count) {
			if (!loaded) {
				fakeKeyExistence = count;
			}
		},
		disallow: function () {
			fakeKeyExistence = 0;
		},
		trustStates: trustStates,
		isLoaded: function () {
			return loaded;
		},
		createDatabase: function (me) {
			var data = {};

			data.nicknames = {};
			data.ids = {};

			var signKey = me.getSignKey();

			data[signKey] = userToDataSet(me, trustStates.OWN);
			if (me.getNickname()) {
				data.nicknames[me.getNickname()] = signKey;
			}
			data.ids[me.getID()] = signKey;

			data.me = me.getSignKey();

			database = new SecuredData(undefined, data);

			loaded = true;
		},
		loadDatabase: function (data, ownKey, cb) {
			var givenDatabase = new SecuredData(undefined, data);
			step(function () {
				trustManager.allow(1);
				if (data.me === ownKey) {
					givenDatabase.verify(ownKey, this);
				} else {
					throw new errors.SecurityError("not my trust database");
				}
			}, h.sF(function () {
				trustManager.disallow();
				database = givenDatabase;
				loaded = true;

				this.ne();
			}), cb);
		},
		reset: function () {
			loaded = false;
			database = undefined;
		},
		hasKeyData: function (keyid) {
			if (fakeKeyExistence > 0 && !loaded) {
				fakeKeyExistence -= 1;
				return true;
			}
			return database.metaHasAttr(keyid);
		},
		getKeyData: function (keyid) {
			var keyData = database.metaAttr(keyid);

			if (keyData) {
				return new keyTrustData(keyData);
			}

			return false;
		},
		addUser: function (user) {
			var signKey = user.getSignKey();

			var idKey = database.metaAttr(["ids", user.getID()]);
			var nicknameKey = database.metaAttr(["nicknames", user.getNickname()]);

			if (idKey && idKey !== signKey) {
				throw new errors.SecurityError("we already have got a key for this users id");
			}

			if (nicknameKey && nicknameKey !== signKey) {
				throw new errors.SecurityError("we already have got a key for this users nickname");
			}

			database.metaAdd([signKey], userToDataSet(user));

			if (user.getNickname()) {
				database.metaAdd(["nicknames", user.getNickname()], signKey);
			}

			database.metaAdd(["ids", user.getID()], signKey);

		},
		setKeyTrustLevel: function (signKey, trustLevel) {
			if (trustLevel === trustStates.OWN) {
				throw new Error("do not use setKeyTrustLevel for own keys.");
			}

			if (database.metaHasAttr(signKey)) {
				database.metaAdd([signKey, "trust"], serializeTrust(trustLevel));

				return true;
			}

			return false;
		},
		getUpdatedVersion: function (signKey, cb) {
			step(function () {
				database.sign(signKey, this);
			}, cb);
		}
	};

	Object.freeze(trustManager);

	return trustManager;
});