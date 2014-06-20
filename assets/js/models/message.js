define(["step",
	"whispeerHelper",
	"validation/validator",
	"asset/securedDataWithMetaData"
], function (step, h, validator, SecuredData) {
	"use strict";
	function messageModel(keyStore, userService) {
		var Message = function (data) {
			var theMessage = this, verifiable = true;

			var err = validator.validate("message", data);
			if (err) {
				throw err;
			}

			if (!data.meta._version) {
				//old version
				if (typeof data.content.key === "object") {
					data.content.key = keyStore.upload.addKey(data.content.key);
				}

				data.meta._key = data.content.key;
				verifiable = false;
				data.meta._version = 0;

				data.content.ct = data.content.text;
			}

			var messageid = h.parseDecimal(data.meta.messageid || data.messageid);

			var securedData = new SecuredData(data.content, data.meta);

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

			this.getHash = function getHashF() {
				return securedData.metaAttr("ownHash");
			};

			this.getTopicHash = function getHashF() {
				return securedData.metaAttr("topicHash");
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

					this.ne();
				}), cb);
			};

			this.loadFullData = function loadFullDataF(cb) {
				step(function l1() {
					theMessage.decrypt(this);
				}, h.sF(function l2() {
					theMessage.loadSender(this);
				}), h.sF(function l3() {
					this.ne();
				}), cb);
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

		return Message;
	}

	messageModel.$inject = ["ssn.keyStoreService", "ssn.userService"];

	return messageModel;
});