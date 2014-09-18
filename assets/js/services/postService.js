/**
* postService
**/
define(["step", "whispeerHelper", "validation/validator", "asset/observer", "asset/errors", "asset/securedDataWithMetaData"], function (step, h, validator, Observer, errors, SecuredData) {
	"use strict";

	var service = function ($rootScope, socket, keyStore, errorService, userService, circleService, filterKeyService, Comment) {
		var postsById = {};
		var postsByUserWall = {};
		var TimelineByFilter = {};

		var Post = function (data) {
			var thePost = this, id = data.id;

			var securedData = SecuredData.load(data.content, data.meta, { type: "post" });
			var comments = data.comments || [];
			comments = comments.map(function (comment) {
				return new Comment(comment);
			});

			this.data = {
				loaded: false,
				id: data.id,
				info: {
					"with": ""
				},
				time: securedData.metaAttr("time"),
				isWallPost: false,
				newComment: {
					text: "",
					create: function (text) {
						thePost.addComment(text, function () {
							thePost.data.newComment.text = "";
						});
					}
				},
				comments: comments.map(function (comment) {
					return comment.data;
				})
			};

			this.getID = function () {
				return id;
			};

			this.getComments = function () {
				return comments;
			};

			function commentListener(e, data) {
				var comment;
				step(function () {
					comment = new Comment(data);

					comment.load(thePost, this.parallel());
				}, h.sF(function () {
					comments.push(comment);
					thePost.data.comments.push(comment.data);
				}), errorService.criticalError);
				
			}

			socket.listen("post." + id + ".comment.new", commentListener);

			this.loadData = function (cb) {
				step(function () {
					this.parallel.unflatten();
					thePost.getSender(this.parallel());
					thePost.getWallUser(this.parallel());
					loadComments(this.parallel());
				}, h.sF(function (sender, walluser) {
					var d = thePost.data;

					if (walluser) {
						d.isWallPost = true;
						d.walluser = walluser;
					}

					d.sender = sender;
					securedData.verify(sender.user.getSignKey(), this.parallel());
				}), h.sF(function () {
					keyStore.security.addEncryptionIdentifier(securedData.metaAttr("_key"));
					thePost.getText(this);
				}), h.sF(function (text) {
					var d = thePost.data;

					d.loaded = true;
					d.content = {
						text: text
					};

					this.ne();
				}), cb);
			};

			function loadComments(cb) {
				step(function () {
					if (comments.length === 0) {
						this.last.ne();
						return;
					}

					comments.forEach(function (comment) {
						comment.load(thePost, this.parallel());
					}, this);
				}, cb);
			}

			this.addComment = function (comment, cb) {
				step(function () {
					Comment.create(comment, thePost, this);
				}, h.sF(function () {
					this.ne();
				}), cb);
			};

			this.getHash = function () {
				return securedData.getHash();
			};

			this.getKey = function () {
				return securedData.metaAttr("_key");
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
			createPost: function (content, visibleSelection, wallUserID, cb) {
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
				var meta = {}, postKey;

				step(function () {
					this.parallel.unflatten();

					keyStore.sym.generateKey(this.parallel(), "post key");
					filterKeyService.filterToKeys(visibleSelection, this.parallel());
				}, h.sF(function (key, keys) {
					postKey = key;

					meta.time = new Date().getTime();
					meta.sender = userService.getown().getID();
					meta.walluser = wallUserID;
	
					this.parallel.unflatten();
					SecuredData.create(content, meta, { type: "post" }, userService.getown().getSignKey(), postKey, this.parallel());
					keys.forEach(function (key) {
						keyStore.sym.symEncryptKey(postKey, key, this.parallel());
					}, this);
				}), h.sF(function (data) {
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

	service.$inject = ["$rootScope", "ssn.socketService", "ssn.keyStoreService", "ssn.errorService", "ssn.userService", "ssn.circleService", "ssn.filterKeyService", "ssn.models.comment"];

	return service;
});