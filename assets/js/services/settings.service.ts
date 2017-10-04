import * as Bluebird from "bluebird";
import socketService from "./socket.service";
import * as keyStore from "../crypto/keyStore.js";

import Observer from "../asset/observer";

const initService = require("services/initService");

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

interface IPrivacyAPI {
	safetyNames: string[],
	setPrivacy: Function,
	removeCircle: Function
}

import h from "../helper/helper";
const EncryptedData = require("crypto/encryptedData");
const SecuredData = require("asset/securedDataWithMetaData");

const notVisible:IVisibility = {
	encrypt: true,
	visibility: []
};

class SettingsService extends Observer {

	settings: any;
	serverSettings = {};
	options = { type: "settings", removeEmpty: true };
	api: any;

	defaultSettings:ISettings = {
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
	};

	publicBranches = ["uiLanguage", "sound", "donate", "safety"];
	serverBranches = ["mailsEnabled"];

	loadCachePromise = Bluebird.resolve();

	isBranchPublic = (branchName: string) => {
		return this.publicBranches.indexOf(branchName) > -1;
	}

	isBranchServer = (branchName: string) => {
		return this.serverBranches.indexOf(branchName) > -1;
	}

	turnOldSettingsToNew = (settings: any) => {
		var result = {
			meta: { initialLanguage: <string> undefined },
			content: { }
		};

		h.objectEach(settings, (key: any, val: any) => {
			if (this.isBranchPublic(key)) {
				result.meta[key] = val;
			} else {
				result.content[key] = val;
			}
		});

		return result;
	}

	migrateToFormat2 = (givenOldSettings: any) => {
		console.warn("migrating settings to format 2");

		return Bluebird.try(() => {
			keyStore.security.allowPrivateActions();
			var oldSettings = new EncryptedData(givenOldSettings);
			return oldSettings.decrypt();
		}).then(decryptedSettings => {
			var data = this.turnOldSettingsToNew(decryptedSettings);

			data.meta.initialLanguage = h.getLanguageFromPath();

			var ownUser = require("users/userService").default.getOwn();

			return SecuredData.createAsync(data.content,
				data.meta,
				this.options,
				ownUser.getSignKey(),
				ownUser.getMainKey()
			);

		}).then(signedAndEncryptedSettings => {
			this.settings = SecuredData.load(
				signedAndEncryptedSettings.content,
				signedAndEncryptedSettings.meta,
				this.options
			);

			return socketService.emit("settings.setSettings", {
				settings: signedAndEncryptedSettings,
			}).thenReturn(this.settings);
		})
	}

	loadSettings = (givenSettings: any) => {
		this.serverSettings = givenSettings.server || {};

		return Bluebird.try(() => {
			if (givenSettings.ct) {
				return this.migrateToFormat2(givenSettings);
			} else {
				return SecuredData.load(givenSettings.content, givenSettings.meta, this.options);
			}
		}).then(_settings => {
			this.settings = _settings;

			var decryptAsync = Bluebird.promisify(this.decrypt.bind(this));

			return decryptAsync();
		}).then(() => {
			this.notify("", "loaded");
		});
	}

	loadFromCache = (cacheEntry: any) => {
		var userService = require("users/userService").default;

		this.loadCachePromise = userService.getOwnAsync().then(() => {
			return this.loadSettings(cacheEntry.data);
		});

		return this.loadCachePromise;
	}

	loadFromServer = (data: any) => {
		return this.loadCachePromise.then(() => {
			if (data.unChanged) {
				return Bluebird.resolve();
			}

			var givenSettings = data.content;
			var toCache = h.deepCopyObj(givenSettings);

			var userService = require("users/userService").default;
			return userService.getOwnAsync().then(() => {
				return this.loadSettings(givenSettings);
			}).thenReturn(toCache);
		});
	}

	constructor() {
		super();

		initService.get("settings.get", this.loadFromServer, {
			cacheCallback: this.loadFromCache,
			cache: true
		});
	}

	setDefaultLanguage = (language: string) => {
		this.defaultSettings.uiLanguage = language;
	}

	getContent = () => {
		return this.settings.contentGet();
	};

	setContent = (content: any) => {
		return this.settings.contentSet(content);
	};

	decrypt = (cb: Function) => {
		return Bluebird.try(() => {
			var ownUser = require("users/userService").default.getOwn();

			return Bluebird.all([
				this.settings.decrypt(),
				this.settings.verify(ownUser.getSignKey(), null, "settings")
			]);
		}).nodeify(cb);
	};

	getBranchContent = (branchName: string) => {
		if (this.isBranchServer(branchName)) {
			return this.serverSettings[branchName];
		}

		if (this.isBranchPublic(branchName)) {
			return this.settings.metaAttr(branchName);
		}

		return this.settings.contentGet()[branchName];
	}

	getBranch = (branchName: string) => {
		if (!this.settings) {
			return this.defaultSettings[branchName];
		}

		const branchContent = this.getBranchContent(branchName)

		if (typeof branchContent === "undefined") {
			return this.defaultSettings[branchName];
		}

		return branchContent;
	};

	updateBranch = (branchName: any, value: any) => {
		if (this.isBranchServer(branchName)) {
			this.serverSettings[branchName] = value;
		} else if (this.isBranchPublic(branchName)) {
			this.settings.metaSetAttr(branchName, value);
		} else {
			this.settings.contentSetAttr(branchName, value);
		}

		this.notify("", "updated");
	};

	privacy: IPrivacyAPI = {

		safetyNames: ["birthday", "location", "relationship", "education", "work", "gender", "languages"],

		setPrivacy: (privacy: any, cb: Function, updateProfile: any) => {
			return Bluebird.try(() => {
				this.updateBranch("privacy", privacy);
				return this.uploadChangedData();
			}).then(() => {
				if (!updateProfile) {
					return;
				}

				var userService = require("users/userService").default;
				return userService.getOwn().uploadChangedProfile();
			}).nodeify(cb);
		},

		removeCircle: (id: any, cb: Function) => {
			return Bluebird.try(() => {
				var privacy = this.getBranch("privacy");

				this.privacy.safetyNames.forEach((safetyName: any) => {
					h.removeArray(privacy[safetyName].visibility, "circle:" + id);
				});

				h.removeArray(privacy.basic.firstname.visibility, "circle:" + id);
				h.removeArray(privacy.basic.lastname.visibility, "circle:" + id);

				return this.privacy.setPrivacy(privacy, null, true);
			}).nodeify(cb);
		}
	};

	uploadChangedData = () => {
		if (!this.settings.isChanged()) {
			return Bluebird.resolve(true)
		}

		var userService = require("users/userService").default;

		return this.settings.getUpdatedData(
				userService.getOwn().getSignKey()
			).then((newEncryptedSettings: any) => {
				newEncryptedSettings.server = this.serverSettings;

				return socketService.emit("settings.setSettings", {
					settings: newEncryptedSettings
				});
			}).then((result: any) => {
				return result.success;
			})
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
