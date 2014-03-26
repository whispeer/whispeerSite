/**
* postService
**/
define(["step", "whispeerHelper", "validation/validator", "asset/observer"], function (step, h, validator, Observer) {
	"use strict";

	var service = function ($rootScope, socket, keyStore, userService, circleService) {
		var postsById = {};
		var postsByUserWall = {};
		var TimelineByFilter = {};

		var Post = function (data) {
			this.data = {
				loaded: false,
				id: data.id
			};

			var thePost = this, id = data.id;
			var meta = data.meta, content = data.content;
			var text, decrypted = false;

			if (typeof meta.key === "object") {
				meta.key = keyStore.upload.addKey(meta.key);
			}

			this.getID = function () {
				return id;
			};

			this.loadData = function (cb) {
				step(function () {
					this.parallel.unflatten();
					thePost.getSender(this.parallel());
					thePost.getText(this.parallel());
				}, h.sF(function (sender, text) {
					var d = thePost.data;

					d.loaded = true;
					d.content = {
						text: text
					};
					d.sender = sender;
					d.info = {
						with: ""
					};
					d.comments = [];

					this.ne();
				}), cb);
			};

			this.getSender = function (cb) {
				var theUser;
				step(function () {
					userService.get(data.meta.sender, this);
				}, h.sF(function (user) {
					theUser = user;

					theUser.loadBasicData(this);
				}), h.sF(function () {
					this.ne(theUser.data);
				}), cb);
			};

			this.getText = function (cb) {
				step(function () {
					thePost.decrypt(this);
				}, h.sF(function (success) {
					if (!success) {
						throw new Error("could not decrypt post");
					}

					this.ne(text);
				}), cb);
			};

			this.decrypt = function (cb) {
				step(function () {
					keyStore.sym.decrypt(content, meta.key, this);
				}, h.sF(function (content) {
					if (content) {
						if (keyStore.hash.hash(content) !== meta.contentHash) {
							throw new Error("invalid content hash!");
						}

						text = keyStore.hash.removePaddingFromObject(content);
						decrypted = true;

						this.ne(true);
					} else {
						this.ne(false);
					}
				}), cb);
			};
		};

		function makePost(data) {
			//TODO: check if validation really goes through

			validator.validate("post", data);
			if (postsById[data.id]) {
				return postsById[data.id];
			}

			var p = new Post(data);

			postsById[p.getID()] = p;

			return p;
		}

		function removeDoubleFilter(filter) {
			var currentFilter, currentFilterOrder = 0;
			var filterOrder = {
				allfriends: 1,
				friendsoffriends: 2,
				everyone: 3
			};

			var i, cur;
			for (i = 0; i < filter.length; i += 1) {
				cur = filter[i];
				if (currentFilterOrder < filterOrder[cur]) {
					currentFilter = cur;
					currentFilterOrder = filterOrder[cur];
				}
			}

			return currentFilter;
		}

		function filterToKeys(filter, cb) {
			var alwaysFilter = [], userFriendsFilter = [], userFilter = [], circleFilter = [];

			if (!filter) {
				filter = ["always:allfriends"];
			}

			var i, map;
			for (i = 0; i < filter.length; i += 1) {
				map = filter[i].split(":");
				switch(map[0]) {
					case "friends":
						userFriendsFilter.push(map[1]);
						break;
					case "always":
						alwaysFilter.push(map[1]);
						break;
					case "circle":
						circleFilter.push(map[1]);
						break;
					case "user":
						userFilter.push(map[1]);
						break;
					default:
						throw new InvalidFilter("unknown group");
				}
			}

			step(function () {
				this.parallel.unflatten();
				circleFilterToKeys(circleFilter, this.parallel());
				userFilterToKeys(userFilter, this.parallel());
				userFriendsFilterToKeys(userFriendsFilter, this.parallel());
			}, h.sF(function (circleKeys, userKeys, userFriendsKeys) {
				var alwaysKeys = alwaysFilterToKeys(alwaysFilter);
				var keys = alwaysKeys.concat(circleKeys).concat(userKeys).concat(userFriendsKeys);

				this.ne(keys);
			}), cb);
		}

		function alwaysFilterToKeys(filter) {
			if (filter.length === 0) {
				return [];
			}

			var theFilter = removeDoubleFilter(filter);

			switch (theFilter) {
				case "allfriends":
					return [userService.getown().getFriendsKey()];
				case "friendsoffriends":
					return [userService.getown().getFriendsLevel2Key()];
				case "everyone":
					//we do not encrypt it anyhow .... this needs to be checked in before!
					throw new Error("should never be here");
				default:
					debugger;
					throw new InvalidFilter("unknown always value");
			}
		}

		function circleFiltersToUser(filter, cb) {
			if (filter.length === 0) {
				cb(null, []);
				return;
			}

			step(function () {
				circleService.loadAll(this);
			}, h.sF(function () {
				var i, user = [];
				for (i = 0; i < filter.length; i += 1) {
					user = user.concat(circleService.get(filter[i]).getUserIDs());
				}

				this.ne(h.arrayUnique(user));
			}), cb);
		}

		function circleFilterToKeys(filter, cb) {
			step(function () {
				circleService.loadAll(this);
			}, h.sF(function () {
				var keys = [], i;
				for (i = 0; i < filter.length; i += 1) {
					keys.push(circleService.get(filter[i]).getKey());
				}
				
				this.ne(keys);
			}), cb);
		}

		function userFilterToKeys(user, cb) {
			step(function () {
				userService.getMultiple(user, this);
			}, h.sF(function (users) {
				var i, keys = [];
				for (i = 0; i < users.length; i += 1) {
					keys.push(users[i].getContactKey());
				}

				this.ne(keys);
			}), cb);
		}

		function userFriendsFilterToKeys(user, cb) {
			step(function () {
				userService.getMultiple(user, this);
			}, h.sF(function (users) {
				var i, keys = [];
				for (i = 0; i < users.length; i += 1) {
					keys.push(users[i].getFriendsKey());
				}

				this.ne(keys);
			}), cb);
		}

		var postService = {
			getTimelinePosts: function (afterID, filter, cb) {
				var result = [], finalFilter = [];
				step(function () {
					var i, circles = [], split;
					for (i = 0; i < filter.length; i += 1) {
						split = filter[i].split(":");
						if (split[0] === "circle") {
							circles.push(split[1]);
						} else {
							finalFilter.push(filter[i]);
						}
					}

					circleFiltersToUser(circles, this);
				}, h.sF(function (users) {
					finalFilter = finalFilter.concat(users.map(function (e) {return "user:" + e;}));

					socket.emit("posts.getTimeline", {
						afterID: afterID,
						filter: finalFilter
					}, this);
				}), h.sF(function (results) {
					var thePost, i, posts = results.posts || [];
					for (i = 0; i < posts.length; i += 1) {
						thePost = makePost(posts[i]);
						thePost.loadData(this.parallel());
						result.push(thePost.data);
					}

					TimelineByFilter[JSON.stringify(filter)] = result;

					this.parallel()();
				}), h.sF(function () {
					this.ne(result);
				}), cb);
			},
			getWallPosts: function (afterID, userid, cb) {
				var result = [];
				step(function () {
					socket.emit("posts.getWall", {
						afterID: afterID,
						userid: userid
					}, this);
				}, h.sF(function (results) {
					var thePost, i, posts = results.posts || [];
					for (i = 0; i < posts.length; i += 1) {
						thePost = makePost(posts[i]);
						thePost.loadData(this.parallel());
						result.push(thePost.data);
					}

					postsByUserWall[userid] = result;

					this.ne(result);
				}), cb);
			},
			getPostByID: function (postid, cb) {
				step(function () {
					if (postsById[postid]) {
						this.last.ne(postsById[postid]);
					} else {
						socket.emit("posts.getPost", {
							postid: postid
						}, this);
					}
				}, h.sF(function (data) {
					if (data.post) {
						this.ne(makePost(data.post));
					} else {
						throw new Error("error! no post data! maybe post does not exist?");
					}
				}), cb);
			},
			reset: function () {
				postsById = {};
				postsByUserWall = {};
				TimelineByFilter = {};
			},
			createPost: function (content, visibleSelection, wallUserID, cb) {
				/*
						meta: {
							contentHash,
							time,
							signature,
							(key),
							(walluser), //for a wallpost
						}
						content //padded!
				*/
				var postKey;

				var data = {
					meta: {}
				};

				step(function () {
					this.parallel.unflatten();

					keyStore.hash.addPaddingToObject(content, 128, this.parallel());
					keyStore.sym.generateKey(this.parallel(), "post key");
					filterToKeys(visibleSelection, this.parallel());
				}, h.sF(function (paddedContent, keyid, keys) {
					var i;
					postKey = keyid;
					content = paddedContent;

					data.meta.contentHash = keyStore.hash.hash(content);
					data.meta.time = new Date().getTime();
					data.meta.walluser = wallUserID;
	
					this.parallel.unflatten();

					keyStore.sym.encrypt(content, keyid, this.parallel());

					keyStore.sign.signObject(data.meta, userService.getown().getSignKey(), this.parallel());

					for (i = 0; i < keys.length; i += 1) {
						keyStore.sym.symEncryptKey(postKey, keys[i], this.parallel());
					}
				}), h.sF(function (encryptedContent, signature) {
					data.content = encryptedContent;
					data.meta.key = keyStore.upload.getKey(postKey);
					data.meta.signature = signature;

					socket.emit("posts.createPost", {
						postData: data
					}, this);
				}), h.sF(function (result) {
					var newPost = makePost(result.createdPost);

					if (h.parseDecimal(wallUserID) === 0) {
						wallUserID = userService.getown().getID();
					}

					if (postsByUserWall[wallUserID]) {
						postsByUserWall[wallUserID].unshift(newPost.data);
					}

					var f = "[\"always:allfriends\"]";
					if (TimelineByFilter[f]) {
						TimelineByFilter[f].unshift(newPost.data);
					}

					newPost.loadData(this);
				}), cb);
				
				//hash content
				
				//getUser: walluser
				//visibleSelection to keys
				//encryptKey with visibleSelectionKeys
			}
		};

		Observer.call(postService);

		$rootScope.$on("ssn.reset", function () {
			postService.reset();
		});

		return postService;
	};

	service.$inject = ["$rootScope", "ssn.socketService", "ssn.keyStoreService", "ssn.userService", "ssn.circleService"];

	return service;
});