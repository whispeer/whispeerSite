var SecuredData = require("asset/securedDataWithMetaData");
import h from "../helper/helper"

var userService = require("user/userService");

import * as Bluebird from "bluebird"

export default class TopicUpdate {
	state: any
	private _id: any
	private _securedData: any
	private _userID: any

	constructor(updateData) {
		var content = updateData.content,
			meta = updateData.meta;

		this._id = updateData.server.id;
		this._securedData = SecuredData.load(content, meta, { type: "topicUpdate" });
		this._userID = meta.userID;

		this.state = {
			loading: true,
			timestamp: h.parseDecimal(updateData.meta.time),
			title: ""
		};
	}

	setState = (newState) => {
		this.state = {
			...this.state,
			...newState
		};
	};

	getID = () => {
		return this._id;
	};

	getTime = () => {
		return h.parseDecimal(this._securedData.metaAttr("time"));
	};

	isAfter = (topicUpdate) => {
		if (!topicUpdate) {
			return true;
		}

		return topicUpdate.getTime() < this.getTime();
	};

	protected decryptAndVerify = h.cacheResult<Bluebird<any>>(() => {
		return Bluebird.try(async () => {
			const user = await this.getUser()

			this.setState({
				sender: user
			});

			const decryptPromise = this._securedData.decrypt()
			const verifyPromise = this._securedData.verify(user.getSignKey())

			await verifyPromise

			return await decryptPromise
		})
	});

	load() {
		return Bluebird.try(async () => {
			const content = await this.decryptAndVerify()

			this.setState({
				title: content.title,
				loading: false
			});

			return content;
		})
	}

	ensureParent = (topic) => {
		this._securedData.checkParent(topic.getSecuredData());
	}

	ensureIsAfterTopicUpdate = (topicUpdate) => {
		this._securedData.checkAfter(topicUpdate.getSecuredData());
	}

	getUserID = () => {
		return this._userID;
	}

	getUser = () => {
		return userService.get(this.getUserID());
	}

	getSecuredData = () => {
		return this._securedData;
	}

	getMetaUpdate = () => {
		return this._securedData.metaAttr("metaUpdate")
	}

	getTitle = () => {
		return this.load().then((content) => {
			return content.title;
		})
	}
}
