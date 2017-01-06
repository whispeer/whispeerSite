var h = require("whispeerHelper");
var MINUTE = 60 * 1000;

function Burst(TopicUpdate) {
	this.items = [];

	this._TopicUpdate = TopicUpdate;
}

Burst.prototype.getItems = function () {
	return this.items;
};

Burst.prototype.hasItem = function (item) {
	return this.items.indexOf(item) > -1;
};

Burst.prototype.addItem = function (item) {
	this.items.push(item);

	this.items.sort(function (m1, m2) {
		return m1.getTime() - m2.getTime();
	});
};

Burst.prototype.removeAllExceptLast = function () {
	this.items.splice(0, this.items.length - 1);
};

Burst.prototype.firstItem = function () {
	return this.items[0];
};

Burst.prototype.lastItem = function () {
	return this.items[this.items.length - 1];
};

Burst.prototype.isMessageBurst = function () {
	return !this.isTopicUpdate();
};

Burst.prototype._isItemTopicUpdate = function (item) {
	return item instanceof this._TopicUpdate;
};

Burst.prototype.isTopicUpdate = function () {
	return this._isItemTopicUpdate(this.firstItem());
};

Burst.prototype.hasItems = function () {
	return this.items.length > 0;
};

Burst.prototype.fitsItem = function (item) {
	if (!this.hasItems()) {
		return true;
	}

	if (this._isItemTopicUpdate(this.firstItem()) || this._isItemTopicUpdate(item)) {
		return false;
	}

	return this.sameSender(item) &&
		this.sameDay(item) &&
		this.timeDifference(item) < MINUTE * 10;

};

Burst.prototype.sameSender = function (message) {
	return this.firstItem().data.sender.id === message.data.sender.id;
};

Burst.prototype.sameDay = function (message) {
	if (!message) {
		return false;
	}

	if (message instanceof Burst) {
		message = message.firstItem();
	}

	var date1 = new Date(h.parseDecimal(this.firstItem().getTime()));
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

Burst.prototype.timeDifference = function (item) {
	return Math.abs(h.parseDecimal(item.getTime()) - h.parseDecimal(this.firstItem().getTime()));
};

Burst.prototype.isMe = function () {
	return this.isMessageBurst() && this.firstItem().data.sender.me;
};

Burst.prototype.isOther = function () {
	return this.isMessageBurst() && !this.firstItem().data.sender.me;
};

Burst.prototype.sender = function () {
	return this.firstItem().data.sender;
};

module.exports = Burst;
