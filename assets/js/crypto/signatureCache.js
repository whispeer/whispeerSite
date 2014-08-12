define (["whispeerHelper", "step", "asset/observer", "asset/errors", "crypto/keyStore", "crypto/helper", "asset/securedDataWithMetaData"], function (h, step, Observer, errors, keyStore, chelper, SecuredData) {
	"use strict";
	var database, loaded = false, signKey, changed = false, signing = false;

	function dataSetToHash(signature, hash, key) {
		var data = {
			signature: chelper.bits2hex(signature),
			signatureHash: chelper.bits2hex(hash),
			key: key
		};

		return keyStore.hash.hashObjectOrValueHex(data);
	}

	var trustManager = {
		isLoaded: function () {
			return loaded;
		},
		isChanged: function () {
			return changed;
		},
		createDatabase: function (ownKey) {
			var data = {};

			signKey = ownKey;
			data.me = ownKey;

			database = new SecuredData.load(undefined, data);
			loaded = true;
		},
		loadDatabase: function (data, ownKey, cb) {
			var givenDatabase = new SecuredData.load(undefined, data);
			step(function () {
				if (data.me === ownKey) {
					givenDatabase.verify(ownKey, this);
				} else {
					throw new errors.SecurityError("not my signature cache");
				}
			}, h.sF(function () {
				signKey = ownKey;
				database = givenDatabase;
				loaded = true;

				trustManager.notify("", "loaded");

				this.ne();
			}), cb);
		},
		isSignatureInCache: function (signature, hash, key) {
			var sHash = dataSetToHash(signature, hash, key);
			if (database.metaHasAttr(sHash)) {
				return true;
			}

			return false;
		},
		getSignatureStatus: function (signature, hash, key) {
			var sHash = dataSetToHash(signature, hash, key);
			if (database.metaHasAttr(sHash)) {
				var data = database.metaAttr(sHash);

				return (data === true);
			} else {
				throw new Error("tried to get signature status but not in cache!");
			}
		},
		addSignatureStatus: function (signature, hash, key, valid) {
			if (signing) {
				return;
			}

			changed = true;

			if (typeof valid !== "boolean" || !h.isRealID(key) || !h.isSignature(chelper.bits2hex(signature))) {
				throw new Error("invalid input");
			}

			var sHash = dataSetToHash(signature, hash, key);

			var newData = {};
			newData[sHash] = valid;

			database.metaJoin(newData);
		},
		reset: function () {
			loaded = false;
			database = undefined;
		},
		getUpdatedVersion: function (cb) {
			changed = false;
			signing = true;
			step(function () {
				database.sign(signKey, cb);
			}, h.sF(function (result) {
				signing = false;
				this.ne(result);
			}), cb);
		}
	};

	Observer.call(trustManager);

	return trustManager;
});