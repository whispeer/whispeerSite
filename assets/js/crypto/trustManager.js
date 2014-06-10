define (["whispeerHelper", "step", "asset/securedDataWithMetaData", "asset/enum"], function (h, step, SecuredData, Enum) {
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
		return {
			added: new Date().getTime(),
			key: user.getSignKey(),
			userid: user.getID(),
			nickname: user.getNickname(),
			trust: serializeTrust(trustLevel || trustStates.UNTRUSTED)
		};
	}

	trustManager = {
		trustStates: trustStates,
		isLoaded: function () {
			return loaded;
		},
		createDatabase: function (me) {
			var data = {};
			data[me.getSignKey()] = userToDataSet(me, trustStates.OWN);
			database = new SecuredData(undefined, data);

			loaded = true;
		},
		loadDatabase: function (data, ownKey, cb) {
			var givenDatabase = new SecuredData(undefined, data);
			step(function () {
				givenDatabase.verify(ownKey, this);
			}, h.sF(function () {
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
			return database.metaHasAttr(keyid);
		},
		getKeyData: function (keyid) {
			var keyData = database.metaAttr(keyid);

			if (keyData) {
				keyData.trust = unserializeTrust(keyData.trust);
			}

			return keyData;
		},
		addUser: function (user) {
			var signKey = user.getSignKey();
			database.metaAdd([signKey], userToDataSet(user));
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