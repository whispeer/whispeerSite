import * as Bluebird from "bluebird";

import CacheServiceType from "./Cache";
import socketService from "./socket.service";

import CacheService from './Cache';

import { errorServiceInstance } from "./error.service";
import sessionService from "./session.service";

const initService = require("services/initService");

const h = require("whispeerHelper");
const trustManager = require("crypto/trustManager");
const signatureCache = require("crypto/signatureCache");

const userService = require("user/userService");

const debug = require("debug");

const THROTTLE = 20, STORESIGNATURECACHEINTERVAL = 30000;

const debugName = "whispeer:trustService";
const trustServiceDebug = debug(debugName);

function time(name: string) {
	if (debug.enabled(debugName)) {
		console.time(name);
	}
}

function timeEnd(name: string) {
	if (debug.enabled(debugName)) {
		console.timeEnd(name);
	}
}

class TrustService {
	private signatureCacheObject: CacheServiceType;
	private trustManagerCache: CacheServiceType;

	private delay: any;

	private loadCachePromise = Bluebird.resolve();

	constructor() {
		this.signatureCacheObject = new CacheService("signatureCache");
		this.trustManagerCache = new CacheService("trustManager.get");

		this.delay = h.aggregateOnce(THROTTLE, this.uploadDatabase);
		window.setInterval(this.storeSignatureCache, STORESIGNATURECACHEINTERVAL);
		userService.listen(this.addNewUsers, "loadedUser");

		initService.get("trustManager.get", this.onInit, {
			cacheCallback: this.loadFromCache,
			cache: true
		});

		socketService.channel("notify.trustManager", function (_e: any, data: any) {
			trustManager.updateDatabase(data, errorServiceInstance.criticalError);
		});

		this.waitForLogin();
	}

	private waitForLogin() {
		sessionService.listenPromise("ssn.login").then(() => {
			time("getSignatureCache");
			return this.signatureCacheObject.get(sessionService.getUserID().toString()).catch(function () {
				return;
			});
		}).then((signatureCacheData: any) => {
			timeEnd("getSignatureCache");
			return Bluebird.race([
				userService.verifyOwnKeysCacheDone(),
				userService.verifyOwnKeysDone()
			]).thenReturn(signatureCacheData);
		}).then((signatureCacheData: any) => {
			if (signatureCacheData) {
				signatureCache.load(signatureCacheData.data, userService.getown().getSignKey());
			} else {
				signatureCache.initialize(userService.getown().getSignKey());
			}
		});
	}

	private onInit = (data: any) => {
		trustServiceDebug("trustManager.get finished unchanged: " + data.unChanged);
		return this.loadCachePromise.catch(function (e: any) {
			trustServiceDebug("Could not load trust service from cache!");
			console.error(e);
		}).then(() => {
			return userService.verifyOwnKeysDone();
		}).then(() => {
			if (data.unChanged) {
				if (!trustManager.isLoaded()) {
					throw new Error("cache loading seems to have failed but server is unchanged!");
				}

				trustServiceDebug("trustManager unChanged");
				return;
			}

			trustServiceDebug("trustManager get loading");

			if (trustManager.isLoaded()) {
				trustServiceDebug("trustManager cache exists updating");

				return trustManager.updateDatabase(data.content).then(function () {
					return false;
				});
			}

			if (data.content) {
				trustServiceDebug("load content");
				return this.loadDatabase(data.content);
			}

			trustServiceDebug("create new trust database!");
			return this.createTrustDatabase();
		});
	}

	private uploadDatabase = (cb?: Function) => {
		return initService.awaitLoading().then(() => {
			return trustManager.getUpdatedVersion();
		}).then((newTrustContent: any) => {
			this.trustManagerCache.store(sessionService.getUserID().toString(), newTrustContent);

			return socketService.emit("trustManager.set", {
				content: newTrustContent
			});
		}).then((response: any) => {
			if (!response.success) {
				errorServiceInstance.criticalError(response.error);
			}
		}).nodeify(cb);
	}

	private storeSignatureCache = () => {
		if (signatureCache.isChanged()) {
			trustServiceDebug("Storing signature cache!");
			time("storedSignatureCache");

			signatureCache.resetChanged();

			signatureCache.getUpdatedVersion().then((updatedVersion: any) => {
				return this.signatureCacheObject.store(sessionService.getUserID().toString(), updatedVersion);
			}).then(function () {
				timeEnd("storedSignatureCache");
			});
		}
	}

	private addNewUsers = (user: any) => {
		if (trustManager.isLoaded() && !trustManager.hasKeyData(user.getSignKey())) {
			trustManager.addUser(user);
			this.delay();
		}
	}

	private loadDatabase = (database: any, cb?: Function) => {
		return trustManager.loadDatabase(database).thenReturn(database).nodeify(cb);
	}

	private createTrustDatabase = (cb?: Function) => {
		Bluebird.try(() => {
			trustManager.createDatabase(userService.getown());

			this.uploadDatabase().catch(errorServiceInstance.criticalError);

			return null;
		}).nodeify(cb);
	}

	private loadFromCache = (cacheEntry: any) => {
		trustServiceDebug("trustManager cache get done");
		this.loadCachePromise = Bluebird.race([
			userService.verifyOwnKeysDone(),
			userService.verifyOwnKeysCacheDone()
		]).then(() => {
			trustServiceDebug("trustManager cache loading");
			return this.loadDatabase(cacheEntry.data);
		});

		return this.loadCachePromise;
	}

	hasKey = (keyid: string) => {
		return trustManager.hasKeyData(keyid);
	};

	getKey = (keyid: string) => {
		return trustManager.getKeyData(keyid);
	};

	verifyUser = (user: any, cb?: Function) => {
		return Bluebird.try(() => {
			var keyData = trustManager.getKeyData(user.getSignKey());
			keyData.setTrust(trustManager.trustStates.VERIFIED);
			return this.uploadDatabase();
		}).nodeify(cb);
	};

	addUser = (user: any) => {
		return trustManager.addUser(user);
	}
}

export default new TrustService();
