define(["step", "whispeerHelper", "asset/state", "asset/securedDataWithMetaData", "models/modelsModule"], function (step, h, State, SecuredData, modelsModule) {
	"use strict";

	var advancedBranches = ["location", "birthday", "relationship", "education", "work", "gender", "languages"];

	function applicableParts(scope, privacy, profile) {
		var result = {};

		if (privacy === undefined || profile === undefined) {
			throw new Error("dafuq");
		}

		h.objectEach(privacy, function (key, val) {
			if (profile[key]) {
				if (typeof val.encrypt !== "undefined") {
					if (!val.encrypt || val.visibility.indexOf(scope) > -1) {
						result[key] = profile[key];
					}
				} else {
					result[key] = applicableParts(scope, val, profile[key]);
				}
			}
		});

		return result;
	}

	function applicablePublicParts(privacy, profile) {
		var result = {};

		if (privacy === undefined || profile === undefined) {
			throw new Error("dafuq");
		}

		h.objectEach(privacy, function (key, value) {
			if (profile[key]) {
				if (typeof value.encrypt !== "undefined") {
					if (!value.encrypt) {
						result[key] = profile[key];
					}
				} else {
					result[key] = applicablePublicParts(value, profile[key]);
				}
			}
		});

		return result;
	}

	function getAllProfileTypes(privacySettings) {
		var profileTypes = [];
		advancedBranches.forEach(function (branch) {
			if (privacySettings[branch].encrypt) {
				profileTypes = profileTypes.concat(privacySettings[branch].visibility);
			}
		});

		if (privacySettings.basic.firstname.encrypt) {
			profileTypes = profileTypes.concat(privacySettings.basic.firstname.visibility);
		}

		if (privacySettings.basic.lastname.encrypt) {
			profileTypes = profileTypes.concat(privacySettings.basic.lastname.visibility);
		}

		return h.arrayUnique(profileTypes);
	}

	function userModel($injector, $rootScope, blobService, keyStoreService, ProfileService, sessionService, settingsService, socketService, friendsService, errorService, initService) {
		return function User (providedData) {
			var theUser = this, mainKey, signKey, cryptKey, friendShipKey, friendsKey, migrationState, signedKeys, signedOwnKeys;
			var id, mail, nickname, publicProfile, privateProfiles = [], myProfile, mutualFriends;

			var addFriendState = new State();
			var ignoreFriendState = new State();

			var basicDataLoaded = false;

			this.data = {};

			function updateUser(userData) {
				if (id && h.parseDecimal(userData.id) !== h.parseDecimal(id)) {
					throw new Error("user update invalid");
				}

				mutualFriends = userData.mutualFriends;

				id = h.parseDecimal(userData.id);
				mail = userData.mail;
				nickname = userData.nickname;

				var isMe = (id === sessionService.getUserID());

				migrationState = userData.migrationState || 0;

				signedKeys = SecuredData.load(undefined, userData.signedKeys, { type: "signedKeys" });
				signedOwnKeys = userData.signedOwnKeys;

				if (!mainKey && userData.mainKey) {
					mainKey = userData.mainKey;
				}

				//all keys we get from the signedKeys object:
				signKey = signedKeys.metaAttr("sign");
				cryptKey = signedKeys.metaAttr("crypt");

				if (isMe) {
					friendsKey = signedKeys.metaAttr("friends");
				}

				if (!isMe) {
					friendsService.awaitLoading().then(function () {
						if (friendsService.didOtherRequest(id)) {
							friendsKey = signedKeys.metaAttr("friends");
						}

						if (friendsService.didIRequest(id)) {
							friendShipKey = friendsService.getUserFriendShipKey(id);
						}
					});
				}

				if (!isMe) {
					if (userData.profile.pub) {
						userData.profile.pub.profileid = userData.profile.pub.profileid || id;
						publicProfile = new ProfileService(userData.profile.pub, { isPublicProfile: true });
					}

					privateProfiles = [];

					if (userData.profile.priv && userData.profile.priv instanceof Array) {
						var priv = userData.profile.priv;

						privateProfiles = priv.map(function (profile) {
							return new ProfileService(profile);
						});
					}
				} else {
					myProfile = new ProfileService(userData.profile.me);
				}

				theUser.data = {
					notExisting: false,
					user: theUser,
					id: id,
					trustLevel: 0,
					fingerprint: keyStoreService.format.fingerPrint(signKey),
					basic: {
						age: "?",
						location: "?",
						mutualFriends: mutualFriends,
						url: "user/" + nickname,
						image: "assets/img/user.png"
					},
					advanced: {
						birthday:	{
							day:	"",
							month: "",
							year:	""
						},
						location: {
							town:	"",
							state: "",
							country: ""
						},
						partner:	{
							type:	"",
							name: ""
						},
						education: [],
						job: {
							what: "",
							where: ""
						},
						gender: {
							gender: "none",
							text: ""
						},
						languages: []
					}
				};
			}

			updateUser(providedData);

			this.generateNewFriendsKey = function (cb) {
				var newFriendsKey;
				step(function () {
					if (!theUser.isOwn()) {
						throw new Error("not my own user");
					}

					//generate new key
					keyStoreService.sym.generateKey(this, "friends");
				}, h.sF(function (_newFriendsKey) {
					newFriendsKey = _newFriendsKey;

					//encrypt with all friendShipKeys
					var keys = friendsService.getAllFriendShipKeys();
					keys.forEach(function (key) {
						keyStoreService.sym.symEncryptKey(newFriendsKey, key, this.parallel());
					}, this);
					keyStoreService.sym.symEncryptKey(newFriendsKey, mainKey, this.parallel());
					//encrypt old friends key with new friends key
					keyStoreService.sym.symEncryptKey(friendsKey, newFriendsKey, this.parallel());
				}), h.sF(function () {
					//update signedKeys
					signedKeys.metaSetAttr("friends", newFriendsKey);
					signedKeys.getUpdatedData(signKey, this);
				}), h.sF(function (updatedSignedKeys) {
					friendsKey = newFriendsKey;
					this.ne(updatedSignedKeys, newFriendsKey);
				}), cb);
			};

			this.setFriendShipKey = function (key) {
				if (!friendShipKey) {
					friendShipKey = key;
				}
			};

			/** profile management */

			// there is mainly one profile: the "me" profile, containing all data.
			// this profile is always updated when we edit the profile.
			// every other profile is a smaller part of this profile and is generated
			// after updating the "me" profile (or at other times - e.g. when settings change)

			/* gets a given profile attribute to value
			* @param attribute attribute to set
			* @param cb
			*/
			function getProfileAttribute(attribute, cb) {
				step(function () {
					if (myProfile) {
						myProfile.getAttribute(attribute, this.last);
					} else {
						privateProfiles.forEach(function (profile) {
							profile.getAttribute(attribute, this.parallel());
						}, this);

						if (publicProfile) {
							publicProfile.getAttribute(attribute, this.parallel());
						}

						this.parallel()(null, undefined);
					}
				}, h.sF(function (attributeValues) {
					var values = attributeValues.filter(function (value) {
						return typeof value !== "undefined" && value !== "";
					});

					if (values.length === 0) {
						this.ne("");
						return;
					}

					values.sort(function (val1, val2) {
						if (typeof val1 === "object" && typeof val2 === "object") {
							return Object.keys(val2).length - Object.keys(val1).length;
						}

						return 0;
					});

					this.ne(values[0]);
				}), cb);
			}

			/** uses the me profile to generate new profiles */
			this.rebuildProfiles = function (cb) {
				var scopes, privacySettings;
				step(function () {
					if (!theUser.isOwn()) {
						throw new Error("update on another user failed");
					}

					privacySettings = settingsService.getBranch("privacy");
					scopes = getAllProfileTypes(privacySettings);

					this.parallel.unflatten();
					$injector.get("ssn.filterService").filterToKeys(scopes, this.parallel());
					myProfile.getFull(this.parallel());
				}, h.sF(function (keys, profile) {
					var scopeData = h.joinArraysToObject({
						name: scopes,
						key: keys.slice(0, keys.length - 1)
					});

					var pub = new ProfileService({ content: applicablePublicParts(privacySettings, profile) }, { isPublicProfile: true });
					pub.sign(theUser.getSignKey(), this.parallel());

					scopeData.forEach(function (scope) {
						scope.profile = new ProfileService({
							content: applicableParts(scope.name, privacySettings, profile)
						}, { isDecrypted: true });
					}, this);

					scopeData.forEach(function (scope) {
						scope.profile.signAndEncrypt(theUser.getSignKey(), scope.key, this.parallel());
					}, this);
				}), h.sF(function (profileData) {
					var pub = profileData.shift();
					this.ne({
						pub: pub,
						priv: profileData
					});
				}), cb);

			};

			this.setMail = function (newMail, cb) {
				step(function () {
					if (newMail !== mail) {
						socketService.emit("user.mailChange", { mail: newMail }, this);
					} else {
						this.last.ne();
					}
				}, h.sF(function (data) {
					if (data.error) {
						throw new Error("mail not accepted");
					} else {
						mail = newMail;
						this.ne();
					}
				}), cb);
			};

			/** uploads all profiles (also recreates them) */
			this.uploadChangedProfile = function (cb) {
				step(function () {
					this.parallel.unflatten();
					theUser.rebuildProfiles(this.parallel());
					myProfile.getUpdatedData(theUser.getSignKey(), this.parallel());
				}, h.sF(function (profileData, myProfile) {
					profileData.me = myProfile;

					socketService.emit("user.profile.update", profileData, this);
				}), h.sF(function () {
					myProfile.updated();

					basicDataLoaded = false;
					theUser.loadFullData(this);
				}), cb);
			};

			/* sets a given profile attribute to value
			* @param attribute attribute to set
			* @param value value of the attribute
			* @param cb
			*/
			this.setProfileAttribute = function (attribute, value, cb) {
				myProfile.setAttribute(attribute, value, cb);
			};

			this.getFingerPrint = function () {
				return keyStoreService.format.fingerPrint(theUser.getSignKey());
			};

			this.verifyFingerPrint = function (fingerPrint) {
				if (fingerPrint !== theUser.getFingerPrint()) {
					return false;
				}
			};

			this.setAdvancedProfile = function (advancedProfile, cb) {
				step(function () {
					advancedBranches.forEach(function (branch) {
						myProfile.setAttribute(branch, advancedProfile[branch], this.parallel());
					}, this);
				}, cb);
			};

			this.getProfileAttribute = getProfileAttribute;

			/** end profile management */

			this.verifyOwnKeys = function () {
				keyStoreService.security.verifyWithPW(signedOwnKeys, {
					main: theUser.getMainKey(),
					sign: theUser.getSignKey()
				});

				keyStoreService.security.addEncryptionIdentifier(theUser.getMainKey());
				keyStoreService.security.addEncryptionIdentifier(theUser.getSignKey());
			};

			this.verifyKeys = function (cb) {
				var signKey = theUser.getSignKey();
				step(function () {
					signedKeys.verify(signKey, this, theUser.getID());
				}, h.sF(function () {
					var friends = signedKeys.metaAttr("friends");
					var crypt = signedKeys.metaAttr("crypt");

					keyStoreService.security.addEncryptionIdentifier(friends);
					keyStoreService.security.addEncryptionIdentifier(crypt);

					this.ne();
				}), cb);
			};

			this.verify = function (cb) {
				step(function () {
					var signKey = theUser.getSignKey();

					theUser.verifyKeys(this.parallel());

					if (theUser.isOwn()) {
						myProfile.verify(signKey, this.parallel());
					} else {
						privateProfiles.forEach(function (priv) {
							priv.verify(signKey, this.parallel());
						}, this);

						if (publicProfile) {
							publicProfile.verify(signKey, this.parallel());
						}

						this.parallel()(null, true);
					}
				}, h.sF(function (verified) {
					var ok = verified.reduce(h.and, true);

					this.ne(ok);
				}), cb);
			};

			this.verifyFingerPrint = function (fingerPrint, cb) {
				if (fingerPrint !== keyStoreService.format.fingerPrint(theUser.getSignKey())) {
					return false;
				}

				step(function () {
					$injector.get("ssn.trustService").verifyUser(theUser, this);
				}, h.sF(function () {
					theUser.data.trustLevel = 2;
					this.ne();
				}), cb);

				return true;
			};

			this.update = updateUser;

			this.createBackupKey = function (cb) {
				var outerKey;
				step(function () {
					return initService.awaitLoading();
				}, h.sF(function () {
					keyStoreService.sym.createBackupKey(mainKey, this);
				}), h.sF(function (backupKeyData) {
					var decryptors = backupKeyData.decryptors;
					var innerKey = backupKeyData.innerKey;

					outerKey = backupKeyData.outerKey;

					socketService.emit("user.backupKey", {
						innerKey: innerKey,
						decryptors: decryptors
					}, this);
				}), h.sF(function (data) {
					if (data.error) {
						throw new Error("server error");
					}

					this.ne(keyStoreService.format.base32(outerKey));
				}), cb);
			};

			this.getTrustLevel = function (cb) {
				step(function () {
					theUser.getTrustData(this);
				}, h.sF(function (trust) {
					if (trust.isOwn()) {
						this.ne(-1);
					} else if (trust.isVerified()) {
						this.ne(2);
					} else if (trust.isWhispeerVerified() || trust.isNetworkVerified()) {
						this.ne(1);
					} else {
						this.ne(0);
					}
				}), cb);
			};

			this.getTrustData = function (cb) {
				var trust = $injector.get("ssn.trustService").getKey(theUser.getSignKey());

				cb(null, trust);
			};

			this.changePassword = function (newPassword, cb) {
				step(function () {
					if (!theUser.isOwn()) {
						throw new Error("not my own user");
					}

					var ownKeys = {main: mainKey, sign: signKey};

					this.parallel.unflatten();

					keyStoreService.security.makePWVerifiable(ownKeys, newPassword, this.parallel());
					keyStoreService.random.hex(16, this.parallel());

					keyStoreService.sym.pwEncryptKey(mainKey, newPassword, this.parallel());
				}, h.sF(function (signedOwnKeys, salt, decryptor) {
					socketService.emit("user.changePassword", {
						signedOwnKeys: signedOwnKeys,
						password: {
							salt: salt,
							hash: keyStoreService.hash.hashPW(newPassword, salt),
						},
						decryptor: decryptor
					}, this);
				}), h.sF(function () {
					sessionService.setPassword(newPassword);
					this.ne();
				}), cb);
			};

			this.loadFullData = function (cb) {
				step(function () {
					advancedBranches.forEach(function (branch) {
						getProfileAttribute(branch, this.parallel());
					}, this);

					theUser.loadBasicData(this.parallel());
				}, h.sF(function (result) {
					var i, a = theUser.data.advanced, defaults = [{}, {}, {}, [], {}, {}, []];

					for (i = 0; i < advancedBranches.length; i += 1) {
						if (advancedBranches[i] === "gender" && typeof result[i] === "string") {
							result[i] = { gender: result[i] };
						}

						a[advancedBranches[i]] = h.deepCopyObj(result[i] || defaults[i], 3);
					}

					this.ne();
				}), cb);
			};

			this.getFriends = function (cb) {
				friendsService.getUserFriends(this.getID(), cb);
			};

			this.loadImage = function () {
				step(function () {
					theUser.getImage(this);
				}, h.sF(function (imageUrl) {
					theUser.data.basic.image = imageUrl;
				}), errorService.criticalError);
			};

			this.loadBasicData = function (cb) {
				step(function () {
					if (!basicDataLoaded) {
						this.parallel.unflatten();

						theUser.getShortName(this.parallel());
						theUser.getName(this.parallel());
						theUser.getTrustLevel(this.parallel());
						theUser.verify(this.parallel());
					} else {
						this.last.ne();
					}
				}, h.sF(function (shortname, names, trustLevel, signatureValid) {
					basicDataLoaded = true;

					theUser.data.signatureValid = signatureValid;

					theUser.data.me = theUser.isOwn();
					theUser.data.other = !theUser.isOwn();

					theUser.data.trustLevel = trustLevel;

					theUser.data.online = friendsService.onlineStatus(theUser.getID()) || 0;

					friendsService.listen(function (status) {
						theUser.data.online = status;
					}, "online:" + theUser.getID());

					theUser.data.name = names.name;
					theUser.data.names = names;

					theUser.data.basic.shortname = shortname;

					friendsService.awaitLoading().then(function () {
						theUser.data.added = friendsService.didIRequest(theUser.getID());
						theUser.data.isMyFriend = friendsService.areFriends(theUser.getID());

						$rootScope.$apply();

						friendsService.listen(function () {
							theUser.data.added = friendsService.didIRequest(theUser.getID());
							theUser.data.isMyFriend = friendsService.areFriends(theUser.getID());
						});
					});

					theUser.data.addFriendState = addFriendState.data;
					theUser.data.ignoreFriendState = ignoreFriendState.data;

					theUser.loadImage();

					$rootScope.$apply();

					this.ne();
				}), cb);
			};

			this.setMigrationState = function (migrationState, cb) {
				step(function () {
					socketService.emit("user.setMigrationState", {
						migrationState: migrationState
					}, this);
				}, cb);
			};

			this.getMigrationState = function (cb) {
				cb(null, migrationState);
			};

			this.isOwn = function () {
				return theUser.getID() === sessionService.getUserID();
			};

			this.getNickOrMail = function () {
				return nickname || mail;
			};

			this.getMainKey = function () {
				return mainKey;
			};

			this.getSignKey = function () {
				return signKey;
			};

			this.getCryptKey = function () {
				return cryptKey;
			};

			this.getFriendShipKey = function () {
				return friendShipKey;
			};

			this.getContactKey = function () {
				return friendShipKey || cryptKey;
			};

			this.getFriendsKey = function () {
				return friendsKey;
			};

			this.getID = function () {
				return parseInt(id, 10);
			};

			this.visitProfile = function () {
				$injector.get("$state").go("app.user.info", {
					identifier: this.getNickname()
				});
			};

			this.getNickname = function () {
				return nickname;
			};

			this.getMail = function () {
				return mail;
			};

			this.getImage = function (cb) {
				step(function () {
					getProfileAttribute("imageBlob", this);
				}, h.sF(function (imageBlob) {
					if (imageBlob) {
						blobService.getBlob(imageBlob.blobid, this);
					} else {
						this.last.ne("assets/img/user.png");
					}
				}), h.sF(function (blob) {
					blob.toURL(this);
				}), cb);
			};

			this.getShortName = function (cb) {
				step(function getSN1() {
					getProfileAttribute("basic", this);
				}, h.sF(function (basic) {
					basic = basic || {};
					var nickname = theUser.getNickname();

					this.ne(basic.firstname || basic.lastname || nickname || "");
				}), cb);
			};

			this.getName = function (cb) {
				step(function getN1() {
					this.parallel.unflatten();

					getProfileAttribute("basic", this);
				}, h.sF(function (basic) {
					basic = basic || {};
					var nickname = theUser.getNickname();

					var name = "";
					if (basic.firstname && basic.lastname) {
						name = basic.firstname + " " + basic.lastname;
					} else if (basic.firstname || basic.lastname) {
						name = basic.firstname || basic.lastname;
					} else if (nickname) {
						name = nickname;
					}

					this.ne({
						name: name,
						firstname: basic.firstname || "",
						lastname: basic.lastname || "",
						nickname: nickname || ""
					});
				}), cb);
			};

			this.ignoreFriendShip = function () {
				ignoreFriendState.pending();
				if (!this.isOwn()) {
					friendsService.ignoreFriendShip(this.getID(), errorService.failOnError(ignoreFriendState));
				} else {
					ignoreFriendState.failed();
				}				
			};

			this.acceptFriendShip = function () {
				addFriendState.pending();
				if (!this.isOwn()) {
					friendsService.acceptFriendShip(this.getID(), errorService.failOnError(addFriendState));
				} else {
					addFriendState.failed();
				}
			};

			this.isNotExistingUser = function () {
				return false;
			};

			this.removeAsFriend = function () {
				if (!this.isOwn()) {
					friendsService.removeFriend(this.getID(), errorService.criticalError);
				} else {
					addFriendState.failed();
				}
			};

			this.addAsFriend = function () {
				addFriendState.pending();
				if (!this.isOwn()) {
					friendsService.friendship(this.getID(), errorService.failOnError(addFriendState));
				} else {
					addFriendState.failed();
				}
			};
		};
	}

	userModel.$inject = ["$injector",  "$rootScope", "ssn.blobService",  "ssn.keyStoreService", "ssn.profileService", "ssn.sessionService", "ssn.settingsService", "ssn.socketService", "ssn.friendsService", "ssn.errorService", "ssn.initService"];

	modelsModule.factory("ssn.models.user", userModel);
});
