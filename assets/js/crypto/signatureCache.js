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
	*/

	var types = {
		signatureCache: {
			maxCount: -1,
			cacheOwnSignature: true,
			saveID: true
		},
		me: {
			maxCount: -1,
			saveID: true
		},
		user: {
			maxCount: 500,
			saveID: true
		},
		message: {
			maxCount: 100,
			saveID: false
		},
		post: {
			maxCount: 100,
			saveID: false
		}
	};

	var cacheTypes = {
		signatureCache: "signatureCache",

		signedKeys: "user",
		signedFriendList: "user",
		profile: "user",

		circle: "me",
		trustManager: "me",
		settings: "me",

		topic: "message", 
		message: "message",

		post: "post",

		comment: "noCache",
		friendShip: "noCache",
		removeFriend: "noCache"
	};
	
	var Database = function (type, options) {
		this._type = type;

		this._cacheOwnSignature = options.cacheOwnSignature || false;
		this._maxCount = options.maxCount;
		this._saveID = options.saveID;

		this._changed = false;

		this._signatures = {};
	};

	Database.prototype.isChanged = function () {
		return this._changed;
	};

	Database.prototype.getCacheEntry = function (id) {
		var entry = {};
		if (this._maxCount > -1) {
			entry.date = new Date().getTime();
		}

		if (this._saveID) {
			entry.id = id;
		}
	};

	Database.prototype.addSignature = function (signature, hash, key, valid, id) {
		if (!valid) {
			return;
		}

		this._changed = true;

		if (typeof valid !== "boolean" || !h.isRealID(key) || !h.isSignature(chelper.bits2hex(signature))) {
			throw new Error("invalid input");
		}

		var sHash = dataSetToHash(signature, hash, key);

		this._signatures[sHash] = this.getCacheEntry(id);

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
		if (this._maxCount === -1) {
			return;
		}

		var hashes = this.allHashes();
		if (hashes.length > this._maxCount) {
			console.log("Cleaning up database of type " + this._type + " (" + hashes.length + ")");

			var times = hashes.map(function (key) {
				return {
					time: this._signatures[key].date,
					key: key
				};
			}, this);

			times.sort(function (a, b) { return a.time - b.time; });

			var remove = times.slice(0, times.length - this._maxCount);

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
		databaseSecured.sign(signKey, cb, this._cacheOwnSignature);
	};

	Database.prototype.allSignatures = function () {
		return Object.keys(this._signatures);
	};

	var allDatabases = [];
	h.objectEach(types, function (key, val) {
		types[key] = new Database(key, val);
		allDatabases.push(types[key]);
	});

	var api2 = {
		isChanged: function () {

		},
		load: function (securedData, type, cb) {

		},
		getUpdatedVersion: function () {

		},
		isSignatureInCache: function (signature, hash, key) {
			var sHash = dataSetToHash(signature, hash, key);

			return allDatabases.filter(function (database) {
				return database.metaHasAttr(sHash);
			}).length > 0;
		},
		addSignatureStatus: function (signature, hash, key, valid, type) {
			if (!valid) {
				return;
			}

			if (typeof valid !== "boolean" || !h.isRealID(key) || !h.isSignature(chelper.bits2hex(signature))) {
				throw new Error("invalid input");
			}

			var reducedType = cacheTypes[type];

			if (!reducedType) {
				console.warn("unknown type: " + type);
				return;
			}

			if (reducedType === "noCache") {
				return;
			}

			var sHash = dataSetToHash(signature, hash, key);
			var db = types[reducedType];
			db.metaSetAttr(sHash, new Date().getTime());

			db.cleanUp();
		},
		getSignatureStatus: function (signature, hash, key, type) {
			var sHash = dataSetToHash(signature, hash, key);
			if (database.metaHasAttr(sHash)) {
				var data = database.metaAttr(sHash);

				api2.addSignatureStatus(signature, hash, key, type);

				return (data !== false);
			} else {
				throw new Error("tried to get signature status but not in cache!");
			}
		},
		getUpdatedVersion: function () {

		}
	};

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
