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

		this._maxCount = options.maxCount;
		this._saveID = options.saveID;

		this._changed = false;

		this._signatures = {};
	};

	Database.prototype.getType = function () {
		return this._type;
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

	Database.prototype.joinEntries = function (entries) {
		entries.forEach(function (entry) {
			var signatureHash = entry.signatureHash;

			delete entry.signatureHash;

			if (!this[signatureHash]) {
				this[signatureHash] = entry;
			}
		}, this);
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

	Database.prototype.addSignature = function (signature, hash, key, id) {
		if (!h.isRealID(key) || !h.isSignature(chelper.bits2hex(signature))) {
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
	h.objectEach(types, function (name, val) {
		types[name] = new Database(name, val);
		allDatabases.push(types[name]);
	});

	var signatureCache = {
		/**
		* Has the signature cache changed? (was a signature added/removed?)
		*/
		isChanged: function () {
			return allDatabases.reduce(h.or, false);
		},
		/**
		* Load a given signature cache
		* @param securedData secured data of the signature cache to load
		* @param ownKey own signing key
		*/
		load: function (securedData, ownKey) {
			if (securedData.me !== ownKey) {
				console.warn("not my signature cache");
				signatureCache.initialize(ownKey);

				return;
			}

			SecuredData.load(undefined, securedData, { type: "signatureCache" }).verify(ownKey).then(function () {
				securedData.databases.forEach(function (db) {
					types[db.type].joinEntries(db.entries);
				});

				signatureCache.initialize(ownKey);
			});
		},
		/**
		* Initialize cache
		* @param ownKey id of the own sign key
		*/
		initialize: function (ownKey) {
			signKey = ownKey;
			loaded = true;

			signatureCache.notify("", "loaded");
		},
		/**
		* Get the signed updated version of this signature cache
		*/
		getUpdatedVersion: function () {
			if (!loaded) {
				return;
			}

			var databases = allDatabases.map(function (db) {
				return {
					type: db.getType(),
					entries: db.allEntries()
				};
			});

			var data = {
				me: signKey,
				databases: databases
			};

			return SecuredData.load(undefined, data, { type: "signatureCache" }).sign(signKey);
		},
		/**
		* Check if a signature is in the cache
		* @param signature the signature to check for
		* @param hash hash that was signed
		* @param key key that was used to sign the signature
		*/
		isSignatureInCache: function (signature, hash, key) {
			var sHash = dataSetToHash(signature, hash, key);

			return allDatabases.filter(function (database) {
				return database.metaHasAttr(sHash);
			}).length > 0;
		},
		/**
		* Add a valid signature to the cache.
		* @param signature the signature to add
		* @param hash the hash that was signed by the signature
		* @param key the key used to verify the signature
		* @param type type of the signed object
		* @param (id) id of the signed object
		*/
		addValidSignature: function (signature, hash, key, type, id) {
			if (!h.isRealID(key) || !h.isSignature(chelper.bits2hex(signature))) {
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

			var db = types[reducedType];
			db.addSignature(signature, hash, key, type + "-" + id);
		},
		/**
		* Get a signature status.
		* @param signature the signature to check for
		* @param hash hash that was signed
		* @param key key that was used to sign the signature
		* @throws if the signature is not in the cache. use isSignatureInCache to determine if a signature is in the cache.
		*/
		getSignatureStatus: function (signature, hash, key) {
			var sHash = dataSetToHash(signature, hash, key);
			if (database.hasEntry(sHash)) {
				return true;
			} else {
				throw new Error("tried to get signature status but not in cache!");
			}
		}
	};

	Observer.call(signatureCache);

	return signatureCache;
});
