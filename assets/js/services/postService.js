/**
* postService
**/
define(["step", "whispeerHelper", "validation/validator", "asset/observer", "asset/errors", "asset/securedDataWithMetaData", "asset/state"], function (step, h, validator, Observer, errors, SecuredData, State) {
	"use strict";

	var service = function ($rootScope, $timeout, socket, keyStore, errorService, userService, circleService, filterKeyService, Comment) {
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

			var commentState = new State();

			this.data = {
				loaded: false,
				id: data.id,
				info: {
					"with": ""
				},
				time: securedData.metaAttr("time"),
				isWallPost: false,
				removable: false,
				remove: function () {
					thePost.remove(function () {});
				},
				loadComments: function () {
					thePost.loadComments(errorService.criticalError);
				},
				newComment: {
					state: commentState.data,
					text: "",
					create: function (text) {
						if (text === "") {
							commentState.fail();
							return;
						}

						commentState.pending();
						step(function () {
							thePost.addComment(text, this);
						}, h.sF(function () {
							thePost.data.newComment.text = "";
							this.ne();
						}), errorService.failOnError(commentState));
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

					comment.load(thePost, comments[comments.length - 1], this.parallel());
				}, h.sF(function () {
					comments.push(comment);
					thePost.data.comments.push(comment.data);
				}), errorService.criticalError);
			}

			socket.listen("post." + id + ".comment.new", commentListener);

			$rootScope.$on("ssn.reset", function () {
				socket.removeAllListener("post." + id + ".comment.new");
			});

			this.loadData = function (cb) {
				step(function () {
					this.parallel.unflatten();
					thePost.getSender(this.parallel());
					thePost.getWallUser(this.parallel());
				}, h.sF(function (sender, walluser) {
					var d = thePost.data;

					if (walluser) {
						d.isWallPost = true;
						d.walluser = walluser.data;
					}

					if (sender.user.isOwn() || walluser.isOwn()) {
						d.removable = true;
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

			this.getSecured = function () {
				return securedData;
			};

			this.loadComments = function(cb) {
				step(function () {
					if (comments.length === 0) {
						this.last.ne();
						return;
					}

					thePost.data.commentsLoading = true;

					$timeout(this);
				}, h.sF(function () {
					comments.forEach(function (comment, i) {
						comment.load(thePost, comments[i - 1], this.parallel());
					}, this);
				}), function (e) {
					thePost.data.commentsLoading = false;
					this(e);
				}, cb);
			};

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
						this.ne(theUser);
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
					this.ne(theUser);
				}), cb);
			};

			this.remove = function (cb) {
				step(function () {
					if (thePost.data.removable) {
						socket.emit("posts.remove", {
							postid: id
						}, this);
					}
				}, h.sF(function () {
					h.objectEach(postsByUserWall, function (key, val) {
						h.removeArray(val.result, thePost.data);
					});
					h.objectEach(TimelineByFilter, function (key, val) {
						h.removeArray(val.result, thePost.data);
					});

					delete postsById[id];

					this.ne();
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

		var Timeline = function (filter) {
			this._filter = filter;
			this._posts = [];
			this._postsData = [];
			this._requested = 0;

			this.loading = false;
			this.loaded = false;
		};

		Timeline.prototype.getPosts = function () {
			return this._postsData;
		};

		Timeline.prototype._loadNewestPosts = function () {
			if (this._posts.length === 0) {
				return;
			}

			var that = this;
			step(function () {
				that._expandFilter(this);
			}, h.sF(function () {
				var beforeID = that._getNewestID();

				socket.emit("posts.getNewestTimeline", {
					filter: that._expandedFilter,
					beforeID: beforeID,
					lastRequestTime: that._requested
				}, this);
			}), h.sF(function (data) {
				if (data.posts) {
					var newPosts = data.posts.map(function (thePost) {
						thePost = makePost(thePost);
						thePost.loadData(this.parallel());

						return thePost.data;
					}, this);

					that._requested = socket.lastRequestTime();

					newPosts.reverse().map(function (e) {
						that._posts.unshift(e);
					});
				}
			}), errorService.criticalError);
		};

		Timeline.prototype.getNewestID = function () {
			if (this._posts.length === 0) {
				return 0;
			}

			return this._posts[0].getID();
		};

		Timeline.prototype.getOldestID = function () {
			if (this._posts.length === 0) {
				return 0;
			}

			return this._posts[this._posts.length - 1].getID();
		};

		Timeline.prototype._expandFilter = function(cb) {
			var that = this, finalFilter = [];

			if (this._finalFilter) {
				cb();
				return;
			}

			step(function () {
				var circles = [];

				that._filter.forEach(function (filterElement) {
					var split = filterElement.split(":");
					if (split[0] === "circle") {
						circles.push(split[1]);
					} else {
						finalFilter.push(filterElement);
					}
				});

				circleFiltersToUser(circles, this);
			}, h.sF(function (users) {
				finalFilter = finalFilter.concat(users.map(function (e) {return "user:" + e;}));

				that._finalFilter = finalFilter;

				this.ne();
			}), cb);
		};

		Timeline.prototype.loadInitial = function (cb) {
			if (this.loaded) {
				cb();
				return;
			}

			this.loadMorePosts(cb);
		};

		Timeline.prototype.loadMorePosts = function (cb) {
			if (this.loading) {
				cb();
				return;
			}

			var that = this;
			this.loading = true;

			step(function () {
				$timeout(this);
			}, h.sF(function () {
				that._expandFilter(this);
			}), h.sF(function () {
				socket.emit("posts.getTimeline", {
					afterID: that.getOldestID(),
					filter: that._finalFilter,
					count: 20
				}, this);
			}), h.sF(function (results) {
				var posts = results.posts || [];

				that._posts = that._posts.concat(posts.map(function (post) {
					var thePost = makePost(post);
					thePost.loadData(this.parallel());

					return thePost;
				}, this));
				that._requested = socket.lastRequestTime;

				this.parallel()();
			}), function (e) {
				that.loading = false;

				that._postsData = that._posts.map(function (post) {
					return post.data;
				});

				if (!e) {
					that.loaded = true;
				}

				this(e);
			}, cb);
		};

		var timelinesCache = {};

		var postService = {
			getTimeline: function (filter) {
				filter.sort();

				var filterString = JSON.stringify(filter);
				if (!timelinesCache[filterString]) {
					timelinesCache[filterString] = new Timeline(filter);	
				}

				return timelinesCache[filterString];
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

	service.$inject = ["$rootScope", "$timeout", "ssn.socketService", "ssn.keyStoreService", "ssn.errorService", "ssn.userService", "ssn.circleService", "ssn.filterKeyService", "ssn.models.comment"];

	return service;
});