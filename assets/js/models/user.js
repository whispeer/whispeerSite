define(["whispeerHelper", "asset/state", "asset/securedDataWithMetaData", "models/modelsModule", "bluebird"], function (h, State, SecuredData, modelsModule, Bluebird) {
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

	function deleteCache() {
		return Bluebird.try(function () {
			return new Bluebird(function (resolve) {
				var deleteRequest = indexedDB.deleteDatabase("whispeerCache");

				deleteRequest.onerror = resolve;
				deleteRequest.onsuccess = resolve;
			});
		});
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

			this.generateNewFriendsKey = function () {
				var newFriendsKey;
				return Bluebird.try(function () {
					if (!theUser.isOwn()) {
						throw new Error("not my own user");
					}

					//generate new key
					return keyStoreService.sym.generateKey(null, "friends");
				}).then(function (_newFriendsKey) {
					newFriendsKey = _newFriendsKey;

					//encrypt with all friendShipKeys
					var keys = friendsService.getAllFriendShipKeys();

					var keysPromises = keys.map(function (key) {
						return keyStoreService.sym.symEncryptKey(newFriendsKey, key);
					});

					return Bluebird.all([
						Bluebird.all(keysPromises),
						keyStoreService.sym.symEncryptKey(newFriendsKey, mainKey),

						//encrypt old friends key with new friends key
						keyStoreService.sym.symEncryptKey(friendsKey, newFriendsKey),
					]);
				}).then(function () {
					//update signedKeys
					signedKeys.metaSetAttr("friends", newFriendsKey);
					return signedKeys.getUpdatedData(signKey);
				}).then(function (updatedSignedKeys) {
					friendsKey = newFriendsKey;
					return {
						updatedSignedKeys: updatedSignedKeys,
						newFriendsKey: newFriendsKey
					};
				});
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
			function getProfileAttribute(attribute) {
				if (myProfile) {
					return myProfile.getAttribute(attribute);
				}

				var profiles = privateProfiles.concat([publicProfile]);

				return Bluebird.resolve(profiles).map(function (profile) {
					return profile.getAttribute(attribute);
				}).filter(function (value) {
					return typeof value !== "undefined" && value !== "";
				}).then(function (values) {
					if (values.length === 0) {
						return "";
					}

					values.sort(function (val1, val2) {
						if (typeof val1 === "object" && typeof val2 === "object") {
							return Object.keys(val2).length - Object.keys(val1).length;
						}

						return 0;
					});

					return values[0];
				});
			}

			/** uses the me profile to generate new profiles */
			this.rebuildProfiles = function () {
				var scopes, privacySettings;
				return Bluebird.try(function () {
					if (!theUser.isOwn()) {
						throw new Error("update on another user failed");
					}

					privacySettings = settingsService.getBranch("privacy");
					scopes = getAllProfileTypes(privacySettings);

					return Bluebird.all([
						$injector.get("ssn.filterService").filterToKeys(scopes),
						myProfile.getFull()
					]);
				}).spread(function (keys, profile) {
					var scopeData = h.joinArraysToObject({
						name: scopes,
						key: keys.slice(0, keys.length - 1)
					});

					var pub = new ProfileService({ content: applicablePublicParts(privacySettings, profile) }, { isPublicProfile: true });
					var pubPromise = pub.sign(theUser.getSignKey());

					var privatePromises = scopeData.map(function (scope) {
						var newProfile = new ProfileService({
							content: applicableParts(scope.name, privacySettings, profile)
						}, { isDecrypted: true });

						return newProfile.signAndEncrypt(theUser.getSignKey(), scope.key);
					});

					return Bluebird.all([
						pubPromise,
						Bluebird.all(privatePromises)
					]);
				}).spread(function (pub, profileData) {
					return {
						pub: pub,
						priv: profileData
					};
				});

			};

			this.setMail = function (newMail, cb) {
				if (newMail === mail) {
					return Bluebird.resolve().nodeify(cb);
				}

				return socketService.emit("user.mailChange", { mail: newMail }).then(function () {
					mail = newMail;
				}).nodeify(cb);
			};

			/** uploads all profiles (also recreates them) */
			this.uploadChangedProfile = function (cb) {
				return Bluebird.try(function () {
					return Bluebird.all([
						theUser.rebuildProfiles(),
						myProfile.getUpdatedData(theUser.getSignKey())
					]);
				}).spread(function (profileData, myProfile) {
					profileData.me = myProfile;

					return socketService.emit("user.profile.update", profileData);
				}).then(function () {
					myProfile.updated();

					basicDataLoaded = false;
					return theUser.loadFullData();
				}).nodeify(cb);
			};

			/* sets a given profile attribute to value
			* @param attribute attribute to set
			* @param value value of the attribute
			* @param cb
			*/
			this.setProfileAttribute = function (attribute, value, cb) {
				return new Bluebird(function(resolve) {
					myProfile.setAttribute(attribute, value, resolve);
				}).nodeify(cb);
			};

			this.getFingerPrint = function () {
				return keyStoreService.format.fingerPrint(theUser.getSignKey());
			};

			this.setAdvancedProfile = function (advancedProfile, cb) {
				return Bluebird.resolve(advancedBranches).map(function (branch) {
					return myProfile.setAttribute(branch, advancedProfile[branch]);
				}).nodeify(cb);
			};

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
				return Bluebird.try(function () {
					var signKey = theUser.getSignKey();
					return signedKeys.verifyAsync(signKey, theUser.getID());
				}).then(function () {
					var friends = signedKeys.metaAttr("friends");
					var crypt = signedKeys.metaAttr("crypt");

					keyStoreService.security.addEncryptionIdentifier(friends);
					keyStoreService.security.addEncryptionIdentifier(crypt);
				}).nodeify(cb);
			};

			this.verify = function (cb) {
				return Bluebird.try(function () {
					var promises = [];

					promises.push(theUser.verifyKeys());

					if (theUser.isOwn()) {
						promises.push(myProfile.verify(signKey));
					} else {
						promises = promises.concat(privateProfiles.map(function (priv) {
							return priv.verify(signKey);
						}));

						if (publicProfile) {
							promises.push(publicProfile.verify(signKey));
						}
					}

					return Bluebird.all(promises);
				}).nodeify(cb);
			};

			this.verifyFingerPrint = function (fingerPrint, cb) {
				return Bluebird.try(function () {
					if (fingerPrint !== keyStoreService.format.fingerPrint(theUser.getSignKey())) {
						throw new Error("wrong code");
					}

					return $injector.get("ssn.trustService").verifyUser(theUser);
				}).then(function () {
					theUser.data.trustLevel = 2;
				}).nodeify(cb);
			};

			this.update = updateUser;

			this.createBackupKey = function (cb) {
				var outerKey;
				return Bluebird.try(function () {
					return initService.awaitLoading();
				}).then(function () {
					return keyStoreService.sym.createBackupKey(mainKey);
				}).then(function (backupKeyData) {
					var decryptors = backupKeyData.decryptors;
					var innerKey = backupKeyData.innerKey;

					outerKey = backupKeyData.outerKey;

					return socketService.emit("user.backupKey", {
						innerKey: innerKey,
						decryptors: decryptors
					});
				}).then(function (data) {
					if (data.error) {
						throw new Error("server error");
					}

					return keyStoreService.format.base32(outerKey);
				}).nodeify(cb);
			};

			this.getTrustLevel = function (cb) {
				return theUser.getTrustData().then(function (trust) {
					if (trust.isOwn()) {
						return -1;
					}

					if (trust.isVerified()) {
						return 2;
					}

					if (trust.isWhispeerVerified() || trust.isNetworkVerified()) {
						return 1;
					}

					return 0;
				}).nodeify(cb);
			};

			this.getTrustData = function () {
				return Bluebird.resolve(
					$injector.get("ssn.trustService").getKey(theUser.getSignKey())
				);
			};

			this.changePassword = function (newPassword, cb) {
				return Bluebird.try(function () {
					if (!theUser.isOwn()) {
						throw new Error("not my own user");
					}

					var ownKeys = {main: mainKey, sign: signKey};

					return Bluebird.all([
						keyStoreService.security.makePWVerifiable(ownKeys, newPassword),
						keyStoreService.random.hex(16),

						keyStoreService.sym.pwEncryptKey(mainKey, newPassword),

						deleteCache(),
					]);
				}).spread(function (signedOwnKeys, salt, decryptor) {
					return socketService.emit("user.changePassword", {
						signedOwnKeys: signedOwnKeys,
						password: {
							salt: salt,
							hash: keyStoreService.hash.hashPW(newPassword, salt),
						},
						decryptor: decryptor
					});
				}).then(function () {
					sessionService.setPassword(newPassword);
				}).nodeify(cb);
			};

			this.loadFullData = function (cb) {
				return Bluebird.try(function () {
					return theUser.loadBasicData().thenReturn(advancedBranches);
				}).map(function (branch) {
					return getProfileAttribute(branch);
				}).then(function (result) {
					var i, advanced = theUser.data.advanced, defaults = [{}, {}, {}, [], {}, {}, []];

					for (i = 0; i < advancedBranches.length; i += 1) {
						if (advancedBranches[i] === "gender" && typeof result[i] === "string") {
							result[i] = { gender: result[i] };
						}

						advanced[advancedBranches[i]] = h.deepCopyObj(result[i] || defaults[i], 3);
					}
				}).nodeify(cb);
			};

			this.getFriends = function (cb) {
				friendsService.getUserFriends(this.getID(), cb);
			};

			this.loadImage = function () {
				return theUser.getImage().then(function (imageUrl) {
					theUser.data.basic.image = imageUrl;
				}).catch(errorService.criticalError);
			};

			this.reLoadBasicData = function (cb) {
				basicDataLoaded = false;
				this.loadBasicData(cb);
			};

			this.loadBasicData = function (cb) {
				if (basicDataLoaded) {
					return Bluebird.resolve().nodeify(cb);
				}

				return Bluebird.try(function () {
					return Bluebird.all([
						theUser.getShortName(),
						theUser.getName(),
						theUser.getTrustLevel(),
						theUser.verify()
					]);
				}).spread(function (shortname, names, trustLevel, signatureValid) {
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

						friendsService.listen(function () {
							theUser.data.added = friendsService.didIRequest(theUser.getID());
							theUser.data.isMyFriend = friendsService.areFriends(theUser.getID());
							$rootScope.$applyAsync();
						});
					});

					theUser.data.addFriendState = addFriendState.data;
					theUser.data.ignoreFriendState = ignoreFriendState.data;

					theUser.loadImage();

					return null;
				}).nodeify(cb);
			};

			this.setMigrationState = function (migrationState, cb) {
				return socketService.emit("user.setMigrationState", {
						migrationState: migrationState
				}).nodeify(cb);
			};

			this.getMigrationState = function () {
				return Bluebird.resolve(migrationState);
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
				return Bluebird.try(function () {
					return getProfileAttribute("imageBlob");
				}).then(function (imageBlob) {
					if (!imageBlob) {
						return "assets/img/user.png";
					}

					return blobService.getBlob(imageBlob.blobid).then(function (blob) {
						return blob.toURL();
					});
				}).nodeify(cb);
			};

			this.getShortName = function (cb) {
				return getProfileAttribute("basic").then(function (basic) {
					basic = basic || {};
					var nickname = theUser.getNickname();

					return basic.firstname || basic.lastname || nickname || "";
				}).nodeify(cb);
			};

			this.getName = function (cb) {
				return getProfileAttribute("basic").then(function (basic) {
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

					return {
						name: name,
						firstname: basic.firstname || "",
						lastname: basic.lastname || "",
						nickname: nickname || ""
					};
				}).nodeify(cb);
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
