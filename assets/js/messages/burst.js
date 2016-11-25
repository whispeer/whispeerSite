"use strict";

var h = require("whispeerHelper");
var MINUTE = 60 * 1000;

function Burst(TopicUpdate) {
	this.messages = [];

	this._TopicUpdate = TopicUpdate;
}

Burst.prototype.hasMessage = function (message) {
	return this.messages.indexOf(message) > -1;
};

Burst.prototype.addMessage = function (message) {
	this.messages.push(message);

	this.messages.sort(function (m1, m2) {
		return m1.getTime() - m2.getTime();
	});
};

Burst.prototype.removeAllExceptLast = function () {
	this.messages.splice(0, this.messages.length - 1);
};

Burst.prototype.firstMessage = function () {
	return this.messages[0];
};

Burst.prototype.lastMessage = function () {
	return this.messages[this.messages.length - 1];
};

Burst.prototype.isMessageBurst = function () {
	return !this.isTopicUpdate();
};

Burst.prototype._isElementTopicUpdate = function (element) {
	return element instanceof this._TopicUpdate;
};

Burst.prototype.isTopicUpdate = function () {
	return this._isElementTopicUpdate(this.firstMessage());
};

Burst.prototype.hasMessages = function () {
	return this.messages.length > 0;
};

Burst.prototype.fitsMessage = function (message) {
	if (!this.hasMessages()) {
		return true;
	}

	if (this._isElementTopicUpdate(this.firstMessage()) || this._isElementTopicUpdate(message)) {
		return false;
	}

	return this.sameSender(message) &&
		this.sameDay(message) &&
		this.timeDifference(message) < MINUTE * 10;

};

Burst.prototype.sameSender = function (message) {
	return this.firstMessage().data.sender.id === message.data.sender.id;
};

Burst.prototype.sameDay = function (message) {
	if (!message) {
		return false;
	}

	if (message instanceof Burst) {
		message = message.firstMessage();
	}

	var date1 = new Date(h.parseDecimal(this.firstMessage().getTime()));
	var date2 = new Date(h.parseDecimal(message.getTime()));

	if (date1.getDate() !== date2.getDate()) {
		return false;
	}

	if (date1.getMonth() !== date2.getMonth()) {
		return false;
	}

	if (date1.getFullYear() !== date2.getFullYear()) {
		return false;
	}

	return true;
};

Burst.prototype.timeDifference = function (message) {
	return Math.abs(h.parseDecimal(message.getTime()) - h.parseDecimal(this.firstMessage().getTime()));
};

Burst.prototype.isMe = function () {
	return this.isMessageBurst() && this.firstMessage().data.sender.me;
};

Burst.prototype.isOther = function () {
	return this.isMessageBurst() && !this.firstMessage().data.sender.me;
};

Burst.prototype.sender = function () {
	return this.firstMessage().data.sender;
};

module.exports = Burst;
