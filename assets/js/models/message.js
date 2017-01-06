define([
	"whispeerHelper",
	"validation/validator",
	"asset/securedDataWithMetaData",
	"bluebird",
	"models/modelsModule",
], function (h, validator, SecuredData, Bluebird, modelsModule) {
	"use strict";
	function messageModel(keyStore, userService, socket) {
		var notVerified = ["sendTime", "sender", "topicid", "messageid"];

		var Message = function (topic, message, images, id) {
			if (arguments.length === 1) {
				this.fromSecuredData(topic);
			} else {
				this.fromDecryptedData(topic, message, images, id);
			}
		};

		Message.prototype.fromSecuredData = function (data) {
			this._hasBeenSent = true;
			this._isDecrypted = false;

			this._serverID = h.parseDecimal(data.meta.messageid || data.messageid);
			this._messageID = data.meta.messageUUID || this._serverID;

			var metaCopy = h.deepCopyObj(data.meta);
			this._securedData = SecuredData.load(data.content, metaCopy, {
				type: "message",
				attributesNotVerified: notVerified
			});

			this.setData();
		};

		Message.prototype.fromDecryptedData = function (topic, message, images, id) {
			this._hasBeenSent = false;
			this._isDecrypted = true;
			this._isOwnMessage = true;

			this._topic = topic;
			this._images = images;

			this._messageID = id || h.generateUUID();

			var meta = {
				createTime: new Date().getTime(),
				messageUUID: this._messageID,
				sender:userService.getown().getID()
			};

			this._securedData = Message.createRawSecuredData(topic, message, meta);

			this.setData();

			this.data.text = message;
			this.data.images = images.map(function (image) {
				if (!image.convertForGallery) {
					return image;
				}

				return image.convertForGallery();
			});

			this.loadSender();
			this._prepareImages();
		};

		Message.prototype._prepareImages = function () {
			this._prepareImagesPromise = Bluebird.resolve(this._images).map(function (image) {
				return image.prepare();
			});
		};

		Message.prototype.setData = function () {
			this.data = {
				text: "",
				timestamp: this.getTime(),

				loading: true,
				loaded: false,
				sent: this._hasBeenSent,

				sender: {
					"id": this._securedData.metaAttr("sender"),
					"name": "",
					"url": "",
					"image": "assets/img/user.png"
				},

				images: this._securedData.metaAttr("images"),

				id: this._messageID,
				obj: this
			};
		};

		Message.prototype.hasBeenSent = function () {
			return this._hasBeenSent;
		};

		Message.prototype.uploadImages = function (topicKey) {
			if (!this.imageUploadPromise) {
				this.imageUploadPromise = this._prepareImagesPromise.bind(this).then(function () {
					return Bluebird.all(this._images.map(function (image) {
						return image.upload(topicKey);
					}));
				}).then(function (imageKeys) {
					return h.array.flatten(imageKeys);
				});
			}

			return this.imageUploadPromise;
		};

		Message.prototype.getSendPromise = function () {
			return this._sendPromise;
		};

		Message.prototype.sendContinously = function () {
			if (this._sendPromise) {
				return this._sendPromise;
			}

			var message = this;
			this._sendPromise = h.repeatUntilTrue(Bluebird, function () {
				return message.send();
			}, 2000);

			return this._sendPromise;
		};

		Message.prototype.send = function () {
			if (this._hasBeenSent) {
				throw new Error("trying to send an already sent message");
			}

			return socket.awaitConnection().bind(this).then(function () {
				return this._topic.refetchMessages();
			}).then(function () {
				return this._topic.awaitEarlierSend(this.getTime());
			}).then(function () {
				return this._prepareImagesPromise;
			}).then(function (imagesMeta) {
				this._securedData.metaSetAttr("images", imagesMeta);

				var topicKey = this._topic.getKey();
				var newest = this._topic.getNewest();

				this._securedData.setAfterRelationShip(newest.getSecuredData());
				var signAndEncrypt = Bluebird.promisify(this._securedData._signAndEncrypt.bind(this._securedData));
				var signAndEncryptPromise = signAndEncrypt(userService.getown().getSignKey(), topicKey);

				return Bluebird.all([signAndEncryptPromise, this.uploadImages(topicKey)]);
			}).spread(function (result, imageKeys) {
				result.meta.topicid = this._topic.getID();
				result.imageKeys = imageKeys.map(keyStore.upload.getKey);

				return socket.emit("messages.send", {
					message: result
				});
			}).then(function (response) {
				if (response.success) {
					this._hasBeenSent = true;
					this.data.sent = true;
				}

				if (response.server) {
					this._securedData.metaSetAttr("sendTime", response.server.sendTime);
					this._serverID = response.server.messageid;
					this.data.timestamp = this.getTime();
				}

				return response.success;
			}).catch(socket.errors.Disconnect, function (e) {
				console.warn(e);
				return false;
			});
		};

		Message.prototype.getSecuredData = function () {
			return this._securedData;
		};

		Message.prototype.getServerID = function () {
			return this._serverID;
		};

		Message.prototype.getID = function getIDF() {
			return this._messageID;
		};

		Message.prototype.getTopicID = function getTopicIDF() {
			return this._securedData.metaAttr("topicid");
		};

		Message.prototype.getTime = function getTimeF() {
			if (this.getServerID()) {
				return h.parseDecimal(this._securedData.metaAttr("sendTime"));
			} else {
				return h.parseDecimal(this._securedData.metaAttr("createTime"));
			}
		};

		Message.prototype.isOwn = function isOwnF() {
			return this._isOwnMessage;
		};

		Message.prototype.loadSender = function loadSenderF() {
			var theMessage = this;

			return Bluebird.try(function () {
				return userService.get(theMessage._securedData.metaAttr("sender"));
			}).then(function loadS1(sender) {
				return sender.loadBasicData().thenReturn(sender);
			}).then(function loadS2(sender) {
				theMessage.data.sender = sender.data;
				theMessage._isOwnMessage = sender.isOwn();

				return sender;
			});
		};

		Message.prototype.loadFullData = function loadFullDataF(cb) {
			var theMessage = this;

			return this.loadSender().then(function l2(sender) {
				return Bluebird.all([
					theMessage.decrypt(),
					theMessage.verify(sender.getSignKey())
				]);
			}).then(function l3() {
				return;
			}).nodeify(cb);
		};

		Message.prototype.verifyParent = function (topic) {
			this._securedData.checkParent(topic.getSecuredData());
		};

		Message.prototype.verify = function (signKey, cb) {
			if (!this._hasBeenSent) {
				throw new Error("verifying unsent message");
			}

			return this._securedData.verify(signKey).nodeify(cb);
		};

		Message.prototype.decrypt = function decryptF(cb) {
			if (this._isDecrypted) {
				return Bluebird.resolve(this.data.text).nodeify(cb);
			}

			var theMessage = this;
			return Bluebird.try(function () {
				return theMessage._securedData.decrypt();
			}).then(function () {
				theMessage.data.text = theMessage._securedData.contentGet();
				return theMessage._securedData.contentGet();
			}).nodeify(cb);
		};

		Message.createData = function (topic, message, imagesMeta, cb) {
			return Bluebird.try(function () {
				var newest = topic.data.latestMessage;

				var meta = {
					createTime: new Date().getTime(),
					images: imagesMeta
				};

				var mySecured = Message.createRawSecuredData(topic, message, meta);
				mySecured.setAfterRelationShip(newest.getSecuredData());
				return mySecured._signAndEncrypt(userService.getown().getSignKey(), topic.getKey());
			}).then(function (mData) {
				mData.meta.topicid = topic.getID();

				var result = {
					message: mData
				};

				return result;
			}).nodeify(cb);
		};

		Message.createRawSecuredData = function (topic, message, meta) {
			var secured = SecuredData.createRaw(message, meta, {
				type: "message",
				attributesNotVerified: notVerified
			});
			secured.setParent(topic.getSecuredData());

			return secured;
		};

		Message.createRawData = function (topic, message, meta, cb) {
			var secured = Message.createRawSecuredData(topic, message, meta);
			secured._signAndEncrypt(userService.getown().getSignKey(), topic.getKey(), cb);
		};

		return Message;
	}

	messageModel.$inject = ["ssn.keyStoreService", "ssn.userService", "ssn.socketService"];

	modelsModule.factory("ssn.models.message", messageModel);
});
