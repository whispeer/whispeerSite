var Bluebird = require("bluebird");
var SecuredData = require("asset/securedDataWithMetaData");

var userService = require("user/userService");
var socket = require("services/socket.service").default;

var CommentModel = function (data, parentPost) {
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

CommentModel.prototype.delete = function () {
	return socket.emit("posts.comment.delete", {
		comment: this._id,
		post: this._parentPost.getID()
	}).bind(this).then(function () {
		return this._parentPost.removeComment(this);
	});
};

CommentModel.prototype.getSecured = function () {
	return this._secured;
};

CommentModel.prototype.load = function (previousComment, cb) {
	var theComment = this;
	return Bluebird.try(function () {
		return Bluebird.all([
			theComment._secured.decrypt(),
			theComment.getSender()
		]);
	}).spread(function (content, sender) {
		theComment.data.sender = sender.data;
		theComment.data.text = content.comment;

		if (previousComment) {
			theComment._secured.checkAfter(previousComment.getSecured());
		}

		theComment._secured.checkParent(theComment._parentPost.getSecured());
		return theComment._secured.verify(sender.getSignKey());
	}).then(function () {
		theComment.data.loaded = true;
	}).nodeify(cb);
};

CommentModel.prototype.getSender = function () {
	return userService.get(this._secured.metaAttr("sender")).then(function (user) {
		return user.loadBasicData().thenReturn(user);
	});
};

CommentModel.create = function (text, parentPost, cb) {
	return Bluebird.try(function() {
		var comments = parentPost.getComments();

		var s = SecuredData.createPromisified({
			comment: text
		}, {
			postID: parentPost.getID(),
			createTime: new Date().getTime(),
			sender: userService.getown().getID()
		}, { type: "comment" }, userService.getown().getSignKey(), parentPost.getKey());

		s.data.setParent(parentPost.getSecured());

		if (comments.length !== 0) {
			s.data.setAfterRelationShip(comments[comments.length - 1].getSecured());
		}

		return s.promise;
	}).then(function (commentData) {
		return socket.emit("posts.comment.create", {
			postID: parentPost.getID(),
			comment: commentData
		});
	}).nodeify(cb);
};

module.exports = CommentModel;
