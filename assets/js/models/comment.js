define(["step",
	"whispeerHelper",
	"validation/validator",
	"asset/securedDataWithMetaData"
], function (step, h, validator, SecuredData) {
	"use strict";
	function messageModel(userService, socket) {
		var Comment = function (data) {
			this._secured = SecuredData.load(data.content, data.meta, { type: "comment" });

			this.data = {
				loaded: false,
				text: "",
				sender: null,
				time: 0
			};
		};

		Comment.prototype.load = function (parentPost, cb) {
			var theComment = this;
			step(function () {
				this.parallel.unflatten();
				theComment._secured.decrypt(this.parallel());
				theComment.getSender(this.parallel());
			}, h.sF(function (content, sender) {
				theComment.data.sender = sender.data;
				theComment.data.text = content.comment;

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
				var sequenceCounter = 0, comments = parentPost.getComments();
				if (comments.length !== 0) {
					sequenceCounter = comments[comments.length - 1]._secured.metaAttr("sequenceCounter");
				}

				SecuredData.create({
					comment: text
				}, {
					sequenceCounter: sequenceCounter,
					postID: parentPost.getID(),
					postHash: parentPost.getHash(),
					createTime: new Date().getTime(),
					sender: userService.getown().getID()

				}, { type: "comment" }, userService.getown().getSignKey(), parentPost.getKey(), this);
			}, h.sF(function (commentData) {
				socket.emit("posts.comment.create", {
					postID: parentPost.getID(),
					comment: commentData
				}, this);
			}), cb);
		};

		return Comment;
	}

	messageModel.$inject = ["ssn.userService", "ssn.socketService"];

	return messageModel;
});