import h from "../helper/helper"

import TopicUpdate from "./chatTitleUpdate"

const MINUTE = 60 * 1000;

export default class Burst {
	private items
	private chunkID

	constructor () {
		this.items = []
	}

	getItems = () => {
		return this.items;
	}

	hasItem = (item) => {
		return this.items.indexOf(item) > -1;
	}

	addItem = (item) => {
		if (!this.hasItems()) {
			this.chunkID = item.getChunkID()
		}

		this.items.push(item);

		this.items.sort(function (m1, m2) {
			return m1.getTime() - m2.getTime();
		});
	}

	removeAllExceptLast = () => {
		this.items.splice(0, this.items.length - 1);
	}

	firstItem = () => {
		return this.items[0];
	}

	lastItem = () => {
		return this.items[this.items.length - 1];
	}

	isMessageBurst = () => {
		return !this.isChatUpdate();
	}

	private _isItemChunkUpdate = (item) => {
		return item instanceof TopicUpdate;
	}

	isChatUpdate = () => {
		return this._isItemChunkUpdate(this.firstItem());
	}

	hasItems = () => {
		return this.items.length > 0;
	}

	fitsItem = (item) => {
		if (!this.hasItems()) {
			return true;
		}

		if (this._isItemChunkUpdate(this.firstItem()) || this._isItemChunkUpdate(item)) {
			return false;
		}

		return this.sameChunk(item) &&
			this.sameSender(item) &&
			this.sameDay(item) &&
			this.timeDifference(item) < MINUTE * 10;

	}

	getChunkID = () => {
		return this.chunkID
	}

	sameChunk = (burst: Burst) => {
		if (!burst) {
			return false;
		}

		return this.getChunkID() === burst.getChunkID();
	}

	sameSender = (message) => {
		return this.firstItem().data.sender.id === message.data.sender.id;
	}

	sameDay = (message) => {
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
	}

	timeDifference = (item) => {
		return Math.abs(h.parseDecimal(item.getTime()) - h.parseDecimal(this.firstItem().getTime()));
	}

	isMe = () => {
		return this.isMessageBurst() && this.firstItem().data.sender.me;
	}

	isOther = () => {
		return this.isMessageBurst() && !this.firstItem().data.sender.me;
	}

	sender = () => {
		return this.firstItem().data.sender;
	}
}
