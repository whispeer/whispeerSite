define (["whispeerHelper", "step", "asset/securedDataWithMetaData", "asset/Enum"], function (h, step, SecuredData, Enum) {
	var database;

	var trustStates = new Enum("UNTRUSTED", "TIMETRUSTED", "WHISPEERVERIFIED", "NETWORKVERIFIED", "VERIFIED", "OWN");

	function keyPairToDataSet(user, trustLevel) {
		return {
			added: new Date().getTime(),
			key: user.getSignKey(),
			userid: user.getID(),
			nickname: user.getNickname(),
			trust: trustLevel || trustStates.UNTRUSTED
		};
	}

	var trustManager = {
		trustStates: trustStates,
		createDatabase: function (me) {
			var data = {};
			data[me.getSignKey()] = keyPairToDataSet(me, trustStates.OWN);
			database = new SecuredData(undefined, data);
		},
		loadDatabase: function (data, ownKey, cb) {
			var givenDatabase = new SecuredData(undefined, data);
			step(function () {
				givenDatabase.verify(ownKey, this);
			}, h.sF(function () {
				database = givenDatabase;
				this.ne();
			}), cb);
		},
		reset: function () {
			database = undefined;
		},
		hasKeyData: function (keyid) {
			return database.metaHasAttr(keyid);
		},
		getKeyData: function (keyid) {
			if (database.metaHasAttr(keyid)) {
				return database.metaAttr(keyid);
			} else {
				return false;
			}
		},
		setKeyTrustLevel: function (user, trustLevel) {
			var signKey = user.getSignKey();
			if (database.metaHasAttr(signKey)) {
				database.metaAdd([signKey, "trust"], trustLevel);
			} else {
				database.metaAdd([signKey], keyPairToDataSet(user, trustLevel));
			}

			return database.isChanged();
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