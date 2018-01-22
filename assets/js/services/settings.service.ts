import * as Bluebird from "bluebird";
import socketService from "./socket.service";
const keyStore = require("../crypto/keyStore.js")

import Observer from "../asset/observer";

const initService = require("services/initService");
import sessionService from "../services/session.service"
import MutableObjectLoader, { UpdateEvent } from "../services/mutableObjectLoader"
import SecuredDataApi, { SecuredData } from "../asset/securedDataWithMetaData"

import h from "../helper/helper"
const EncryptedData = require("crypto/encryptedData")

const RELOAD_DELAY = 10000

interface IVisibility {
	encrypt: boolean,
	visibility: string[]
}

interface blockedUserInfo {
	id: number,
	since: number
}

interface ISettings {
	privacy: {
		basic: {
			firstname: IVisibility,
			lastname: IVisibility
		},
		imageBlob: IVisibility,
		location: IVisibility,
		birthday: IVisibility,
		relationship: IVisibility,
		education: IVisibility,
		work: IVisibility,
		gender: IVisibility,
		languages: IVisibility
	},
	donate: {
		refused: boolean,
		later: number
	},
	sharePosts: string[],
	filterSelection: string[],
	sound: {
		enabled: boolean
	},
	messages: {
		sendShortCut: string
	},
	safety: {
		blockedUsers: blockedUserInfo[]
	},
	uiLanguage: string
}

const notVisible:IVisibility = {
	encrypt: true,
	visibility: []
}

const privacyAttributes = ["birthday", "location", "relationship", "education", "work", "gender", "languages"]

const publicBranches = ["uiLanguage", "sound", "donate", "safety"]
const serverBranches = ["mailsEnabled"]

const defaultSettings:ISettings = {
	privacy: {
		basic: {
			firstname: {
				encrypt: false,
				visibility: ["always:allfriends"]
			},
			lastname: {
				encrypt: false,
				visibility: ["always:allfriends"]
			}
		},
		imageBlob: {
			encrypt: false,
			visibility: []
		},
		location: notVisible,
		birthday: notVisible,
		relationship: notVisible,
		education: notVisible,
		work: notVisible,
		gender: notVisible,
		languages: notVisible
	},
	donate: {
		refused: false,
		later: 0
	},
	sharePosts: ["always:allfriends"],
	filterSelection: [],
	sound: {
		enabled: true
	},
	messages: {
		sendShortCut: "enter"
	},
	safety: {
		blockedUsers: []
	},
	uiLanguage: "en"
}

const isBranchPublic = (branchName: string) => {
	return publicBranches.indexOf(branchName) > -1;
}

const isBranchServer = (branchName: string) => {
	return serverBranches.indexOf(branchName) > -1;
}

const securedDataOptions = { type: "settings", removeEmpty: true }

const turnOldSettingsToNew = (settings: any) => {
	var result = {
		meta: { initialLanguage: <string> undefined },
		content: { }
	};

	h.objectEach(settings, (key: any, val: any) => {
		if (isBranchPublic(key)) {
			result.meta[key] = val;
		} else {
			result.content[key] = val;
		}
	});

	return result;
}

const migrate = (givenSettings: any) => {
	console.warn("migrating settings to format 2");

	if (!givenSettings.ct) {
		return Bluebird.resolve(new SecuredData(givenSettings.content, givenSettings.meta, securedDataOptions, false))
	}

	return Bluebird.try(() => {
		keyStore.security.allowPrivateActions();
		var oldSettings = new EncryptedData(givenSettings);
		return oldSettings.decrypt();
	}).then(decryptedSettings => {
		var { meta, content } = turnOldSettingsToNew(decryptedSettings);

		meta.initialLanguage = h.getLanguageFromPath();

		const ownUser = require("users/userService").default.getOwn()
		const transformedSettings = new Settings(content, meta)

		return transformedSettings.getUpdatedData(ownUser.getSignKey(), ownUser.getMainKey())
	}).then(signedAndEncryptedSettings => {
		const settings = new SecuredData(
			signedAndEncryptedSettings.content,
			signedAndEncryptedSettings.meta,
			securedDataOptions,
			false
		)

		return socketService.emit("settings.setSettings", {
			settings: signedAndEncryptedSettings,
		}).thenReturn(settings);
	})
}

class Settings {
	private changed = false

	constructor (private content, private meta, private server = {}) {}

	getContent = () => this.content
	getMeta = () => this.meta
	getServer = () => this.server

	getBranch = (branchName) => {
		if (isBranchServer(branchName)) {
			return this.server[branchName];
		}

		if (isBranchPublic(branchName)) {
			return this.meta[branchName];
		}

		return this.content[branchName];
	}

	isChanged = () => this.changed

	setBranch = (branchName, value) => {
		if (isBranchServer(branchName)) {
			this.server[branchName] = value
		} else if (isBranchPublic(branchName)) {
			this.meta[branchName] = value
		} else {
			this.content[branchName] = value
		}

		this.changed = true
	}

	update = (content, meta, server) => {
		this.content = content
		this.meta = meta
		this.server = server
		this.changed = false
	}

	getUpdatedData = (signKey, encryptKey) =>
		SecuredDataApi.createAsync(this.content, this.meta, securedDataOptions, signKey, encryptKey)
			.then((encryptedSettings) => {
				return {
					...encryptedSettings,
					server: this.server
				}
			})
}

const loadSettings = (givenSettings: any) => {
	return Bluebird.try(async function () {
		const secured = await migrate(givenSettings)

		const ownUser = await require("users/userService").default.getOwnAsync()

		await Bluebird.all([
			secured.decrypt(),
			secured.verifyAsync(ownUser.getSignKey(), "settings")
		])
		return {
			content: secured.contentGet(),
			meta: secured.metaGet(),
			server: givenSettings.server
		}
	})
}

let settings: Settings

class SettingsService extends Observer {
	api: any;

	constructor() { super() }

	setDefaultLanguage = (language: string) => defaultSettings.uiLanguage = language

	getContent = () => settings.getContent()

	getBranchContent = (branchName: string) => settings.getBranch(branchName)

	getBranch = (branchName: string) => {
		if (!settings) {
			return defaultSettings[branchName];
		}

		const branchContent = this.getBranchContent(branchName)

		if (typeof branchContent === "undefined") {
			return defaultSettings[branchName];
		}

		return branchContent;
	};

	updateBranch = (branchName: string, value: any) => {
		settings.setBranch(branchName, value)
		this.notify("", "updated");
	}

	setPrivacy = (privacy: any) => {
		return Bluebird.try(() => {
			this.updateBranch("privacy", privacy);
			return this.uploadChangedData();
		}).then(() => {
			const userService = require("users/userService").default;
			return userService.getOwn().uploadChangedProfile();
		})
	}

	removeCircle = (id: any) => {
		return Bluebird.try(() => {
			var privacy = this.getBranch("privacy");

			privacyAttributes.forEach((safetyName: any) => {
				h.removeArray(privacy[safetyName].visibility, "circle:" + id);
			});

			h.removeArray(privacy.basic.firstname.visibility, "circle:" + id);
			h.removeArray(privacy.basic.lastname.visibility, "circle:" + id);

			return this.setPrivacy(privacy);
		})
	}

	uploadChangedData = () => {
		if (!settings.isChanged()) {
			return Bluebird.resolve(true)
		}

		const userService = require("users/userService").default;
		const ownUser = userService.getOwn()

		return settings.getUpdatedData(ownUser.getSignKey(), ownUser.getMainKey())
			.then((settings: any) => socketService.emit("settings.setSettings", { settings }))
			.then((result: any) => result.success)
	};

	getBlockedUsers = (): blockedUserInfo[] => this.getBranch("safety").blockedUsers

	setBlockedUsers = (blockedUsers: blockedUserInfo[]): Bluebird<any> => {
		const safety = this.getBranch("safety")

		this.updateBranch("safety", {
			...safety,
			blockedUsers
		})

		return this.uploadChangedData()
	}

	isBlockedSince = (userID: number, time: number) =>
		!!this.getBlockedUsers().find(({ id, since }) => userID === id && since < time )

	isBlocked = (userID: number) =>
		!!this.getBlockedUsers().find(({ id }) => userID === id)

	getPrivacyAttribute = (attr: any) => {
		var b = this.getBranch("privacy"),
				i: number,
				attrs = attr.split("."),
				cur = b;

		for (i = 0; i < attrs.length; i += 1) {
			if (cur[attrs[i]]) {
				if (typeof cur[attrs[i]].encrypt !== "undefined") {
					return cur[attrs[i]];
				}
				cur = cur[attrs[i]];
			}
		}

		throw new Error("could not find attribute settings");
	};

	getPrivacyEncryptionStatus = (attr: any) => {
		return this.getPrivacyAttribute(attr).encrypt;
	};

	getPrivacyVisibility = (attr: any) => {
		var privacyAttribute = this.getPrivacyAttribute(attr);

		if (privacyAttribute.encrypt) {
			return privacyAttribute.visibility;
		} else {
			return false;
		}
	}
};

export default new SettingsService();


type CachedSettings = {
	content: any,
	meta: any,
	server: any
}

class SettingsLoader extends MutableObjectLoader<Settings, CachedSettings>({
	download: (_id, previousInstance: Settings) =>
		socketService.awaitConnection()
			.then(() => socketService.definitlyEmit("settings.get", {
				responseKey: "content",
				cacheSignature: previousInstance && previousInstance.getMeta()._signature
			}))
			.then((response) => response.content),
	load: (response, previousInstance) => {
		if (previousInstance && response.unChanged) {
			return Bluebird.resolve({
				content: previousInstance.getContent(),
				meta: previousInstance.getMeta(),
				server: response.content.server
			})
		}

		return loadSettings(response.content)
	},
	restore: ({ content, meta, server }, previousInstance) => {
		if (previousInstance) {
			previousInstance.update(content, meta, server)
			return previousInstance
		}

		return new Settings(content, meta, server)
	},
	shouldUpdate: (event) => {
		if (event === UpdateEvent.wake) {
			return Bluebird.delay(RELOAD_DELAY).thenReturn(true)
		}

		return Bluebird.resolve(false)
	},
	getID: () => sessionService.getUserID(),
	cacheName: "settings"
}) {}

initService.registerCallback(() =>
	SettingsLoader.get(sessionService.getUserID())
		.then((loadedSettings) => settings = loadedSettings)
)
