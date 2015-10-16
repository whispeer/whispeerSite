define(["step",
	"whispeerHelper",
	"validation/validator",
	"asset/securedDataWithMetaData",
	"models/modelsModule"
], function (step, h, validator, SecuredData, modelsModule) {
	"use strict";
	function messageModel(keyStore, userService) {
		var Message = function (topic, message, imagesMeta) {
			if (arguments.length === 1) {
				this.fromSecuredData(topic);
			} else {
				this.fromDecryptedData(topic, message, imagesMeta);
			}
		};

		Message.prototype.fromSecuredData = function (data) {
			this._hasBeenSent = true;
			this._isDecrypted = false;

			this._messageID = h.parseDecimal(data.meta.messageUUID || data.meta.messageid || data.messageid);

			var metaCopy = h.deepCopyObj(data.meta);
			this._securedData = SecuredData.load(data.content, metaCopy, {
				type: "message",
				attributesNotVerified: ["sendTime", "sender", "topicid", "messageid"]
			});

			this.setData();
		};

		Message.prototype.fromDecryptedData = function (topic, message, imagesMeta) {
			this._hasBeenSent = false;
			this._isDecrypted = true;
			this._isOwnMessage = true;

			this._messageID = generateUUID();

			var meta = {
				createTime: new Date().getTime(),
				images: imagesMeta
			};

			this._securedData = Message.createRawData(topic, message, meta);

			this.setData();

			this.data.text = message;
		};

		Message.prototype.setData = function () {
			this.data = {
				text: "",
				timestamp: this.getTime(),

				loading: true,
				loaded: false,

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

		Message.prototype.isSend = function () {

		};

		Message.prototype.send = function () {
			if (this._hasBeenSent) {
				throw new Error("trying to send an already send message");
			}
		};

		Message.prototype.getSecuredData = function () {
			return this._securedData;
		};

		Message.prototype.getID = function getIDF() {
			return this._messageID;
		};

		Message.prototype.getTopicID = function getTopicIDF() {
			return this._securedData.metaAttr("topicid");
		};

		Message.prototype.getTime = function getTimeF() {
			if (this._hasBeenSent) {
				return this._securedData.metaAttr("sendTime");
			} else {
				return this._securedData.metaAttr("createTime");
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
			var secured = SecuredData.createRaw(message, meta, { type: "message" });
			secured.setParent(topic.getSecuredData());

			return secured;
		};

		Message.createRawData = function (topic, message, meta, cb) {
			var secured = Message.createRawSecuredData(topic, message, meta);
			secured._signAndEncrypt(userService.getown().getSignKey(), topic.getKey(), cb);
		};

		return Message;
	}

	messageModel.$inject = ["ssn.keyStoreService", "ssn.userService"];

	modelsModule.factory("ssn.models.message", messageModel);
});
