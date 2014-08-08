define(["step", "whispeerHelper", "asset/state", "asset/securedDataWithMetaData", "crypto/trustManager"], function (step, h, State, SecuredData, trustManager) {
	"use strict";

	var advancedBranches = ["location", "birthday", "relationship", "education", "work", "gender", "languages"];

	function applicableParts(scope, privacy, profile) {
		var attr, result = {};

		if (privacy === undefined || profile === undefined) {
			throw new Error("dafuq");
		}

		for (attr in privacy) {
			if (typeof privacy[attr].encrypt !== "undefined") {
				if (privacy[attr].encrypt && privacy[attr].visibility.indexOf(scope) > -1) {
					result[attr] = profile[attr];
				}
			} else if (profile[attr]) {
				result[attr] = applicableParts(scope, privacy[attr], profile[attr]);
			}
		}

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
		var i, profileTypes = [];
		for (i = 0; i < advancedBranches.length; i += 1) {
			var cur = privacySettings[advancedBranches[i]];
			if (cur.encrypt) {
				profileTypes = profileTypes.concat(cur.visibility);
			}
		}

		if (privacySettings.basic.firstname.encrypt) {
			profileTypes = profileTypes.concat(privacySettings.basic.firstname.visibility);
		}

		if (privacySettings.basic.lastname.encrypt) {
			profileTypes = profileTypes.concat(privacySettings.basic.lastname.visibility);
		}

		return h.arrayUnique(profileTypes);
	}

	function userModel($injector, $location, blobService, keyStoreService, ProfileService, sessionService, settingsService, socketService, friendsService, errorService) {
		return function User (providedData) {
			var theUser = this, mainKey, signKey, cryptKey, friendShipKey, friendsKey, friendsLevel2Key, migrationState, signedKeys, signedOwnKeys;
			var id, mail, nickname, publicProfile, privateProfiles = [], mutualFriends;

			var addFriendState = new State();

			function findMeProfile(cb) {
				var newMeProfile;
				step(function () {
					publicProfile.verify(this.parallel());
					privateProfiles.forEach(function (profile) {
						profile.getScope(this.parallel());
					}, this);
				}, h.sF(function (scopes) {
					var me;

					scopes.forEach(function (scope, index) {
						if (scope === "me") {
							me = privateProfiles[index];
						}
					});

					if (me) {
						this.last.ne(me);
					} else {
						//we need to find the me profile by hand
						//TODO: also TODO: how to re-add the metaData...
						//most likely: delete, recreate....

						privateProfiles.forEach(function (profile) {
							profile.getFull(this.parallel());
						}, this);
					}
				}), h.sF(function (profileData) {
					var likelyMeProfile = {};

					profileData.forEach(function (profile) {
						if (Object.keys(profile).length > Object.keys(likelyMeProfile).length) {
							likelyMeProfile = profile;
						}
					});

					newMeProfile = new ProfileService({
						profile: likelyMeProfile,
						metaData: {
							scope: "me"
						}
					}, true);
					newMeProfile.signAndEncrypt(theUser.getSignKey(), theUser.getMainKey(), theUser.getMainKey(), this);
				}), h.sF(function (encryptedNewMe) {
					socketService.emit("user.createPrivateProfiles", {
						privateProfiles: [encryptedNewMe]
					}, this);
				}), h.sF(function (data) {
					if (!data.error) {
						this.ne(newMeProfile);
					} else {
						console.error("create failed");
					}
				}), cb);
			}

			function repairProfiles() {
				step(function () {
					//find main profile
					findMeProfile(this);
				}, h.sF(function (meProfile) {
					//delete other profiles
					var profilesToDelete = privateProfiles.filter(function (profile) {
						return profile !== meProfile;
					}).map(function (profile) {
						return profile.getID();
					});

					socketService.emit("user", {
						deletePrivateProfiles: {
							profilesToDelete: profilesToDelete
						}
					}, this);
				}), h.sF(function () {
					//rebuildFromSettings
					settingsService.getBranch("privacy", this);
				}), h.sF(function (settings) {
					var usedScopes = getAllProfileTypes(settings);
					theUser.createProfileObjects(usedScopes, settings, this);
				}), h.sF(function (profilesToCreate) {
					socketService.emit("user", {
						createPrivateProfiles: {
							privateProfiles: profilesToCreate
						}
					}, this);
				}), errorService.criticalError);
			}

			this.data = {};

			function updateUser(userData) {
				if (id && parseInt(userData.id, 10) !== parseInt(id, 10)) {
					throw new Error("user update invalid");
				}

				mutualFriends = userData.mutualFriends;

				id = parseInt(userData.id, 10);
				mail = userData.mail;
				nickname = userData.nickname;

				migrationState = userData.migrationState || 0;

				signedKeys = SecuredData.load(undefined, userData.signedKeys);
				signedOwnKeys = userData.signedOwnKeys;

				userData.keys = h.objectMap(userData.keys, function (key) {
					return keyStoreService.upload.addKey(key);
				});

				//do not overwrite keys.
				if (!mainKey && userData.keys.mainKey) {
					mainKey = userData.keys.mainKey;
				}

				//all keys we get from the signedKeys object:
				if (!signKey && userData.keys.signKey) {
					signKey = signedKeys.metaAttr("sign");
				}

				if (!cryptKey && userData.keys.cryptKey) {
					cryptKey = signedKeys.metaAttr("crypt");
				}

				if (!friendsKey && userData.keys.friendsKey) {
					friendsKey = signedKeys.metaAttr("friends");
				}

				if (!friendsLevel2Key && userData.keys.friendsLevel2Key) {
					friendsLevel2Key = signedKeys.metaAttr("friendsLevel2");
				}

				//TODO: secure this key!
				if (!friendShipKey && userData.keys.friendShipKey) {
					friendShipKey = userData.keys.friendShipKey;
				}



				publicProfile = new ProfileService(userData.profile.pub, { isPublicProfile: true });

				privateProfiles = [];

				//todo: update profiles. for now: overwrite
				if (userData.profile && userData.profile.priv && userData.profile.priv instanceof Array) {
					var priv = userData.profile.priv;

					var profilesBroken = false;

					var isMe = (id === sessionService.getUserID());

					priv.forEach(function (profile) {
						if (profile.metaData === false && isMe) {
							profilesBroken = true;
						}

						privateProfiles.push(new ProfileService(profile));
					});

					if (profilesBroken) {
						repairProfiles();
					}
				}

				theUser.data = {
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
						gender: "",
						languages: []
					}
				};
			}

			updateUser(providedData);

			this.setFriendShipKey = function (key) {
				if (!friendShipKey) {
					friendShipKey = key;
				}
			};

			function setPrivateProfile(attrs, val, visible, cb) {
				var priv = theUser.getPrivateProfiles();
				step(function () {
					var i;
					for (i = 0; i < priv.length; i += 1) {
						priv[i].getScope(this.parallel());
					}
				}, h.sF(function (scopes) {
					if (scopes.length !== priv.length) {
						throw new Error("bug");
					}

					var i;
					for (i = 0; i < priv.length; i += 1) {
						if (visible.indexOf(scopes[i]) > -1 || scopes[i] === "me") {
							priv[i].setAttribute(attrs, val, this.parallel());
						}
					}
				}), cb);
			}

			function getChangedPrivateProfiles(cb) {
				var priv = theUser.getPrivateProfiles();
				step(function () {
					var i;
					for (i = 0; i < priv.length; i += 1) {
						if (priv[i].changed()) {
							priv[i].getUpdatedData(theUser.getSignKey(), this.parallel());
						}
					}

					this.parallel()();
				}, cb);
			}

			function getChangedPublicProfile(cb) {
				publicProfile.getUpdatedData(signKey, cb);
			}

			function uploadChangedProfile(cb) {
				var data = {}, allok;
				var priv = theUser.getPrivateProfiles();

				step(function () {
					this.parallel.unflatten();

					getChangedPrivateProfiles(this.parallel());
					getChangedPublicProfile(this.parallel());
				}, h.sF(function (profiles, publicProfile) {
					if (profiles && profiles.length > 0) {
						data.priv = profiles;
					}

					if (publicProfile) {
						data.pub = publicProfile;
					}

					if (data.priv || data.pub) {
						socketService.emit("user.profileChange", data, this);
					} else {
						this.last.ne(true);
					}
				}), h.sF(function (result) {
					if (!result.errors.pub) {
						publicProfile.updated();
					}

					var i;
					for (i = 0; i < priv.length; i += 1) {
						if (result.allok || result.errors.priv.indexOf(priv[i].getID()) === -1) {
							priv[i].updated();
						}
					}

					allok = result.allok;

					basicDataLoaded = false;
					theUser.loadBasicData(this);
				}), h.sF(function () {
					//reload basic profile data!
					this.ne(allok);
				}), cb);
			}

			function setProfileAttribute(attrs, val, cb) {
				step(function () {
					settingsService.getPrivacyVisibility(attrs, this);
				}, h.sF(function (visible) {
					if (visible === false) {
						publicProfile.setAttribute(attrs.split("."), val, this);
					} else if (visible) {
						setPrivateProfile(attrs.split("."), val, visible, this);
					}
				}), cb);
			}

			this.uploadChangedProfile = uploadChangedProfile;
			this.setProfileAttribute = setProfileAttribute;

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
				trustManager.setOwnSignKey(signKey);
				step(function () {
					signedKeys.verify(signKey, this);
				}, h.sF(function () {
					var friends = signedKeys.metaAttr("friends");
					var friendsLevel2 = signedKeys.metaAttr("friendsLevel2");
					var crypt = signedKeys.metaAttr("crypt");

					keyStoreService.security.addEncryptionIdentifier(friends);
					keyStoreService.security.addEncryptionIdentifier(friendsLevel2);
					keyStoreService.security.addEncryptionIdentifier(crypt);

					this.ne();
				}), cb);
			};

			this.verify = function (cb) {
				step(function () {
					var signKey = theUser.getSignKey();
					privateProfiles.forEach(function (priv) {
						priv.verify(signKey, this.parallel());
					}, this);

					theUser.verifyKeys(this.parallel());
					publicProfile.verify(signKey, this.parallel());
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

			this.rebuildProfilesForSettings = function (newSettings, oldSettings, cb) {
				step(function () {
					theUser.getScopes(this);
				}, h.sF(function (scopes) {
					var typesOld = h.removeArray(scopes, "me");
					var typesNew = getAllProfileTypes(newSettings);

					var profilesToAdd = h.arraySubtract(typesNew, typesOld);
					var profilesToRemove = h.arraySubtract(typesOld, typesNew);
					var profilesWithPossibleChanges = h.arraySubtract(typesNew, profilesToAdd);

					this.parallel.unflatten();

					theUser.updateProfilesFromMe(profilesWithPossibleChanges, newSettings, this.parallel());
					theUser.createProfileObjects(profilesToAdd, newSettings, this.parallel());
					theUser.getProfilesToDelete(profilesToRemove, this.parallel());
				}), h.sF(function (profilesToChange, profilesToCreate, profilesToDelete) {
					socketService.emit("user", {
						deletePrivateProfiles: {
							profilesToDelete: profilesToDelete
						},
						createPrivateProfiles: {
							privateProfiles: profilesToCreate
						},
						profileChange: profilesToChange
					}, this);
				}), cb);
			};

			this.getProfilesByScopes = function (scopes, cb) {
				var priv = theUser.getPrivateProfiles();
				step(function () {
					var i;
					for (i = 0; i < priv.length; i += 1) {
						priv[i].getScope(this.parallel());
					}
				}, h.sF(function (oldScopes) {
					if (oldScopes.length !== priv.length) {
						throw new Error("bug");
					}

					var profiles = scopes.map(function (e) {
						if (oldScopes.indexOf(e) === -1) {
							throw new Error("scope not found!");
						}

						return priv[oldScopes.indexOf(e)];
					});

					this.ne(profiles);
				}), cb);
			};

			this.updateProfilesFromMe = function(scopes, privacySettings, cb) {
				step(function () {
					this.parallel.unflatten();

					theUser.getProfilesByScopes(scopes, this.parallel());
					theUser.getMyProfileData(this.parallel());
				}, h.sF(function (profiles, myProfile) {
					var i;
					for (i = 0; i < profiles.length; i += 1) {
						profiles[i].setFullProfile(applicableParts(scopes[i], privacySettings, myProfile), this.parallel());
					}

					publicProfile.setFullProfile(applicablePublicParts(privacySettings, myProfile), this.parallel());
				}), h.sF(function () {
					this.parallel.unflatten();

					getChangedPrivateProfiles(this.parallel());
					getChangedPublicProfile(this.parallel());
				}), h.sF(function (profiles, publicProfile) {
					var data = {};

					if (profiles && profiles.length > 0) {
						data.priv = profiles;
					}

					if (publicProfile) {
						data.pub = publicProfile;
					}

					this.ne(data);
				}), cb);
			};

			this.verifyProfiles = function(cb) {
				step(function () {
					console.time("verifyUserProfiles" + id);
					theUser.getPrivateProfiles().forEach(function (privateProfile) {
						privateProfile.verify(signKey, this.parallel());
					}, this);
				}, h.sF(function () {
					console.timeEnd("verifyUserProfiles" + id);
					this.ne();
				}), cb);
			};

			function getProfileAttribute(attrs, cb) {
				step(function () {
					var priv = theUser.getPrivateProfiles(), i;

					for (i = 0; i < priv.length; i += 1) {
						priv[i].getAttribute(attrs, this.parallel());
					}

					theUser.getProfile().getAttribute(attrs, this.parallel());
				}, h.sF(function (results) {
					var i;
					if (results) {
						for (i = 0; i < results.length; i += 1) {
							if (results[i]) {
								this.last.ne(results[i]);
								return;
							}
						}
					}

					this.last.ne();
				}), cb);
			}
			this.getProfileAttribute = getProfileAttribute;

			this.update = updateUser;

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

			this.loadFullData = function (cb) {
				step(function () {
					var i;
					for (i = 0; i < advancedBranches.length; i += 1) {
						getProfileAttribute([advancedBranches[i]], this.parallel());
					}
					theUser.loadBasicData(this.parallel());
				}, h.sF(function (result) {
					var i, a = theUser.data.advanced, defaults = [{}, {}, {}, [], {}, "", []];
					for (i = 0; i < advancedBranches.length; i += 1) {
						a[advancedBranches[i]] = h.deepCopyObj(result[i] || defaults[i], 3);
					}

					this.ne();
				}), cb);
			};

			this.getFriends = function (cb) {
				friendsService.getUserFriends(this.getID(), cb);
			};

			var basicDataLoaded = false;

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

					theUser.data.added = friendsService.didIRequest(theUser.getID());
					theUser.data.isMyFriend = friendsService.areFriends(theUser.getID());

					theUser.data.addFriendState = addFriendState.data;

					theUser.loadImage();

					friendsService.listen(function () {
						theUser.data.added = friendsService.didIRequest(theUser.getID());
						theUser.data.isMyFriend = friendsService.areFriends(theUser.getID());
					});

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

			this.getFriendsLevel2Key = function () {
				return friendsLevel2Key;
			};

			this.getID = function () {
				return parseInt(id, 10);
			};

			this.visitProfile = function () {
				var url = theUser.getUrl();
				$location.path(url);
			};

			this.getUrl = function () {
				return "user/" + this.getNickname();
			};

			this.getNickname = function () {
				return nickname;
			};

			this.getMail = function () {
				return mail;
			};

			this.getProfile = function () {
				return publicProfile;
			};

			this.getPrivateProfiles = function () {
				return privateProfiles;
			};

			this.getImage = function (cb) {
				step(function () {
					this.parallel.unflatten();

					getProfileAttribute("imageBlob", this.parallel());
					getProfileAttribute("image", this.parallel());
				}, h.sF(function (imageBlob, image) {
					var img, url;
					if (imageBlob) {
						blobService.getBlob(imageBlob.blobid, this);
					} else if (image) {
						if (typeof URL !== "undefined") {
							img = h.dataURItoBlob(image);
							url = URL.createObjectURL(img);
							this.last.ne(url);
						} else if (typeof webkitURL !== "undefined") {
							img = h.dataURItoBlob(image);
							url = webkitURL.createObjectURL(img);
							this.last.ne(url);
						} else {
							this.last.ne(image);
						}
					} else {
						this.last.ne("assets/img/user.png");
					}
				}), h.sF(function (blob) {
					this.ne(blob.toURL());
				}), cb);
			};

			this.getShortName = function (cb) {
				step(function getSN1() {
					this.parallel.unflatten();

					getProfileAttribute(["basic", "firstname"], this.parallel());
					getProfileAttribute(["basic", "lastname"], this.parallel());
				}, h.sF(function (firstname, lastname) {
					var nickname = theUser.getNickname();

					this.ne(firstname || lastname || nickname || "");
				}), cb);
			};

			this.getName = function (cb) {
				step(function getN1() {
					this.parallel.unflatten();

					getProfileAttribute(["basic", "firstname"], this.parallel());
					getProfileAttribute(["basic", "lastname"], this.parallel());
				}, h.sF(function (firstname, lastname) {
					var nickname = theUser.getNickname();

					var name = "";
					if (firstname && lastname) {
						name = firstname + " " + lastname;
					} else if (firstname || lastname) {
						name = firstname || lastname;
					} else if (nickname) {
						name = nickname;
					}

					this.ne({
						name: name,
						firstname: firstname || "",
						lastname: lastname || "",
						nickname: nickname || ""
					});
				}), cb);
			};

			function updateProperty(partial, str, cb) {
				if (!partial) {
					cb();
				} else if (typeof partial === "object" && !partial instanceof Array) {
					updatePartial(partial, str, cb);
				} else {
					theUser.setProfileAttribute(str, partial, cb);
				}
			}

			function updatePartial(partial, str, cb) {
				step(function () {
					var attr;

					for (attr in partial) {
						if (partial.hasOwnProperty(attr)) {
							updateProperty(partial[attr], str + "." + attr, this.parallel());
						}
					}
				}, cb);
			}

			this.getMyProfileData = function (cb) {
				step(function () {
					theUser.getProfilesByScopes(["me"], this);
				}, h.sF(function (myProfile) {
					myProfile = myProfile[0];

					myProfile.getFull(this);
				}), cb);
			};

			this.getScopes = function (cb) {
				var priv = theUser.getPrivateProfiles();

				step(function () {
					var i;
					for (i = 0; i < priv.length; i += 1) {
						priv[i].getScope(this.parallel());
					}
				}, h.sF(function (scopes) {
					if (scopes.length !== priv.length) {
						throw new Error("bug");
					}

					this.ne(scopes);
				}), cb);
			};

			this.createProfileObjects = function (scopes, privacySettings, cb) {
				//check if we already got a profile for the given scope.
				step(function () {
					this.parallel.unflatten();

					theUser.getScopes(this.parallel());
					theUser.getMyProfileData(this.parallel());
					$injector.get("ssn.filterKeyService").filterToKeys(scopes, this.parallel());

					if (!privacySettings) {
						settingsService.getBranch("privacy", this.parallel());
					} else {
						this.parallel()(null, privacySettings);
					}
				}, h.sF(function (oldScopes, myProfile, keys, privacySettings) {
					var i, profile;

					for (i = 0; i < scopes.length; i += 1) {
						if (oldScopes.indexOf(scopes[i]) === -1) {
							profile = new ProfileService({
								profile: applicableParts(scopes[i], privacySettings, myProfile),
								metaData: {
									scope: scopes[i]
								}
							}, true);
							profile.signAndEncrypt(theUser.getSignKey(), keys[i], theUser.getMainKey(), this.parallel());
						}
					}

					this.parallel()();
				}), h.sF(function (encryptedProfilesData) {
					encryptedProfilesData = encryptedProfilesData || [];

					this.ne(encryptedProfilesData);
				}), cb);
			};

			this.createProfiles = function (scopes, cb, privacySettings) {
				//check if we already got a profile for the given scope.
				step(function () {
					theUser.createProfileObjects(scopes, this, privacySettings);
				}, h.sF(function (profiles) {
					socketService.emit("user.createPrivateProfiles", {
						privateProfiles: profiles
					}, this);
				}), cb);
			};

			this.getProfilesToDelete = function (scopes, cb) {
				//find the profiles matching a scope.
				var priv = theUser.getPrivateProfiles();
				step(function () {
					var i;
					for (i = 0; i < priv.length; i += 1) {
						priv[i].getScope(this.parallel());
					}
				}, h.sF(function (oldScopes) {
					if (oldScopes.length !== priv.length) {
						throw new Error("bug");
					}

					var toDelete = scopes.map(function (e) {
						if (oldScopes.indexOf(e) === -1) {
							throw new Error("scope not found!");
						}

						return priv[oldScopes.indexOf(e)].getID();
					});

					this.ne(toDelete);
				}), cb);
			};

			this.deleteProfiles = function (scopes, cb) {
				//find the profiles matching a scope.
				step(function () {
					theUser.getProfilesToDelete(scopes, this);
				}, h.sF(function (toDelete) {
					socketService.emit("user.deletePrivateProfiles", {
						profilesToDelete: toDelete
					}, this);
				}), cb);
			};

			this.setAdvancedProfile = function (adv, cb) {
				step(function () {
					var i;
					for (i = 0; i < advancedBranches.length; i += 1) {
						updateProperty(adv[advancedBranches[i]], advancedBranches[i], this.parallel());
					}
				}, cb);
			};

			this.acceptFriendShip = function () {
				addFriendState.pending();
				if (!this.isOwn()) {
					friendsService.acceptFriendShip(this.getID(), errorService.failOnError(addFriendState));
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

	userModel.$inject = ["$injector", "$location", "ssn.blobService",  "ssn.keyStoreService", "ssn.profileService", "ssn.sessionService", "ssn.settingsService", "ssn.socketService", "ssn.friendsService", "ssn.errorService"];

	return userModel;
});