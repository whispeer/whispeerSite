/**
* postService
**/
define(["step", "whispeerHelper", "validation/validator", "asset/observer", "asset/errors", "asset/securedDataWithMetaData"], function (step, h, validator, Observer, errors, SecuredData) {
	"use strict";

	var service = function ($rootScope, socket, errorService, keyStore, userService, circleService, blobService, filterKeyService) {
		var postsById = {};
		var postsByUserWall = {};
		var TimelineByFilter = {};

		var Post = function (data) {
			var thePost = this, id = data.id;
			var securedData = SecuredData.load(data.content, data.meta, { type: "post" });

			this.data = {
				loaded: false,
				id: data.id,
				info: {
					"with": ""
				},
				/* list of images with attributes: loaded, encrypting, decrypting, uploading, percent, url */
				images: [],
				time: securedData.metaAttr("time"),
				isWallPost: false,
				comments: []
			};

			this.getID = function () {
				return id;
			};

			this.loadData = function (cb) {
				step(function () {
					this.parallel.unflatten();
					thePost.getSender(this.parallel());
					thePost.getWallUser(this.parallel());
				}, h.sF(function (sender, walluser) {
					var d = thePost.data;

					if (walluser) {
						d.isWallPost = true;
						d.walluser = walluser;
					}

					d.sender = sender;
					securedData.verify(sender.user.getSignKey(), this);
				}), h.sF(function () {
					thePost.getText(this);
				}), h.sF(function (text) {
					var d = thePost.data;

					d.loaded = true;
					d.content = {
						text: text
					};

					d.images = securedData.metaAttr("images");

					this.ne();
				}), cb);
			};

			this.getWallUser = function (cb) {
					var theUser;
					step(function () {
						if (securedData.metaAttr("walluser")) {
							userService.get(securedData.metaAttr("walluser"), this);
						} else {
							this.last();
						}
					}, h.sF(function (user) {
						theUser = user;

						theUser.loadBasicData(this);
					}), h.sF(function () {
						this.ne(theUser.data);
					}), cb);
			};

			this.getSender = function (cb) {
				var theUser;
				step(function () {
					userService.get(securedData.metaAttr("sender"), this);
				}, h.sF(function (user) {
					theUser = user;

					theUser.loadBasicData(this);
				}), h.sF(function () {
					this.ne(theUser.data);
				}), cb);
			};

			this.getText = function (cb) {
				securedData.decrypt(cb);
			};
		};

		function makePost(data) {
			var err = validator.validate("post", data);
			if (err) {
				throw err;
			}

			if (postsById[data.id]) {
				return postsById[data.id];
			}

			var p = new Post(data);
			postsById[p.getID()] = p;
			return p;
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

		function registerNewPosts(filter) {
			var filterObject = TimelineByFilter[JSON.stringify(filter)];

			function loadNewPosts() {
				step(function () {
					var beforeID = 0;
					if (filterObject.result.length > 0) {
						beforeID = filterObject.result[0].id;
					}

					socket.emit("posts.getNewestTimeline", {
						filter: filter,
						beforeID: beforeID,
						lastRequestTime: filterObject.requested
					}, this);
				}, h.sF(function (data) {
					if (data.posts) {
						var newPosts = data.posts.map(function (thePost) {
							thePost = makePost(thePost);
							thePost.loadData(this.parallel());

							return thePost.data;
						}, this);

						filterObject.requested = socket.lastRequestTime();

						newPosts.reverse().map(function (e) {
							filterObject.result.unshift(e);
						});
					}
				}));
			}

			window.setInterval(loadNewPosts, 5*60*1000);
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

					TimelineByFilter[JSON.stringify(finalFilter)] = {
						result: result,
						requested: socket.lastRequestTime()
					};

					registerNewPosts(finalFilter);

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
			createPost: function (content, visibleSelection, wallUserID, cb, blobs) {
				/*
						meta: {
							contentHash,
							time,
							signature,
							sender: ownid,
							(key),
							(walluser), //for a wallpost
						}
						content //padded!
				*/
				var meta = {}, postKey, blobKeys;

				step(function () {
					keyStore.sym.generateKey(this, "post key");
				}, h.sF(function (_postKey) {
					postKey = _postKey;

					if (blobs.length === 0) {
						this();
						return;
					}

					blobs.forEach(function (blob) {
						blob.original.blob.encryptAndUpload(postKey, this.parallel());
						blob.preview.blob.encryptAndUpload(postKey, this.parallel());
					}, this);
				}), h.sF(function (_blobKeys) {
					blobKeys = _blobKeys || [];

					filterKeyService.filterToKeys(visibleSelection, this);
					//hash images, hash downsized images, get image server ids
				}), h.sF(function (keys) {
					meta.time = new Date().getTime();
					meta.sender = userService.getown().getID();
					meta.walluser = wallUserID;
					meta.images = blobs.map(function (blob) {
						var meta = {original: blob.original.meta};
						if (blob.preview) {
							meta.preview = blob.preview.meta;
						}
						return meta;
					});

					//create post
					//upload images after that!
					this.parallel.unflatten();
					SecuredData.create(content, meta, { type: "post" }, userService.getown().getSignKey(), postKey, this.parallel());
					keys.forEach(function (key) {
						keyStore.sym.symEncryptKey(postKey, key, this.parallel());
					}, this);
				}), h.sF(function (data) {
					data.imageKeys = blobKeys.map(keyStore.upload.getKey);
					data.meta._key = keyStore.upload.getKey(data.meta._key);
					socket.emit("posts.createPost", {
						postData: data
					}, this);
				}), h.sF(function (result) {
					if (result.error) {
						throw new Error("post creation failed on server");
					}

					var newPost = makePost(result.createdPost);

					if (h.parseDecimal(wallUserID) === 0) {
						wallUserID = userService.getown().getID();
					}

					if (postsByUserWall[wallUserID]) {
						postsByUserWall[wallUserID].unshift(newPost.data);
					}

					var f = "[\"always:allfriends\"]";
					if (TimelineByFilter[f]) {
						TimelineByFilter[f].result.unshift(newPost.data);
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

	service.$inject = ["$rootScope", "ssn.socketService", "ssn.errorService", "ssn.keyStoreService", "ssn.userService", "ssn.circleService", "ssn.blobService", "ssn.filterKeyService"];

	return service;
});