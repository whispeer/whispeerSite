define(["step",
	"whispeerHelper",
	"validation/validator",
	"asset/securedDataWithMetaData",
	"bluebird",
	"models/modelsModule",
], function (step, h, validator, SecuredData, Bluebird, modelsModule) {
	"use strict";
	function messageModel(keyStore, userService, socket) {
		var notVerified = ["sendTime", "sender", "topicid", "messageid"];

		var Message = function (topic, message, images) {
			if (arguments.length === 1) {
				this.fromSecuredData(topic);
			} else {
				this.fromDecryptedData(topic, message, images);
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

		Message.prototype.fromDecryptedData = function (topic, message, images) {
			this._hasBeenSent = false;
			this._isDecrypted = true;
			this._isOwnMessage = true;

			this._topic = topic;
			this._images = images;

			this._messageID = h.generateUUID();

			var meta = {
				createTime: new Date().getTime(),
				messageUUID: this._messageID,
				sender:userService.getown().getID()
			};

			this._securedData = Message.createRawSecuredData(topic, message, meta);

			this.setData();

			this.data.text = message;

			this.loadSender(h.nop);
			this._prepareImages();
		};

		Message.prototype._prepareImages = function () {
			this._prepareImagesPromise = Bluebird.resolve(this._images).map(function (image) {
				return image.prepare();
			});

			this._prepareImagesPromise.bind(this).then(function (imagesMeta) {
				this.data.images = imagesMeta;
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

		Message.prototype.sendContinously = function () {
			var message = this;
			return h.repeatUntilTrue(Bluebird, function () {
				return message.send();
			}, 2000);
		};

		Message.prototype.send = function () {
			if (this._hasBeenSent) {
				throw new Error("trying to send an already sent message");
			}

			return socket.awaitConnection().bind(this).then(function () {
				//topic.fetchNewerMessages
				var newest = this._topic.getNewest();

				this._securedData.setAfterRelationShip(newest.getSecuredData());
				var signAndEncrypt = Bluebird.promisify(this._securedData._signAndEncrypt, this._securedData);
				var signAndEncryptPromise = signAndEncrypt(userService.getown().getSignKey(), this._topic.getKey());

				return Bluebird.all([signAndEncryptPromise, this.uploadImages()]);
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

				return response.success;
			}).catch(function (e) {
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
			if (this._hasBeenSent) {
				return h.parseDecimal(this._securedData.metaAttr("sendTime"));
			} else {
				return h.parseDecimal(this._securedData.metaAttr("createTime"));
			}
		};

		Message.prototype.isOwn = function isOwnF() {
			return this._isOwnMessage;
		};

		Message.prototype.loadSender = function loadSenderF(cb) {
			var theSender, theMessage = this;
			step(function () {
				userService.get(theMessage._securedData.metaAttr("sender"), this);
			}, h.sF(function loadS1(sender) {
				this.parallel.unflatten();

				theSender = sender;
				sender.loadBasicData(this);
			}), h.sF(function loadS2() {
				theMessage.data.sender = theSender.data;
				theMessage._isOwnMessage = theSender.isOwn();

				this.ne(theSender);
			}), cb);
		};

		Message.prototype.loadFullData = function loadFullDataF(cb) {
			var theMessage = this;
			step(function l1() {
				theMessage.loadSender(this);
			}, h.sF(function l2(sender) {
				theMessage.decrypt(this.parallel());
				theMessage.verify(sender.getSignKey(), this.parallel());
			}), h.sF(function l3() {
				this.ne();
			}), cb);
		};

		Message.prototype.verifyParent = function (topic) {
			this._securedData.checkParent(topic.getSecuredData());
		};

		Message.prototype.verify = function (signKey, cb) {
			if (!this._hasBeenSent) {
				throw new Error("verifying unsent message");
			}

			this._securedData.verify(signKey, cb);
		};

		Message.prototype.decrypt = function decryptF(cb) {
			if (this._isDecrypted) {
				cb(null, this.data.text);
				return;
			}

			var theMessage = this;
			step(function () {
				theMessage._securedData.decrypt(this);
			}, h.sF(function () {
				theMessage.data.text = theMessage._securedData.contentGet();
				this.ne(theMessage._securedData.contentGet());
			}), cb);
		};

		Message.createData = function (topic, message, imagesMeta, cb) {
			step(function () {
				var newest = topic.data.latestMessage;

				var meta = {
					createTime: new Date().getTime(),
					images: imagesMeta
				};

				var mySecured = Message.createRawSecuredData(topic, message, meta);
				mySecured.setAfterRelationShip(newest.getSecuredData());
				mySecured._signAndEncrypt(userService.getown().getSignKey(), topic.getKey(), this);
			}, h.sF(function (mData) {
				mData.meta.topicid = topic.getID();

				var result = {
					message: mData
				};

				this.ne(result);
			}), cb);
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
