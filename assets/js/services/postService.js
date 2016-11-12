/**
* postService
**/
define(["step", "bluebird", "whispeerHelper", "bluebird", "validation/validator", "services/serviceModule", "asset/observer", "asset/errors", "asset/securedDataWithMetaData", "asset/state"], function (step, Bluebird, h, Promise, validator, serviceModule, Observer, errors, SecuredData, State) {
	"use strict";

	var service = function ($rootScope, $timeout, localize, socket, keyStore, errorService, userService, circleService, blobService, filterService, Comment, screenSize, initService) {
		var postsById = {};
		var postsByUserWall = {};
		var timelinesCache = {};

		var Post = function (data) {
			var thePost = this, id = data.id, privateData;

			var securedData = SecuredData.load(data.content, data.meta, { type: "post" });

			if (data.private) {
				privateData = SecuredData.load(data.private.content, data.private.meta, { type: "postPrivate" });
			}

			var comments = data.comments || [];
			comments = comments.map(function (comment) {
				return new Comment(comment, this);
			}, this);

			var commentState = new State();

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
				removable: false,
				remove: function () {
					if (confirm(localize.getLocalizedString("wall.confirmRemovePost"))) {
						thePost.remove(errorService.criticalError);
					}
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

						return thePost.addComment(text).then(function() {
							thePost.data.newComment.text = "";

							return;
						}).catch(function() {
							errorService.failOnError(commentState);
						});
					}
				},
				comments: comments.map(function (comment) {
					return comment.data;
				})
			};

			this.removeComment = function (comment) {
				h.removeArray(this.data.comments, comment.data);
				h.removeArray(comments, comment);
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
					comment = new Comment(data, thePost);

					comment.load(comments[comments.length - 1], this.parallel());
				}, h.sF(function () {
					comments.push(comment);
					thePost.data.comments.push(comment.data);
				}), errorService.criticalError);
			}

			socket.channel("post." + id + ".comment.new", commentListener);

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

					if (sender.isOwn() || (walluser && walluser.isOwn())) {
						d.removable = true;
					}

					d.sender = sender.data;
					securedData.verify(sender.getSignKey(), this.parallel());

					if (privateData) {
						privateData.verify(sender.getSignKey(), this.parallel());
					}
				}), h.sF(function () {
					this.parallel.unflatten();

					keyStore.security.addEncryptionIdentifier(securedData.metaAttr("_key"));

					thePost.getText(this.parallel());
					thePost.getPrivate(this.parallel());
				}), h.sF(function (text, privateData) {
					var d = thePost.data;

					d.loaded = true;
					d.content = {
						text: text
					};

					d.visibleSelection = privateData;

					d.images = securedData.metaAttr("images");

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
						comment.load(comments[i - 1], this.parallel());
					}, this);
				}), function (e) {
					thePost.data.commentsLoading = false;
					this(e);
				}, cb);
			};

			this.addComment = function (comment, cb) {
				return Comment.create(comment, thePost).then(function() {
					// clear promise content.
					return;
				}).nodeify(cb);
			};

			this.getHash = function () {
				return securedData.getHash();
			};

			this.getKey = function () {
				return securedData.metaAttr("_key");
			};

			this.getWallUser = function (cb) {
				if (!securedData.metaAttr("walluser")) {
					return Bluebird.resolve().nodeify(cb);
				}

				return userService.get(securedData.metaAttr("walluser")).then(function(user) {
					return user.loadBasicData().thenReturn(user);
				}).nodeify(cb);
			};

			this.getSender = function (cb) {
				return userService.get(securedData.metaAttr("sender")).then(function(user) {
					user.loadBasicData().thenReturn(user);
				}).nodeify(cb);
			};

			this.remove = function (cb) {
				return Bluebird.try(function() {
					if (thePost.data.removable) {
						return socket.emit("posts.remove", {
							postid: id
						});
					}
				}).then(function() {
					h.objectEach(postsByUserWall, function (key, val) {
						h.removeArray(val.result, thePost.data);
					});
					h.objectEach(timelinesCache, function (key, timeline) {
						timeline.removePost(thePost);
					});

					delete postsById[id];

					return;
				}).nodeify(cb);
			};

			this.getPrivate = function (cb) {
				if (privateData) {
					return privateData.decrypt().then(function(visibleSelection) {
						return filterService.getFiltersByID(visibleSelection);
					}).nodeify(cb);
				} else {
					return Bluebird.resolve().nodeify(cb);
				}
			};

			this.getText = function (cb) {
				return securedData.decrypt().nodeify(cb);
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

			return circleService.loadAll().then(function() {
				var i, user = [];
				for (i = 0; i < filter.length; i += 1) {
					user = user.concat(circleService.get(filter[i]).getUserIDs());
				}

				return h.arrayUnique(user);
			}).nodeify(cb);
		}

		var Timeline = function (filter, sortByCommentTime) {
			this._filter = filter;
			this._posts = [];
			this._postsData = [];
			this._requested = 0;

			this._sortByCommentTime = sortByCommentTime;

			this.loading = false;
			this.loaded = false;
		};

		Timeline.prototype.getPosts = function () {
			return this._postsData;
		};

		Timeline.prototype.removePost = function (thePost) {
			this._posts = h.removeArray(this._posts, thePost);
			this._postsData = h.removeArray(this._postsData, thePost.data);
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

			return Bluebird.try(function() {
				var circles = [];

				that._filter.forEach(function (filterElement) {
					var split = filterElement.split(":");
					if (split[0] === "circle") {
						circles.push(split[1]);
					} else {
						finalFilter.push(filterElement);
					}
				});

				return circleFiltersToUser(circles);
			}).map(function(e) {
				return "user:" + e;
			}).then(function(users) {
				finalFilter = finalFilter.concat(users);

				that._finalFilter = finalFilter;

				return;
			}).nodeify(cb);
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

			if (this.end) {
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
				return initService.awaitLoading();
			}), h.sF(function () {
				return socket.emit("posts.getTimeline", {
					afterID: that.getOldestID(),
					filter: that._finalFilter,
					sortByCommentTime: that._sortByCommentTime,
					count: screenSize.mobile ? 10 : 20
				});
			}), h.sF(function (results) {
				that.displayDonateHint = results.displayDonateHint;
				var posts = results.posts || [];

				that._posts = that._posts.concat(posts.map(function (post) {
					var thePost = makePost(post);
					thePost.loadData(this.parallel());

					return thePost;
				}, this));
				that._requested = socket.lastRequestTime;

				if (posts.length === 0) {
					that.end = true;
				}

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

		Timeline.prototype.addPost = function (newPost) {
			this._posts.unshift(newPost);

			this._postsData = this._posts.map(function (post) {
				return post.data;
			});
		};

		var postService = {
			getTimeline: function (filter, sortByCommentTime) {
				filter.sort();

				var filterString = JSON.stringify(filter) + "-" + sortByCommentTime;

				if (sortByCommentTime) {
					delete timelinesCache[filterString];
				}

				if (!timelinesCache[filterString]) {
					timelinesCache[filterString] = new Timeline(filter, sortByCommentTime);	
				}

				return timelinesCache[filterString];
			},
			getWallPosts: function (afterID, userid, limit, cb) {
				var result = [];
				step(function () {
					return socket.emit("posts.getWall", {
						afterID: afterID,
						userid: userid,
						count: limit
					});
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
				if (postsById[postid]) {
					return Bluebird.resolve(postsById[postid]).nodeify(cb);
				}

				return initService.awaitLoading().then(function() {
					return socket.definitlyEmit("posts.getPost", {
						postid: postid
					});
				}).then(function(data) {
					if (data.post) {
						return makePost(data.post);
					} else {
						throw new Error("error! no post data! maybe post does not exist?");
					}
				}).nodeify(cb);
			},
			reset: function () {
				postsById = {};
				postsByUserWall = {};
				timelinesCache = {};
			},
			createPost: function (content, visibleSelection, wallUserID, images) {
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
				//var meta = {}, postKey, blobKeys;

				var imagePreparation = Promise.resolve(images).map(function (image) {
					return image.prepare();
				});

				var keyGeneration = h.promisify(Promise, function (cb) {
					return keyStore.sym.generateKey(cb, "post key");
				});

				var symEncryptKey = Promise.promisify(keyStore.sym.symEncryptKey.bind(keyStore.sym));
				var filterToKeys = Promise.promisify(filterService.filterToKeys.bind(filterService));
				var socketEmit = Promise.promisify(socket.emit.bind(socket));
				var data, securedData;

				return Promise.all([keyGeneration, imagePreparation]).spread(function (postKey, imagesMetaData) {
					var uploadImages = Promise.all(images.map(function (image) {
						return image.upload(postKey);
					}));

					var encryptPostKeys = filterToKeys(visibleSelection).map(function (key) {
						return symEncryptKey(postKey, key);
					});

					var meta = {};
					meta.time = new Date().getTime();
					meta.sender = userService.getown().getID();
					meta.walluser = wallUserID;
					meta.images = imagesMetaData;

					var ownUser = userService.getown();

					var secured = SecuredData.createPromisified(content, meta, { type: "post" }, ownUser.getSignKey(), postKey);

					securedData = secured.data;

					return Promise.all([uploadImages, secured.promise, encryptPostKeys]);
				}).spread(function (imageKeys, _data) {
					data = _data;

					imageKeys = h.array.flatten(imageKeys);

					data.imageKeys = imageKeys.map(keyStore.upload.getKey);
					data.meta._key = keyStore.upload.getKey(data.meta._key);

					var ownUser = userService.getown();

					var privateData = SecuredData.createPromisified(visibleSelection, {}, { type: "postPrivate" }, ownUser.getSignKey(), ownUser.getMainKey());
					privateData.data.setParent(securedData);
					return privateData.promise;
				}).then(function (privateData) {
					data.privateData = privateData;

					return socketEmit("posts.createPost", { postData: data });
				}).then(function (result) {
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

					h.objectEach(timelinesCache, function (key, timeline) {
						timeline.addPost(newPost);
					});

					return Promise.promisify(newPost.loadData.bind(newPost))();
				});
			}
		};

		Observer.call(postService);

		$rootScope.$on("ssn.reset", function () {
			postService.reset();
		});

		return postService;
	};

	service.$inject = ["$rootScope", "$timeout", "localize", "ssn.socketService", "ssn.keyStoreService", "ssn.errorService", "ssn.userService", "ssn.circleService", "ssn.blobService", "ssn.filterService", "ssn.models.comment", "ssn.screenSizeService", "ssn.initService"];

	serviceModule.factory("ssn.postService", service);
});
