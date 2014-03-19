define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var advancedBranches = ["location", "birthday", "relationship", "education", "work", "gender", "languages"];

	function applicableParts(scope, privacy, profile) {
		var i, attr, result = {};

		if (privacy === undefined || profile === undefined) {
			throw new Error("dafuq");
		}

		for (attr in privacy) {
			if (typeof privacy[attr].encrypt !== "undefined") {
				if (privacy[attr].encrypt && privacy[attr].visibility.indexOf(scope) > -1) {
					result[attr] = profile[attr];
				}
			} else {
				result[attr] = applicableParts(scope, privacy[attr], profile[attr]);
			}
		}

		return result;
	}

	function userModel($injector, $location, keyStoreService, ProfileService, sessionService, settingsService, socketService, friendsService) {
		return function User (providedData) {
			var theUser = this, mainKey, signKey, cryptKey, friendShipKey, friendsKey, friendsLevel2Key;
			var id, mail, nickname, publicProfile, privateProfiles = [], mutualFriends, publicProfileChanged = false, publicProfileSignature;

			this.data = {};

			function updateUser(userData) {
				if (id && parseInt(userData.id, 10) !== parseInt(id, 10)) {
					throw new Error("user update invalid");
				}

				mutualFriends = userData.mutualFriends;

				id = parseInt(userData.id, 10);
				mail = userData.mail;
				nickname = userData.nickname;

				//do not overwrite keys.
				if (!mainKey && userData.keys.main) {
					mainKey = keyStoreService.upload.addKey(userData.keys.main);
				}

				if (!signKey && userData.keys.sign) {
					signKey = keyStoreService.upload.addKey(userData.keys.sign);
				}

				if (!cryptKey && userData.keys.crypt) {
					cryptKey = keyStoreService.upload.addKey(userData.keys.crypt);
				}

				if (!friendShipKey && userData.keys.friendShip) {
					friendShipKey = keyStoreService.upload.addKey(userData.keys.friendShip);
				}

				if (!friendsKey && userData.keys.friends) {
					friendsKey = keyStoreService.upload.addKey(userData.keys.friends);
				}

				if (!friendsLevel2Key && userData.keys.friendsLevel2) {
					friendsLevel2Key = keyStoreService.upload.addKey(userData.keys.friendsLevel2);
				}

				publicProfileSignature = userData.profile.pub.signature;
				delete userData.profile.pub.signature;

				publicProfile = userData.profile.pub;

				privateProfiles = [];

				//todo: update profiles. for now: overwrite
				if (userData.profile && userData.profile.priv && userData.profile.priv instanceof Array) {
					var priv = userData.profile.priv, i;
					for (i = 0; i < priv.length; i += 1) {
						privateProfiles.push(new ProfileService(priv[i]));
					}
				}

				theUser.data = {
					user: theUser,
					id: id,
					basic: {
						age: "?",
						location: "?",
						mutualFriends: mutualFriends,
						url: "/user/" + nickname
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

			function setPublicProfile(attrs, val, cb) {
				var pub = theUser.getProfile();
				publicProfileChanged = h.deepSetCreate(pub, attrs, val) || publicProfileChanged;
				cb();
			}

			function uploadChangedProfile(cb) {
				var data = {};
				var priv = theUser.getPrivateProfiles();

				step(function () {
					var i;
					for (i = 0; i < priv.length; i += 1) {
						if (priv[i].changed()) {
							priv[i].getUpdatedData(theUser.getSignKey(), this.parallel());
						}
					}
					//TODO sign public profile!
					this.parallel()();
				}, h.sF(function (profiles) {
					if (profiles && profiles.length > 0) {
						data.priv = profiles;
					}

					if (publicProfileChanged) {
						data.pub = theUser.getProfile();
						keyStoreService.sign.signObject(data.pub, signKey, this);
					} else {
						this.ne();
					}
				}), h.sF(function (signature) {
					if (publicProfileChanged) {
						data.pub.signature = signature;
					}

					if (data.priv || data.pub) {
						socketService.emit("user.profileChange", data, this);
					} else {
						this.last.ne(true);
					}
				}), h.sF(function (result) {
					if (!result.errors.pub) {
						publicProfileChanged = false;
					}

					var i;
					for (i = 0; i < priv.length; i += 1) {
						if (result.allok || result.errors.priv.indexOf(priv[i].getID()) === -1) {
							priv[i].updated();
							this.ne(true);
						} else {
							this.ne(false);
							//TODO
						}
					}
					//TODO

				}), cb);
			}

			function setProfileAttribute(attrs, val, cb) {
				step(function () {
					settingsService.getPrivacyVisibility(attrs, this);
				}, h.sF(function (visible) {
					if (visible === false) {
						setPublicProfile(attrs.split("."), val, this);
					} else if (visible) {
						setPrivateProfile(attrs.split("."), val, visible, this);
					}
				}), cb);
			}

			this.uploadChangedProfile = uploadChangedProfile;
			this.setProfileAttribute = setProfileAttribute;

			function getProfileAttribute(attrs, cb) {
				step(function () {
					var priv = theUser.getPrivateProfiles(), i;

					for (i = 0; i < priv.length; i += 1) {
						priv[i].getAttribute(attrs, this.parallel());
					}

					this.parallel()();
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

					var pub = theUser.getProfile();

					this.last.ne(h.deepGet(pub, attrs));
				}), cb);
			}

			var basicDataLoaded = false;

			this.update = updateUser;

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
						a[advancedBranches[i]] = result[i] || defaults[i];
					}

					this.ne();
				}), cb);
			};

			this.getFriends = function (cb) {
				friendsService.getUserFriends(this.getID(), cb);
			};

			this.loadBasicData = function (cb) {
				step(function () {
					if (!basicDataLoaded) {
						this.parallel.unflatten();

						theUser.getShortName(this.parallel());
						theUser.getName(this.parallel());
						theUser.getImage(this.parallel());
					}
				}, h.sF(function (shortname, name, image) {
					theUser.data.me = theUser.isOwn();
					theUser.data.other = !theUser.isOwn();

					theUser.data.online = friendsService.onlineStatus(theUser.getID());

					theUser.data.name = name;
					theUser.data.basic.shortname = shortname;
					theUser.data.basic.image = image;

					theUser.data.added = friendsService.didIRequest(theUser.getID());
					theUser.data.isMyFriend = friendsService.areFriends(theUser.getID());

					friendsService.listen(function () {
						theUser.data.added = friendsService.didIRequest(theUser.getID());
						theUser.data.isMyFriend = friendsService.areFriends(theUser.getID());
					});

					this.ne();
				}), cb);
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
				return "/user/" + this.getNickname();
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
					getProfileAttribute("image", this);
				}, h.sF(function (image) {
					if (image) {
						this.ne(image);
					} else {
						this.ne("/assets/img/user.png");
					}
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

					if (firstname && lastname) {
						this.ne(firstname + " " + lastname);
					} else if (firstname || lastname) {
						this.ne(firstname || lastname);
					} else if (nickname) {
						this.ne(nickname);
					} else {
						this.ne("");
					}
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

			this.createProfiles = function (scopes, cb, privacySettings) {
				//check if we already got a profile for the given scope.
				var priv = theUser.getPrivateProfiles(), oldScopes;
				step(function () {
					var i;
					for (i = 0; i < priv.length; i += 1) {
						priv[i].getScope(this.parallel());
					}
				}, h.sF(function (theOldScopes) {
					oldScopes = theOldScopes;

					this.parallel.unflatten();

					priv[oldScopes.indexOf("me")].getFull(this.parallel());
					if (!privacySettings) {
						settingsService.getBranch("privacy", this.parallel());
					} else {
						this.parallel()(null, privacySettings);
					}
					$injector.get("ssn.filterKeyService").filterToKeys(scopes, this.parallel());
				}), h.sF(function (myProfile, privacySettings, keys) {
					debugger;
					var i, profile;
					if (oldScopes.length !== priv.length) {
						throw new Error("bug");
					}

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
				}), h.sF(function (profiles) {
					socketService.emit("user.createPrivateProfiles", {
						privateProfiles: profiles
					}, this);
				}), cb);
			};

			this.deleteProfiles = function (scopes, cb) {
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

						return priv[oldScopes.indexOf(e)];
					});

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

			this.addAsFriend = function () {
				if (!this.isOwn()) {
					friendsService.friendship(this.getID());
				}
			};
		};
	}

	userModel.$inject = ["$injector", "$location",  "ssn.keyStoreService", "ssn.profileService", "ssn.sessionService", "ssn.settingsService", "ssn.socketService", "ssn.friendsService"];

	return userModel;
});