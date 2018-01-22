import * as Bluebird from "bluebird";

import CacheService from './Cache';

import SecuredDataApi from "../asset/securedDataWithMetaData"
const errors = require("asset/errors");
import sessionService from "./session.service";

const initService = require("services/initService");

import trustManager, {
	trustSet,
	trustStates,

	transformLegacy,
	TrustStore,
	userToDataSet,
	TRUST_SECURED_OPTIONS,
} from "../crypto/trustManager"
import MutableObjectLoader, { SYMBOL_UNCHANGED } from "../services/mutableObjectLoader"
import socketService from "../services/socket.service";
import userService from "../users/userService"
const signatureCache = require("crypto/signatureCache");

const debug = require("debug");

const STORESIGNATURECACHEINTERVAL = 30000;

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

const loadTrustInfo = (data) => {
	return userService.getOwnAsync().then((ownUser) => {
		const ownKey = ownUser.getSignKey()
		if (!data) {
			const userid = ownUser.getID()
			const nickname = ownUser.getNickname()

			return {
				nicknames: {
					[nickname]: ownKey
				},
				ids: {
					[userid]: ownKey
				},
				me: ownKey,
				keys: {
					[ownKey]: userToDataSet({ key: ownKey, userid, nickname }, trustStates.OWN)
				},
				signature: ""
			}
		}

		if (data.me !== ownKey) {
			throw new errors.SecurityError("not my trust database");
		}

		const givenDatabase = SecuredDataApi.load(undefined, data, TRUST_SECURED_OPTIONS);
		return givenDatabase.verifyAsync(ownKey, "user")
			.then(() => transformLegacy(givenDatabase.metaGet()))
	})
}

const signatureCacheObject = new CacheService("signatureCache");

class TrustService {
	constructor() {
		window.setInterval(this.storeSignatureCache, STORESIGNATURECACHEINTERVAL);

		this.waitForLogin();
	}

	private waitForLogin() {
		sessionService.awaitLogin().then(() => {
			time("getSignatureCache");
			return signatureCacheObject.get(sessionService.getUserID().toString()).catch(function () {
				return;
			});
		}).then((signatureCacheData: any) => {
			timeEnd("getSignatureCache");

			if (signatureCacheData) {
				signatureCache.load(signatureCacheData.data);
			} else {
				signatureCache.initialize();
			}
		});
	}

	private storeSignatureCache = () => {
		if (signatureCache.isChanged()) {
			trustServiceDebug("Storing signature cache!");
			time("storedSignatureCache");

			signatureCache.resetChanged();

			signatureCache.getUpdatedVersion().then((updatedVersion: any) => {
				return signatureCacheObject.store(sessionService.getUserID().toString(), updatedVersion);
			}).then(function () {
				timeEnd("storedSignatureCache");
			});
		}
	}
}

class TrustStoreLoader extends MutableObjectLoader<TrustStore, trustSet>({
	download: (_id, previousInstance: TrustStore) =>
		socketService.awaitConnection()
			.then(() => socketService.definitlyEmit("trustManager.get", {
				responseKey: "content",
				cacheSignature: previousInstance && previousInstance.getSignature()
			}))
			.then((response) => response.content),
	load: (response, previousInstance: TrustStore) => {
		if (previousInstance && response.unChanged) {
			return Bluebird.resolve(SYMBOL_UNCHANGED)
		}

		return loadTrustInfo(response.content)
	},
	restore: (content: trustSet, previousInstance: TrustStore) => {
		if (previousInstance) {
			previousInstance.update(content)
			return previousInstance
		}

		return new TrustStore(content)
	},
	shouldUpdate: () => Bluebird.resolve(true),
	getID: () => sessionService.getUserID(),
	cacheName: "trustStore"
}) {}

initService.registerCallback(() =>
	TrustStoreLoader.get(sessionService.getUserID())
		.then((trustStore) => trustManager.setTrustStore(trustStore))
)

new TrustService()
