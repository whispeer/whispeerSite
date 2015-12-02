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
			cacheOwnSignature: false,
			saveID: true
		},
		me: {
			maxCount: -1,
			cacheOwnSignature: true,
			saveID: true
		},
		user: {
			maxCount: 500,
			cacheOwnSignature: true,
			saveID: true
		},
		message: {
			maxCount: 100,
			cacheOwnSignature: true,
			saveID: false
		},
		post: {
			maxCount: 100,
			cacheOwnSignature: true,
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

	Database.prototype.allEntries = function () {
		return this.allSignatures().map(function (signatureHash) {
			var entry = h.deepCopyObject(this.getEntry(signatureHash));
			entry.signatureHash = signatureHash;
			return entry;
		}, this);
	};

	Database.prototype.getEntry = function (signatureHash) {
		return this._signatures[signatureHash];
	};

	Database.prototype.deleteByID = function (id) {
		if (!this._saveID) {
			return;
		}

		this.allEntries().filter(function (entry) {
			return entry.id === id;
		}).forEach(function (entry) {
			this.deleteEntry(entry.signatureHash);
		}, this);
	};

	Database.prototype.deleteEntry = function (signatureHash) {
		delete this._signatures[signatureHash];
	};

	Database.prototype.addSignature = function (signature, hash, key, valid, id) {
		if (!valid) {
			return;
		}

		if (typeof valid !== "boolean" || !h.isRealID(key) || !h.isSignature(chelper.bits2hex(signature))) {
			throw new Error("invalid input");
		}

		var sHash = dataSetToHash(signature, hash, key);

		if (this.hasEntry(sHash)) {
			this.getEntry(sHash).date = new Date().getTime();
			return;
		}

		this.deleteByID(id);
		this._signatures[sHash] = this.getCacheEntry(id);

		this._changed = true;

		this.cleanUp();
	};

	Database.prototype.hasEntry = function (signatureHash) {
		if (this._signatures[signatureHash]) {
			return true;
		}

		return false;
	};

	Database.prototype.hasSignature = function (signature, hash, key) {
		var sHash = dataSetToHash(signature, hash, key);
		return this.hasEntry(sHash);
	};

	Database.prototype.cleanUp = function () {
		if (this._maxCount === -1) {
			return;
		}

		var entries = this.allEntries();
		if (entries.length <= this._maxCount) {
			return;
		}

		console.log("Cleaning up database of type " + this._type + " (" + entries.length + ")");

		entries.sort(function (a, b) { return a.date - b.date; });

		entries.slice(0, entries.length - this._maxCount).forEach(function (entry) {
			this.deleteEntry(entry.signatureHash);
		}, this);
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
		load: function (securedData) {

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
