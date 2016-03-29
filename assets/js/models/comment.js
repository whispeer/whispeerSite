define(["step",
	"whispeerHelper",
	"validation/validator",
	"asset/securedDataWithMetaData",
	"models/modelsModule"
], function (step, h, validator, SecuredData, modelsModule) {
	"use strict";
	function commentModel(userService, socket) {
		var Comment = function (data, parentPost) {
			var theComment = this;
			this._secured = SecuredData.load(data.content, data.meta, { type: "comment" });

			this._parentPost = parentPost;
			this._id = data.id;

			this.data = {
				loaded: false,
				sender: null,
				time: this._secured.metaAttr("createTime"),
				delete: function () {
					theComment.delete();
				}
			};
		};

		Comment.prototype.delete = function () {
			return socket.emit("post.comment.delete", {
				comment: this._id,
				post: this._parentPost.getID()
			}).bind(this).then(function () {
				return this._parentPost.removeComment(this);
			});
		};

		Comment.prototype.getSecured = function () {
			return this._secured;
		};

		Comment.prototype.load = function (previousComment, cb) {
			var theComment = this;
			step(function () {
				this.parallel.unflatten();
				theComment._secured.decrypt(this.parallel());
				theComment.getSender(this.parallel());
			}, h.sF(function (content, sender) {
				theComment.data.sender = sender.data;
				theComment.data.text = content.comment;

				if (previousComment) {
					theComment._secured.checkAfter(previousComment.getSecured());
				}

				theComment._secured.checkParent(theComment._parentPost.getSecured());
				theComment._secured.verify(sender.getSignKey(), this);
			}), h.sF(function () {
				theComment.data.loaded = true;
				this.ne();
			}), cb);
		};

		Comment.prototype.getSender = function (cb) {
			var theUser, theComment = this;
			step(function () {
				userService.get(theComment._secured.metaAttr("sender"), this);
			}, h.sF(function (user) {
				theUser = user;

				theUser.loadBasicData(this);
			}), h.sF(function () {
				this.ne(theUser);
			}), cb);
		};

		Comment.create = function (text, parentPost, cb) {
			step(function () {
				var comments = parentPost.getComments();

				var s = SecuredData.create({
					comment: text
				}, {
					postID: parentPost.getID(),
					createTime: new Date().getTime(),
					sender: userService.getown().getID()
				}, { type: "comment" }, userService.getown().getSignKey(), parentPost.getKey(), this);

				s.setParent(parentPost.getSecured());

				if (comments.length !== 0) {
					s.setAfterRelationShip(comments[comments.length - 1].getSecured());
				}
			}, h.sF(function (commentData) {
				socket.emit("posts.comment.create", {
					postID: parentPost.getID(),
					comment: commentData
				}, this);
			}), cb);
		};

		return Comment;
	}

	commentModel.$inject = ["ssn.userService", "ssn.socketService"];

	modelsModule.factory("ssn.models.comment", commentModel);
});
