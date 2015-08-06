define (["whispeerHelper", "step", "asset/observer", "asset/errors", "crypto/keyStore", "crypto/helper", "asset/securedDataWithMetaData"], function (h, step, Observer, errors, keyStore, chelper, SecuredData) {
	"use strict";
	var database, loaded = false, signKey, changed = false;

	function dataSetToHash(signature, hash, key) {
		var data = {
			signature: chelper.bits2hex(signature),
			signatureHash: chelper.bits2hex(hash),
			key: key
		};

		return keyStore.hash.hashObjectOrValueHex(data);
	}

	/*
		user:  signedKeys, signedFriendList, profile
		me: circle, trustManager, settings
		message: topic, message
		post: post, comment
		noCache: friendShip, removeFriend

		noCache: friendShip, removeFriend

	*/

	var types = {
		signatureCache: {
			sync: -1,
			local: -1,
			noCache: true
		},
		me: {
			sync: -1,
			local: -1
		},
		user: {
			sync: 100,
			local: 500
		},
		message: {
			sync: 20,
			local: 100
		},
		post: {
			sync: 10,
			local: 100
		}
	};

	var cacheTypes = {
		signatureCache: "signatureCache",

		/* sync: 100, local: 500 */
		signedKeys: "user",
		signedFriendList: "user",
		profile: "user",

		/* sync: all, local: all */
		circle: "me",
		trustManager: "me",
		settings: "me",

		/* sync: 10, local: 50 */
		topic: "message", 
		message: "message",

		/* sync: 10, local: 50 */
		post: "post",

		comment: "noCache",
		friendShip: "noCache",
		removeFriend: "noCache"
	};
	
	var Database = function (type, options) {
		this._type = type;

		this._noCache = options.noCache || false;
		this._syncMax = options.sync;
		this._localMax = options.local;
		this._changed = false;

		this._signatures = {};
	};

	Database.prototype.isChanged = function () {
		return this._changed;
	};

	Database.prototype.addSignature = function (signature, hash, key, valid) {
		if (!valid) {
			return;
		}

		this._changed = true;

		if (typeof valid !== "boolean" || !h.isRealID(key) || !h.isSignature(chelper.bits2hex(signature))) {
			throw new Error("invalid input");
		}

		var sHash = dataSetToHash(signature, hash, key);

		this._signatures[sHash] = new Date().getTime();

		this.cleanUp();
	};

	Database.prototype.hasSignature = function (signature, hash, key) {
		var sHash = dataSetToHash(signature, hash, key);
		if (this._signatures[sHash]) {
			return true;
		}

		return false;
	};

	Database.prototype.cleanUp = function () {
		var hashes = this.allHashes();
		if (hashes.length > this._localMax) {
			console.log("Cleaning up database of type " + this._type + " (" + hashes.length + ")");
			//clean it fix it do it make it
			var times = hashes.map(function (key) {
				return {
					time: this._signatures[key],
					key: key
				};
			}, this);

			times.sort(function (a, b) { return a.time - b.time; });

			var remove = times.slice(0, times.length - this._localMax);

			remove.forEach(function (hash) {
				delete this._signatures[hash];
			}, this);
		}
	};

	Database.prototype.addSignaturesFromSecured = function (data, cb) {
		var givenDatabase = new SecuredData.load(undefined, data, { type: "signatureCache" });
		step(function () {
			if (data.me === signKey) {
				givenDatabase.verify(signKey, this);
			} else {
				throw new errors.SecurityError("not my signature cache");
			}
		}, h.sF(function () {
			var newSignatures = givenDatabase.metaAttr("signatures");

			h.objectEach(newSignatures, function (key, value) {
				this._signatures[key] = value;
			}, this);

			this.ne();
		}), cb);
	};

	Database.prototype.getUpdatedVersion = function (cb) {
		this._changed = false;

		var databaseSecured = new SecuredData.load(undefined, {
			me: signKey,
			signatures: this._signatures
		}, { type: "signatureCache" });
		databaseSecured.sign(signKey, cb, this._noCache);
	};

	Database.prototype.allSignatures = function () {
		return Object.keys(this._signatures);
	};

	h.objectEach(types, function (key, val) {
		types[key] = new Database(key, val);
	});

	function allHashes() {
		return database.metaKeys().filter(function (key) {
				return key.indexOf("hash::") === 0;
		});
	}

	function cleanUpDatabase() {
		if (allHashes().length > 500) {
			console.log("Cleaning up database (" + allHashes().length + ")");
			var times = allHashes().map(function (key) {
				return database.metaAttr(key);
			});

			times.sort(function (a, b) { return b - a; });

			var border = times[400] + 200;

			allHashes().forEach(function (key) {
				if (database.metaAttr(key) < border) {
					database.metaRemoveAttr(key);
					changed = true;
				}
			});

			console.log("Cleaned up database (" + allHashes().length + ")");
		}
	}

	var signatureCache = {
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

			database = new SecuredData.load(undefined, data, { type: "signatureCache" });
			loaded = true;

			signatureCache.notify("", "loaded");
		},
		loadDatabase: function (data, ownKey, cb) {
			var givenDatabase = new SecuredData.load(undefined, data, { type: "signatureCache" });
			step(function () {
				if (data.me === ownKey) {
					givenDatabase.verify(ownKey, this);
				} else {
					throw new errors.SecurityError("not my signature cache");
				}
			}, h.sF(function () {
				//migrate database here before really loading it if necessary
				givenDatabase.metaKeys().filter(function (key) {
					return key.indexOf("hash::") === 0 && typeof givenDatabase.metaAttr(key) === "boolean";
				}).forEach(function (key) {
					if (givenDatabase.metaAttr(key) === false) {
						givenDatabase.metaRemoveAttr(key);
					} else {
						givenDatabase.metaSetAttr(key, new Date().getTime());
					}

					changed = true;
				});

				this.ne();
			}), h.sF(function () {
				signKey = ownKey;
				database = givenDatabase;
				loaded = true;

				signatureCache.notify("", "loaded");

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
		getSignatureStatus: function (signature, hash, key, type) {
			var sHash = dataSetToHash(signature, hash, key);
			if (database.metaHasAttr(sHash)) {
				var data = database.metaAttr(sHash);

				changed = true;
				database.metaSetAttr(sHash, new Date().getTime());

				cleanUpDatabase();

				return (data !== false);
			} else {
				throw new Error("tried to get signature status but not in cache!");
			}
		},
		addSignatureStatus: function (signature, hash, key, valid, type) {
			if (!valid) {
				return;
			}

			changed = true;

			if (typeof valid !== "boolean" || !h.isRealID(key) || !h.isSignature(chelper.bits2hex(signature))) {
				throw new Error("invalid input");
			}

			var sHash = dataSetToHash(signature, hash, key);

			database.metaSetAttr(sHash, new Date().getTime());

			cleanUpDatabase();
		},
		reset: function () {
			loaded = false;
			database = undefined;
		},
		getUpdatedVersion: function (cb) {
			changed = false;

			step(function () {
				database.sign(signKey, cb, true);
			}, cb);
		}
	};

	Observer.call(signatureCache);

	return signatureCache;
});
