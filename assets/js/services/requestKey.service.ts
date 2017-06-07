import * as Bluebird from 'bluebird';

import socketService from './socket.service';
import CacheService from './Cache';

const h = require("whispeerHelper");
const debug = require("debug");
const keyStore = require("crypto/keyStore");

const MAXCACHETIME  = 7 * 24 * 60 * 60 * 1000;

const keyStoreDebug = debug("whispeer:keyStore");
let blockageToken = "";

const THROTTLE = 20;

class RequestKeyService {
	keyCache: CacheService;
	delay: any;
	delayAsync: (keyID: string) => Bluebird<any>;
	MAXCACHETIME = MAXCACHETIME;

	constructor() {
		window.setTimeout(this.cleanCache, 30 * 1000);
		window.setInterval(this.cleanCache, 10 * 60 * 1000);

		this.keyCache = new CacheService("keys");

		this.delay = h.delayMultiple(THROTTLE, this.loadKeys);
		this.delayAsync = Bluebird.promisify(this.delay);
	}

	private idTransform(ID: any) {
		return ID;
	}

	private cleanCache = () => {
		return this.keyCache.all().each((cacheEntry: any) => {
			var data = JSON.parse(cacheEntry.data);
			if (data.removeAfter < new Date().getTime()) {
				keyStoreDebug("remove by time: " + data.removeAfter);
				this.keyCache.delete(cacheEntry.id.split("/")[1]);
			}
		});
	}

	private removeByObjectId = (keyID: string, objectID: string) => {
		//remove keys with same objectID
		return this.keyCache.all().each((cacheEntry: any) => {
			var data = JSON.parse(cacheEntry.data);

			if (objectID === data.objectID && keyID !== data.key.realid) {
				keyStoreDebug("remove by object id: " + objectID);
				return this.keyCache.delete(this.idTransform(keyID));
			}
		});
	}

	private loadKeys = (identifiers: string[], cb: Function) => {
		return Bluebird.try(() => {
			var toLoadIdentifiers = identifiers.filter(function (e) {
				return !keyStore.upload.isKeyLoaded(e);
			});

			if (toLoadIdentifiers.length === 0) {
				return identifiers;
			}

			return socketService.definitlyEmit("key.getMultiple", {
				blockageToken: blockageToken,
				loaded: [],
				realids: identifiers
			}).thenReturn(identifiers);
		}).nodeify(cb);
	}

	setBlockageToken (_blockageToken: string) {
		blockageToken = _blockageToken;
	}

	getKey = (keyID: string, callback: Function) => {
		if (typeof keyID !== "string") {
			throw new Error("not a valid key realid: " + keyID);
		}

		if (keyStore.upload.isKeyLoaded(keyID)) {
			callback();
		}

		keyStoreDebug("loading key: " + keyID);

		return this.keyCache.get(this.idTransform(keyID)).then((cacheEntry) => {
			if (cacheEntry.data.removeAfter < new Date().getTime()) {
				keyStoreDebug("Remove Key from Cache " + keyID);
				this.keyCache.delete(keyID);
			}

			keyStore.upload.addKey(cacheEntry.data.key);
		}).catch(() => {
			keyStoreDebug("key cache miss: " + keyID);

			return this.delayAsync(keyID);
		}).nodeify(callback);
	}

	cacheKey = (realID: string, objectID: string, time: number) => {
		time = Math.min(time, MAXCACHETIME);

		return this.removeByObjectId(realID, objectID).then(() => {
			var keyData = keyStore.upload.getExistingKey(realID);

			if (!keyData) {
				keyStoreDebug("Could not cache key yet " + realID);
				return;
			}

			return this.keyCache.store(this.idTransform(realID), {
				key: keyData,
				objectID: objectID,
				removeAfter: new Date().getTime() + time
			});
		});
	}
}

export default new RequestKeyService();