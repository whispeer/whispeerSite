define (["whispeerHelper", "step", "asset/securedDataWithMetaData"], function (h, step, SecuredData) {
	var database;

	var UNTRUSTED = 0;
	var TIMETRUSTED = 1;
	var WHISPEERVERIFIED = 2;
	var NETWORKVERIFIED = 3;
	var VERIFIED = 4;
	var OWN = 5;

	function keyPairToDataSet(user, trustLevel) {
		return {
			added: new Date().getTime(),
			key: user.getSignKey(),
			userid: user.getID(),
			nickname: user.getNickname(),
			trust: trustLevel || UNTRUSTED
		};
	}

	var trustManager = {
		createDatabase: function (me) {
			var data = {};
			data[me.getSignKey()] = keyPairToDataSet(me, OWN);
			database = new SecuredData(undefined, data);
		},
		loadDatabase: function (data, ownKey, cb) {
			var givenDatabase = new SecuredData(undefined, data);
			step(function () {
				givenDatabase.verify(ownKey, this);
			}, cb);
		},
		reset: function () {
			database = undefined;
		},
		getKeyData: function (keyid) {
			return database.metaAttr(keyid);
		},
		setKeyTrustLevel: function (keyid, trustLevel) {

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