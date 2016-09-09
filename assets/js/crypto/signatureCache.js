define (["whispeerHelper", "step", "config", "asset/observer", "asset/errors", "crypto/keyStore", "crypto/helper", "bluebird"], function (h, step, config, Observer, errors, keyStore, chelper, Bluebird) {
	"use strict";
	var loaded = false, changed = false, signKey, isLoaded = {};

	isLoaded.promise = new Bluebird(function (resolve) {
		isLoaded.promiseResolve = resolve;
	});

	function dataSetToHash(signature, hash, key) {
		var data = {
			signature: chelper.bits2hex(signature),
			signatureHash: chelper.bits2hex(hash),
			key: key
		};

		return keyStore.hash.hashObjectOrValueHex(data, config.hashVersion);
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
		topic: {
			maxCount: 30,
			saveID: false
		},
		message: {
			maxCount: 200,
			saveID: false
		},
		post: {
			maxCount: 100,
			saveID: false
		}
	};

	var cacheTypes = {
		signatureCache: "noCache",

		signedKeys: "user",
		signedFriendList: "user",
		profile: "user",

		circle: "me",
		trustManager: "me",
		settings: "me",

		topic: "topic",
		topicUpdate: "topic",
		message: "message",

		post: "post",
		postPrivate: "post",

		comment: "noCache",
		friendShip: "noCache",
		removeFriend: "noCache"
	};
	
	var Database = function (type, options) {
		this._type = type;

		this._maxCount = options.maxCount;
		this._saveID = options.saveID;

		this._signatures = {};
	};

	Database.prototype.getType = function () {
		return this._type;
	};

	Database.prototype.getCacheEntry = function (id) {
		var entry = {};
		if (this._maxCount > -1) {
			entry.date = new Date().getTime();
		}

		if (this._saveID && id) {
			entry.id = id;
		}

		return entry;
	};

	Database.prototype.allEntries = function () {
		return this.allSignatures().map(function (signatureHash) {
			var entry = h.deepCopyObj(this.getEntry(signatureHash));
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

			if (!this._signatures[signatureHash]) {
				this._signatures[signatureHash] = entry;
			}
		}, this);
	};

	Database.prototype.deleteByID = function (id) {
		if (!this._saveID || !id) {
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

		changed = true;

		this.deleteByID(id);
		this._signatures[sHash] = this.getCacheEntry(id);

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
		awaitLoading: function () {
			return isLoaded.promise;
		},
		/**
		* Has the signature cache changed? (was a signature added/removed?)
		*/
		isChanged: function () {
			return changed;
		},
		resetChanged: function () {
			changed = false;
		},
		isLoaded: function () {
			return loaded;
		},
		/**
		* Load a given signature cache
		* @param signatureCacheData signature cache data to load.
		* @param ownKey own signing key
		*/
		load: function (signatureCacheData, ownKey) {
			if (signatureCacheData.internalHashVersion !== config.hashVersion) {
				console.warn("resetting signature cache to upgrade to new hash version");
				signatureCache.initialize(ownKey);

				return;
			}

			if (signatureCacheData.me !== ownKey) {
				console.warn("not my signature cache");
				signatureCache.initialize(ownKey);

				return;
			}

			signatureCacheData.databases.forEach(function (db) {
				types[db.type].joinEntries(db.entries);
			});

			signatureCache.initialize(ownKey);
		},
		/**
		* Initialize cache
		* @param ownKey id of the own sign key
		*/
		initialize: function (ownKey) {
			signKey = ownKey;
			loaded = true;

			isLoaded.promiseResolve();
		},
		/**
		* Get the signed updated version of this signature cache
		*/
		getUpdatedVersion: function () {
			if (!loaded) {
				return Bluebird.reject("Signature Cache not yet loaded!");
			}

			var databases = allDatabases.map(function (db) {
				return {
					type: db.getType(),
					entries: db.allEntries()
				};
			});

			var data = {
				me: signKey,
				internalHashVersion: config.hashVersion,
				databases: databases
			};

			return Bluebird.resolve(data);
		},
		/**
		* Check if a signature is in the cache
		* @param signature the signature to check for
		* @param hash hash that was signed
		* @param key key that was used to sign the signature
		*/
		isValidSignatureInCache: function (signature, hash, key) {
			var sHash = dataSetToHash(signature, hash, key);

			return allDatabases.filter(function (database) {
				return database.hasEntry(sHash);
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

			if (id) {
				id = type + "-" + id;
			}

			var db = types[reducedType];
			db.addSignature(signature, hash, key, id);
		}
	};

	Observer.call(signatureCache);

	return signatureCache;
});
