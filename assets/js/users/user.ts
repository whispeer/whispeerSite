import errorService from "../services/error.service"
import socketService from "../services/socket.service"

import h from "../helper/helper"
import * as Bluebird from "bluebird"

const initService = require("services/initService")
import State from "../asset/state"
const keyStoreService = require("crypto/keyStore")
const signatureCache = require("crypto/signatureCache")

import sessionService from "../services/session.service"
import blobService from "../services/blobService"
import Profile from "../users/profile"
import trustService from "../services/trust.service"
import settingsService from "../services/settings.service"
import filterService from "../services/filter.service"
import { reloadApp, isIOS } from "../services/location.manager"
import MutableObjectLoader, { UpdateEvent } from "../services/mutableObjectLoader"

import requestKeyService from "../services/requestKey.service"

import { ProfileLoader } from "../users/profile"
import { SignedKeysLoader } from "../users/signedKeys"

const friendsService = require("services/friendsService")
const trustManager = require("crypto/trustManager")

const RELOAD_DELAY_MIN = 10 * 1000
const RELOAD_DELAY_MAX = 60 * 1000
const RELOAD_OWN_DELAY = 5 * 1000
const advancedBranches = ["location", "birthday", "relationship", "education", "work", "gender", "languages"]

const advancedDefaults = {
	location: {},
	birthday: {},
	relationship: {},
	education: [],
	work: {},
	gender: {},
	languages: []
}

function applicableParts(scope, privacy, profile) {
	var result = {}

	if (privacy === undefined || profile === undefined) {
		throw new Error("dafuq")
	}

	h.objectEach(privacy, (key, val) => {
		if (profile[key]) {
			if (typeof val.encrypt !== "undefined") {
				if (!val.encrypt || val.visibility.indexOf(scope) > -1) {
					result[key] = profile[key]
				}
			} else {
				result[key] = applicableParts(scope, val, profile[key])
			}
		}
	})

	return result
}

function applicablePublicParts(privacy, profile) {
	var result = {}

	if (privacy === undefined || profile === undefined) {
		throw new Error("dafuq")
	}

	h.objectEach(privacy, (key, value) => {
		if (profile[key]) {
			if (typeof value.encrypt !== "undefined") {
				if (!value.encrypt) {
					result[key] = profile[key]
				}
			} else {
				result[key] = applicablePublicParts(value, profile[key])
			}
		}
	})

	return result
}

function getAllProfileTypes(privacySettings) {
	var profileTypes = []
	advancedBranches.forEach((branch) => {
		if (privacySettings[branch].encrypt) {
			profileTypes = profileTypes.concat(privacySettings[branch].visibility)
		}
	})

	if (privacySettings.basic.firstname.encrypt) {
		profileTypes = profileTypes.concat(privacySettings.basic.firstname.visibility)
	}

	if (privacySettings.basic.lastname.encrypt) {
		profileTypes = profileTypes.concat(privacySettings.basic.lastname.visibility)
	}

	return h.arrayUnique(profileTypes)
}

function deleteCache() {
	return Bluebird.try(() => {
		return new Bluebird((resolve) => {
			var deleteRequest = indexedDB.deleteDatabase("whispeerCache")

			deleteRequest.onerror = resolve
			deleteRequest.onsuccess = resolve
		})
	})
}

interface UserInterface {
	getID: () => number

	generateNewFriendsKey: () => any
	rebuildProfiles: () => any
	getFingerPrint: () => any
	createBackupKey: () => any
	getTrustLevel: () => any

	loadFullData: () => any
	loadImage: () => any
	loadBasicData: () => any

	getMigrationState: () => any
	isOwn: () => any
	getNickOrMail: () => any

	getMainKey: () => any
	getSignKey: () => any
	getCryptKey: () => any
	getFriendShipKey: () => any
	getContactKey: () => any
	getFriendsKey: () => any

	getNickname: () => any
	getMail: () => any
	getName: () => any

	isNotExistingUser: () => any
	ignoreFriendShip: () => any
	acceptFriendShip: () => any
	removeAsFriend: () => any
	addAsFriend: () => any
	isBlocked: () => boolean
}

type ProfilesType = {
	private: Profile[],
	me: Profile,
	public: Profile
}

class User implements UserInterface {
	private mainKey
	private signKey
	private cryptKey
	private friendShipKey
	private friendsKey
	private migrationState
	private signedKeys

	private id
	private mail
	private nickname
	private profiles:ProfilesType = {
		private: [],
		me: null,
		public: null,
	}
	private mutualFriends

	private addFriendState = new State()
	private ignoreFriendState = new State()

	private loadBasicDataPromise

	data: any = {}

	constructor (userData, signedKeys, profiles: ProfilesType) {
		this.id = h.parseDecimal(userData.id)
		this.mainKey = userData.mainKey

		this.signedKeys = signedKeys

		//all keys we get from the signedKeys object:
		this.signKey = this.signedKeys.metaAttr("sign")
		this.cryptKey = this.signedKeys.metaAttr("crypt")

		this.nickname = userData.nickname

		const { mutualFriends, mail, migrationState = 0 } = userData

		this.setData()
		this.update({ mutualFriends, mail, migrationState, profiles })
		this.attachListener()
	}

	update = ({ mutualFriends, mail, migrationState, profiles }: { mutualFriends: number[], mail: string, migrationState: number, profiles:ProfilesType}) => {
		this.mutualFriends = mutualFriends
		this.mail = mail
		this.migrationState = migrationState
		this.profiles = profiles

		this.data.mutualFriends = this.mutualFriends

		this.setNames()

		advancedBranches.map((branch) => {
			this.data.advanced[branch] = this.getAdvancedAttribute(branch)
		})
	}

	private setNames = () => {
		const names = this.getName()

		this.data.name = names.name
		this.data.names = names

		this.data.basic.shortname = names.shortname
	}

	isBlocked = () =>
		settingsService.isBlocked(this.id)

	private setData = () => {
		this.data = {
			notExisting: false,
			user: this,

			id: this.id,

			trustLevel: 0,

			signatureValid: true,
			fingerprint: keyStoreService.format.fingerPrint(this.signKey),

			addFriendState: this.addFriendState.data,
			ignoreFriendState: this.ignoreFriendState.data,

			me: this.isOwn(),
			other: !this.isOwn(),
			online: friendsService.onlineStatus(this.getID()) || 0,

			basic: {
				age: "?",
				location: "?",
				mutualFriends: [],
				url: "user/" + this.nickname,
				image: "assets/img/user.png"
			},
			advanced: {}
		}
	}

	private getAdvancedAttribute(branch) {
		const result = this.getProfileAttribute(branch)

		if (branch === "gender" && typeof result === "string") {
			return h.deepCopyObj({ gender: result })
		}

		return h.deepCopyObj(result || advancedDefaults[branch], 3)
	}

	private attachListener = () => {
		if (this.isOwn()) {
			this.friendsKey = this.signedKeys.metaAttr("friends")
		} else {
			friendsService.awaitLoading().then(() => {
				if (friendsService.didOtherRequest(this.id)) {
					this.friendsKey = this.signedKeys.metaAttr("friends")
				}

				if (friendsService.didIRequest(this.id)) {
					this.friendShipKey = friendsService.getUserFriendShipKey(this.id)
				}
			})
		}

		friendsService.listen((status) => {
			this.data.online = status
		}, "online:" + this.getID())

		friendsService.awaitLoading().then(() => {
			this.data.added = friendsService.didIRequest(this.getID())
			this.data.isMyFriend = friendsService.areFriends(this.getID())

			friendsService.listen(() => {
				this.data.added = friendsService.didIRequest(this.getID())
				this.data.isMyFriend = friendsService.areFriends(this.getID())
			})
		})

		settingsService.listen(() => this.setNames(), "updated")
	}

	generateNewFriendsKey = () => {
		var newFriendsKey
		return Bluebird.try(() => {
			if (!this.isOwn()) {
				throw new Error("not my own user")
			}

			//generate new key
			return keyStoreService.sym.generateKey(null, "friends")
		}).then((_newFriendsKey) => {
			newFriendsKey = _newFriendsKey

			//encrypt with all friendShipKeys
			var keys = friendsService.getAllFriendShipKeys()

			var keysPromises = keys.map((key) => {
				return keyStoreService.sym.symEncryptKey(newFriendsKey, key)
			})

			return Bluebird.all([
				Bluebird.all(keysPromises),
				keyStoreService.sym.symEncryptKey(newFriendsKey, this.mainKey),

				//encrypt old friends key with new friends key
				keyStoreService.sym.symEncryptKey(this.friendsKey, newFriendsKey),
			])
		}).then(() => {
			//update signedKeys
			this.signedKeys.metaSetAttr("friends", newFriendsKey)
			return this.signedKeys.getUpdatedData(this.signKey)
		}).then((updatedSignedKeys) => {
			this.friendsKey = newFriendsKey
			return {
				updatedSignedKeys,
				newFriendsKey
			}
		})
	}

	setFriendShipKey = (key) => {
		if (!this.friendShipKey) {
			this.friendShipKey = key
		}
	}

	/** profile management */

	// there is mainly one profile: the "me" profile, containing all data.
	// this profile is always updated when we edit the profile.
	// every other profile is a smaller part of this profile and is generated
	// after updating the "me" profile (or at other times - e.g. when settings change)

	/* gets a given profile attribute to value
	* @param attribute attribute to set
	* @param cb
	*/
	getProfileAttribute = (attribute) => {
		if (this.profiles.me) {
			return this.profiles.me.getAttribute(attribute)
		}

		var profiles = this.profiles.private.concat([this.profiles.public])

		const values = profiles.map((profile: Profile) => {
			return profile.getAttribute(attribute)
		}).filter((value: any) => {
			return typeof value !== "undefined" && value !== ""
		})

		if (values.length === 0) {
			return ""
		}

		values.sort((val1, val2) => {
			if (typeof val1 === "object" && typeof val2 === "object") {
				return Object.keys(val2).length - Object.keys(val1).length
			}

			return 0
		})

		return values[0]
	}

	/** uses the me profile to generate new profiles */
	rebuildProfiles = () => {
		var scopes, privacySettings
		return Bluebird.try(() => {
			if (!this.isOwn()) {
				throw new Error("update on another user failed")
			}

			privacySettings = settingsService.getBranch("privacy")
			scopes = getAllProfileTypes(privacySettings)

			return filterService.filterToKeys(scopes)
		}).then((keys: any) => {
			const profile = this.profiles.me.getFull()

			var scopeData = h.joinArraysToObject({
				name: scopes,
				key: keys.slice(0, keys.length - 1)
			})

			var pub = new Profile({ content: applicablePublicParts(privacySettings, profile) }, { isPublicProfile: true })
			var pubPromise = pub.sign(this.getSignKey())

			var privatePromises = scopeData.map((scope) => {
				var newProfile = new Profile({
					content: applicableParts(scope.name, privacySettings, profile)
				})

				return newProfile.signAndEncrypt(this.getSignKey(), scope.key)
			})

			return Bluebird.all([
				pubPromise,
				Bluebird.all(privatePromises)
			])
		}).spread((pub, profileData) => {
			return {
				pub: pub,
				priv: profileData
			}
		})

	}

	setMail = (newMail, cb) => {
		if (newMail === this.mail) {
			return Bluebird.resolve().nodeify(cb)
		}

		return socketService.emit("user.mailChange", { mail: newMail }).then(() => {
			this.mail = newMail
		}).nodeify(cb)
	}

	/** uploads all profiles (also recreates them) */
	uploadChangedProfile = (cb) => {
		return Bluebird.try(() => {
			return Bluebird.all([
				this.rebuildProfiles(),
				this.profiles.me.getUpdatedData(this.getSignKey())
			])
		}).spread((profileData, myProfile: any) => {
			profileData.me = myProfile

			return socketService.emit("user.profile.update", profileData)
		}).then(() => {
			this.profiles.me.updated()

			this.loadBasicDataPromise = null
			return this.loadBasicData()
		}).nodeify(cb)
	}

	/* sets a given profile attribute to value
	* @param attribute attribute to set
	* @param value value of the attribute
	* @param cb
	*/
	setProfileAttribute = (attribute, value) => {
		return this.profiles.me.setAttribute(attribute, value)
	}

	removeProfileAttribute = (attribute) => {
		return this.profiles.me.removeAttribute(attribute)
	}

	getFingerPrint = () => {
		return keyStoreService.format.fingerPrint(this.getSignKey())
	}

	setAdvancedProfile = (advancedProfile, cb) => {
		return Bluebird.resolve(advancedBranches).map((branch: string) => {
			return this.profiles.me.setAttribute(branch, advancedProfile[branch])
		}).nodeify(cb)
	}

	/** end profile management */

	verifyFingerPrint = (fingerPrint) => {
		return Bluebird.try(() => {
			if (fingerPrint !== keyStoreService.format.fingerPrint(this.getSignKey())) {
				throw new Error("wrong code")
			}

			return trustService.verifyUser(this)
		}).then(() => {
			this.data.trustLevel = 2
		})
	}

	createBackupKey = () => {
		var outerKey
		return Bluebird.try(() => {
			return initService.awaitLoading()
		}).then(() => {
			return keyStoreService.sym.createBackupKey(this.mainKey)
		}).then((backupKeyData) => {
			var decryptors = backupKeyData.decryptors
			var innerKey = backupKeyData.innerKey

			outerKey = backupKeyData.outerKey

			return socketService.emit("user.backupKey", {
				innerKey: innerKey,
				decryptors: decryptors
			})
		}).then((data) => {
			if (data.error) {
				throw new Error("server error")
			}

			return keyStoreService.format.base32(outerKey)
		})
	}

	getTrustLevel = () => {
		const trust = trustService.getKey(this.getSignKey())

		if (trust.isOwn()) {
			return -1
		}

		if (trust.isVerified()) {
			return 2
		}

		if (trust.isWhispeerVerified() || trust.isNetworkVerified()) {
			return 1
		}

		return 0
	}

	changePassword = (newPassword, cb) => {
		return Bluebird.try(() => {
			if (!this.isOwn()) {
				throw new Error("not my own user")
			}

			var ownKeys = {main: this.mainKey, sign: this.signKey}

			return Bluebird.all([
				keyStoreService.security.makePWVerifiable(ownKeys, newPassword),
				keyStoreService.random.hex(16),

				keyStoreService.sym.pwEncryptKey(this.mainKey, newPassword),

				deleteCache(),
			])
		}).spread((signedOwnKeys, salt, decryptor) => {
			return socketService.emit("user.changePassword", {
				signedOwnKeys,
				password: {
					salt: salt,
					hash: keyStoreService.hash.hashPW(newPassword, salt),
				},
				decryptor: decryptor
			})
		}).then(() => {
			sessionService.setPassword(newPassword)
		}).nodeify(cb)
	}

	loadFullData = () => {
		return this.loadBasicData()
	}

	getFriends = (cb) => {
		return friendsService.getUserFriends(this.getID(), cb)
	}

	loadImage = () => {
		const blob = this.getProfileAttribute("imageBlob")

		if (!blob) {
			this.data.basic.image = "assets/img/user.png"
			return
		}

		return blobService.getBlobUrl(blob.blobid).then(url =>
			isIOS() ?
				url.replace("file://", "") : url
		).then((imageUrl) => {
			this.data.basic.image = imageUrl
		}).catch((e) => errorService.criticalError(e))
	}

	loadBasicData = () => {
		this.data.trustLevel = this.getTrustLevel()

		this.loadImage()

		return Bluebird.resolve()
	}

	setMigrationState = (migrationState, cb) => {
		return socketService.emit("user.setMigrationState", {
				migrationState: migrationState
		}).nodeify(cb)
	}

	getMigrationState = () => {
		return Bluebird.resolve(this.migrationState)
	}

	isOwn = () => {
		return this.getID() === sessionService.getUserID()
	}

	getNickOrMail = () => {
		return this.nickname || this.mail
	}

	getMainKey = () => {
		return this.mainKey
	}

	getSignKey = () => {
		return this.signKey
	}

	getCryptKey = () => {
		return this.cryptKey
	}

	getFriendShipKey = () => {
		return this.friendShipKey
	}

	getContactKey = () => {
		return this.friendShipKey || this.cryptKey
	}

	getFriendsKey = () => {
		return this.friendsKey
	}

	getID = () => {
		return parseInt(this.id, 10)
	}

	getNickname = () => {
		return this.nickname
	}

	getMail = () => {
		return this.mail
	}

	private getSearchName = () => {
		const basic = this.getProfileAttribute("basic") || {}
		const nickname = this.getNickname()

		const searchNames = [nickname]

		if (basic.firstname) {
			searchNames.push(basic.firstname)
		}

		if (basic.lastname) {
			searchNames.push(basic.lastname)
		}

		return searchNames.join(" ")
	}

	private getLongName = () => {
		const basic = this.getProfileAttribute("basic") || {}
		const nickname = this.getNickname()

		if (basic.firstname && basic.lastname) {
			return basic.firstname + " " + basic.lastname
		}

		if (basic.firstname || basic.lastname) {
			return basic.firstname || basic.lastname
		}

		return nickname
	}

	getName = () => {
		const basic = this.getProfileAttribute("basic") || {}
		const nickname = this.getNickname()

		if (this.isBlocked()) {
			return {
				name: nickname,
				originalName: this.getLongName(),
				searchName: this.getSearchName(),
				firstname: "",
				lastname: "",
				nickname: nickname,
				shortname: nickname,
			}
		}

		return {
			name: this.getLongName(),
			searchName: this.getSearchName(),
			firstname: basic.firstname || "",
			lastname: basic.lastname || "",
			nickname: nickname,
			shortname: basic.firstname || basic.lastname || nickname
		}
	}

	ignoreFriendShip = () => {
		this.ignoreFriendState.pending()
		if (!this.isOwn()) {
			friendsService.ignoreFriendShip(this.getID(), errorService.failOnError(this.ignoreFriendState))
		} else {
			this.ignoreFriendState.failed()
		}
	}

	acceptFriendShip = () => {
		this.addFriendState.pending()
		if (!this.isOwn()) {
			friendsService.acceptFriendShip(this.getID(), errorService.failOnError(this.addFriendState))
		} else {
			this.addFriendState.failed()
		}
	}

	isNotExistingUser = () => {
		return false
	}

	removeAsFriend = () => {
		if (!this.isOwn()) {
			friendsService.removeFriend(this.getID(), errorService.criticalError)
		} else {
			this.addFriendState.failed()
		}
	}

	addAsFriend = () => {
		this.addFriendState.pending()
		if (!this.isOwn()) {
			friendsService.friendship(this.getID(), errorService.failOnError(this.addFriendState))
		} else {
			this.addFriendState.failed()
		}
	}
}

type CachedUser = any

function loadProfileInfo(profileInfo, signKey, isPublic = false) {
	return ProfileLoader.load({
		...profileInfo,
		isPublic,
		signKey
	})
}

const getProfiles = (userData, signKey, isMe) => {
	return Bluebird.try(async function () {
		const profiles = {
			public: null,
			private: null,
			me: null
		}

		if (!isMe) {
			if (userData.profile.pub) {
				userData.profile.pub.profileid = userData.profile.pub.profileid || userData.id

				profiles.public = await loadProfileInfo(userData.profile.pub, signKey, true)
			}

			profiles.private = []

			if (userData.profile.priv && userData.profile.priv instanceof Array) {
				const priv = userData.profile.priv

				profiles.private = await Bluebird.resolve(priv)
					.map(profile => loadProfileInfo(profile, signKey))
			}
		} else {
			profiles.me =  await loadProfileInfo(userData.profile.me, signKey)
		}

		return profiles
	})
}

const deletedUserName = "Deleted user"
export class NotExistingUser implements UserInterface {
	data: any

	constructor (identifier?) {
		this.data = {
			trustLevel: -1,
			notExisting: true,
			basic: {
				shortname: deletedUserName,
				image: "assets/img/user.png"
			},
			name: deletedUserName,
			user: this
		}

		if (typeof identifier === "number") {
			this.data.id = identifier
		}
	}

	isBlocked = () => false

	getID = () => -1
	generateNewFriendsKey = () => Bluebird.reject(new Error("not my own user"))
	isNotExistingUser = () => true
	loadBasicData = () => Bluebird.resolve()
	loadFullData = () => Bluebird.resolve()
	isOwn = () => false

	rebuildProfiles = () => { throw new Error("not implemented for NotExistingUser") }
	getFingerPrint = () => { throw new Error("not implemented for NotExistingUser") }
	createBackupKey = () => { throw new Error("not implemented for NotExistingUser") }
	getTrustLevel = () => { throw new Error("not implemented for NotExistingUser") }
	loadImage = () => { throw new Error("not implemented for NotExistingUser") }
	getMigrationState = () => { throw new Error("not implemented for NotExistingUser") }
	getNickOrMail = () => { throw new Error("not implemented for NotExistingUser") }
	getMainKey = () => { throw new Error("not implemented for NotExistingUser") }
	getSignKey = () => { throw new Error("not implemented for NotExistingUser") }
	getCryptKey = () => { throw new Error("not implemented for NotExistingUser") }
	getFriendShipKey = () => { throw new Error("not implemented for NotExistingUser") }
	getContactKey = () => { throw new Error("not implemented for NotExistingUser") }
	getFriendsKey = () => { throw new Error("not implemented for NotExistingUser") }
	getNickname = () => { throw new Error("not implemented for NotExistingUser") }
	getMail = () => { throw new Error("not implemented for NotExistingUser") }
	getName = () => { throw new Error("not implemented for NotExistingUser") }
	ignoreFriendShip = () => { throw new Error("not implemented for NotExistingUser") }
	acceptFriendShip = () => { throw new Error("not implemented for NotExistingUser") }
	removeAsFriend = () => { throw new Error("not implemented for NotExistingUser") }
	addAsFriend = () => { throw new Error("not implemented for NotExistingUser") }
}

const improveKeyAccess = (keys, identifier) => {
	return UserLoader.get(sessionService.getUserID()).then((ownUser) => {
		if (!ownUser || ownUser.getNickOrMail() !== identifier) {
			throw new Error("user changed so no improvement update!")
		}

		return Bluebird.all(keys.map(function (keyID) {
			return keyStoreService.sym.symEncryptKey(keyID, ownUser.getMainKey())
		}))
	}).then(function () {
		return socketService.emit("key.addFasterDecryptors", {
			keys: keyStoreService.upload.getDecryptors(keys)
		})
	})
}

const improvementListener = (identifier) => {
	let improve = []

	keyStoreService.addImprovementListener((rid) => {
		improve.push(rid)

		if (improve.length === 1) {
			Bluebird.delay(5000).then(() => {
				const keys = improve
				improve = []

				return improveKeyAccess(keys, identifier)
			}).catch(errorService.criticalError)
		}
	})
}

function enhanceOwnUser(userData) {
	const nickname = userData.nickname
	const mainKey = userData.mainKey
	const signKey = userData.signedKeys.sign

	keyStoreService.setKeyGenIdentifier(nickname)
	improvementListener(nickname)
	keyStoreService.sym.registerMainKey(mainKey)

	keyStoreService.security.verifyWithPW(userData.signedOwnKeys, {
		main: mainKey,
		sign: signKey
	})

	keyStoreService.security.addEncryptionIdentifier(mainKey)
	keyStoreService.security.addEncryptionIdentifier(signKey)

	trustManager.setOwnSignKey(signKey)

	trustService.ownKeysLoaded()

	Bluebird.all([
		requestKeyService.getKey(signKey),
		requestKeyService.getKey(mainKey)
	]).then(() => {
		requestKeyService.cacheKey(signKey, `user-sign-${nickname}`, requestKeyService.MAXCACHETIME);
		requestKeyService.cacheKey(mainKey, `user-main-${nickname}`, requestKeyService.MAXCACHETIME);
	})
}

export default class UserLoader extends MutableObjectLoader<UserInterface, CachedUser>({
	download: (id) =>
		socketService.awaitConnection()
			.then(() => socketService.definitlyEmit("user.getMultiple", { identifiers: [id] }))
			.then((response) => response.users[0]),
	load: (userData) =>
		Bluebird.resolve(userData),
	restore: (userData, previousInstance) => {
		if (previousInstance) {
			if (previousInstance instanceof NotExistingUser && userData.userNotExisting) {
				return previousInstance
			}

			if (previousInstance instanceof User && !userData.userNotExisting) {
				return Bluebird.try(async function () {
					const userID = previousInstance.getID()
					const isMe = sessionService.isOwnUserID(userID)
					const signKey = previousInstance.getSignKey()

					const { mutualFriends, mail, migrationState } = userData

					const profiles = await getProfiles(userData, signKey, isMe)

					previousInstance.update({ mutualFriends, mail, migrationState, profiles })

					return previousInstance
				})
			}

			console.warn("previous instance is not a user but current data is. Reloading")
			reloadApp()
			return previousInstance
		}

		return Bluebird.try(async function () {
			if (userData.userNotExisting) {
				return new NotExistingUser(userData.identifier)
			}

			if (userData.error === true) {
				return new NotExistingUser()
			}

			const userID = h.parseDecimal(userData.id)
			const isMe = sessionService.isOwnUserID(userID)

			if (isMe) {
				enhanceOwnUser(userData)
				await signatureCache.awaitLoading()
			}

			const signKey = userData.signedKeys.sign
			const nickname = userData.nickname

			trustService.addNewUsers({ key: signKey, userid: userID, nickname })

			const signedKeys = await SignedKeysLoader.load({ signedKeys: userData.signedKeys, signKey })

			const profiles = await getProfiles(userData, signKey, isMe)

			const user = new User(userData, signedKeys, profiles)

			if (isMe) {
				trustService.ownUserLoaded(user)
			}

			return user
		})
	},
	shouldUpdate: (event, instance) => {
		if (sessionService.isOwnUserID(instance.getID())) {
			return Bluebird.delay(RELOAD_OWN_DELAY).thenReturn(true)
		}

		if (event === UpdateEvent.wake) {
			return Bluebird.delay(h.randomIntFromInterval(RELOAD_DELAY_MIN, RELOAD_DELAY_MAX)).thenReturn(true)
		}

		return Bluebird.resolve(false)
	},
	getID: (userData) => userData.id.toString(),
	cacheName: "user"
}) {}
