define(["step",
	"whispeerHelper",
	"validation/validator",
	"asset/securedDataWithMetaData"
], function (step, h, validator, SecuredData) {
	"use strict";
	function messageModel(keyStore, userService) {
		var Message = function (data) {
			var theMessage = this;

			var err = validator.validate("message", data);
			if (err) {
				throw err;
			}

			var messageid = h.parseDecimal(data.meta.messageid || data.messageid);

			var metaCopy = h.deepCopyObj(data.meta);
			var securedData = SecuredData.load(data.content, metaCopy, {
				type: "message",
				attributesNotVerified: ["sendTime", "sender", "topicid", "messageid"]
			});

			var ownMessage;

			this.data = {
				text: "",
				timestamp: securedData.metaAttr("sendTime"),

				loading: true,
				loaded: false,

				sender: {
					"id": securedData.metaAttr("sender"),
					"name": "",
					"url": "",
					"image": "assets/img/user.png"
				},

				id: messageid,
				obj: this
			};

			this.getSecuredData = function () {
				return securedData;
			};

			this.getHash = function getHashF() {
				return securedData.getHash();
			};

			this.getID = function getIDF() {
				return messageid;
			};

			this.getTopicID = function getTopicIDF() {
				return securedData.metaAttr("topicid");
			};

			this.getTime = function getTimeF() {
				return securedData.metaAttr("sendTime");
			};

			this.isOwn = function isOwnF() {
				return ownMessage;
			};

			this.loadSender = function loadSenderF(cb) {
				var theSender;
				step(function () {
					userService.get(securedData.metaAttr("sender"), this);
				}, h.sF(function loadS1(sender) {
					this.parallel.unflatten();

					theSender = sender;
					sender.loadBasicData(this);
				}), h.sF(function loadS2() {
					theMessage.data.sender = theSender.data;
					ownMessage = theSender.isOwn();

					this.ne(theSender);
				}), cb);
			};

			this.loadFullData = function loadFullDataF(cb) {
				step(function l1() {
					theMessage.loadSender(this);
				}, h.sF(function l2(sender) {
					theMessage.decrypt(this.parallel());
					theMessage.verify(sender.getSignKey(), this.parallel());
				}), h.sF(function l3() {
					this.ne();
				}), cb);
			};

			this.verifyParent = function (topic) {
				securedData.checkParent(topic.getSecuredData());
			};

			this.verify = function (signKey, cb) {
				securedData.verify(signKey, cb);
			};

			this.decrypt = function decryptF(cb) {
				step(function () {
					securedData.decrypt(this);
				}, h.sF(function () {
					theMessage.data.text = securedData.contentGet();
					this.ne(securedData.contentGet());
				}), cb);
			};
		};

		Message.createData = function (topic, message, cb) {
			step(function () {
				var newest = topic.data.latestMessage;

				var meta = {
					createTime: new Date().getTime(),
				};

				var mySecured = Message.createRawData(topic, message, meta, this);
				mySecured.setAfterRelationShip(newest.getSecuredData());
			}, h.sF(function (mData) {
				mData.meta.topicid = topic.getID();

				var result = {
					message: mData
				};

				this.ne(result);
			}), cb);
		};

		Message.createRawData = function (topic, message, meta, cb) {
			var secured = SecuredData.create(message, meta, { type: "message" }, userService.getown().getSignKey(), topic.getKey(), cb);
			secured.setParent(topic.getSecuredData());

			return secured;
		};

		return Message;
	}

	messageModel.$inject = ["ssn.keyStoreService", "ssn.userService"];

	return messageModel;
});