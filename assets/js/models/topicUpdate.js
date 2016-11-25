define(["bluebird", "asset/securedDataWithMetaData", "models/modelsModule", "whispeerHelper"], function (Bluebird, SecuredData, modelsModule, h) {
	"use strict";

	function topicUpdateModel(userService, socket) {
		function TopicUpdate (updateData) {
			var content = updateData.content,
				meta = updateData.meta;

			console.log(updateData);

			this.state = {
				title: "",
				loading: true,
				timestamp: h.parseDecimal(meta.time)
			};

			this._securedData = SecuredData.load(content, meta, { type: "topicUpdate" });
			this._userID = meta.userID;
		}

		TopicUpdate.prototype.setState = function (newState) {

		};

		TopicUpdate.prototype.getTime = function () {
			return h.parseDecimal(this._securedData.metaAttr("time"));
		};

		TopicUpdate.prototype.load = function () {
			if (!this._loadPromise) {
				this._loadPromise = this.getUser().bind(this).then(function (user) {
					this.setState({
						user: user
					});

					return Bluebird.all([
						this._securedData.decrypt(),
						this._securedData.verify(user.getSignKey())
					]);
				}).spread(function (content) {
					this.setState({
						title: content.title,
						loading: false
					});
					this.data.title = content.title;

					return content;
				});
			}

			return this._loadPromise;
		};

		TopicUpdate.prototype.ensureParent = function (topic) {
			this._securedData.checkParent(topic.getSecuredData());
		};

		TopicUpdate.prototype.ensureIsAfterTopicUpdate = function (topicUpdate) {
			this._securedData.checkAfter(topicUpdate.getSecuredData());
		};

		TopicUpdate.prototype.getTitle = function () {
			return this.load().then(function (content) {
				return content.title;
			});
		};

		TopicUpdate.prototype.getUserID = function () {
			return this._userID;
		};

		TopicUpdate.prototype.getUser = function () {
			var userGetAsync = Bluebird.promisify(userService.get.bind(userService));
			return userGetAsync(this.getUserID());
		};

		TopicUpdate.prototype.getSecuredData = function () {
			return this._securedData;
		};

		TopicUpdate.create = function (topic, options) {
			var topicContainer = topic.getSecuredData();
			var topicUpdatePromisified = SecuredData.createPromisified({
				title: options.title || ""
			}, {
				userID: userService.getown().getID(),
				time: new Date().getTime()
			}, { type: "topicUpdate" }, userService.getown().getSignKey(), topicContainer.getKey());

			topicUpdatePromisified.data.setParent(topicContainer);

			if (options.previousTopicUpdate) {
				topicUpdatePromisified.data.setAfterRelationShip(options.previousTopicUpdate.getSecuredData());
			}

			return topicUpdatePromisified.promise.then(function (topicUpdateData) {
				return socket.emit("messages.createTopicUpdate", {
					topicID: topic.getID(),
					topicUpdate: topicUpdateData
				}).thenReturn(topicUpdateData);
			});
		};

		return TopicUpdate;
	}

	topicUpdateModel.$inject = ["ssn.userService", "ssn.socketService"];

	modelsModule.factory("ssn.models.topicUpdate", topicUpdateModel);
});
