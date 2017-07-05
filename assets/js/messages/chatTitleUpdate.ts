var SecuredData = require("asset/securedDataWithMetaData");
import h from "../helper/helper";

var userService = require("user/userService");
var socket = require("services/socket.service").default;

import * as Bluebird from "bluebird"

export default class ChatTitleUpdate {
	state
	private _id
	private _securedData
	private _userID
	private topic

	constructor(updateData, topic) {
		var content = updateData.content,
			meta = updateData.meta;

		this._id = updateData.id;
		this._securedData = SecuredData.load(content, meta, { type: "topicUpdate" });
		this._userID = meta.userID;

		this.state = {
			loading: true,
			timestamp: h.parseDecimal(updateData.meta.time),
			title: ""
		};

		this.topic = topic
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

	getTopic = () => {
		return this.topic
	}

	isAfter = (topicUpdate) => {
		if (!topicUpdate) {
			return true;
		}

		return topicUpdate.getTime() < this.getTime();
	};

	protected decryptAndVerify = h.executeOnce(() => {
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

	protected load() {
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
		this._securedData.checkParent(this.topic.getSecuredData());

		if (topic !== this.topic) {
			topic.ensureTopicChain(this.topic.getID())
		}
	};

	ensureIsAfterTopicUpdate = (topicUpdate) => {
		this._securedData.checkAfter(topicUpdate.getSecuredData());
	};

	getUserID = () => {
		return this._userID;
	};

	getUser = () => {
		return userService.get(this.getUserID());
	};

	getSecuredData = () => {
		return this._securedData;
	};

	getMetaUpdate = () => {
		return this._securedData.metaAttr("metaUpdate")
	}

	getTitle = () => {
		return this.load().then((content) => {
			return content.title;
		});
	};

	static create(chunk, previousTopicUpdate, title = "") {
		var chunkSecuredData = chunk.getSecuredData();
		var topicUpdatePromisified = SecuredData.createPromisified({ title }, {
				userID: userService.getown().getID(),
				time: new Date().getTime(),
			}, { type: "topicUpdate" }, userService.getown().getSignKey(), chunkSecuredData.getKey());

		topicUpdatePromisified.data.setParent(chunkSecuredData);

		if (previousTopicUpdate) {
			topicUpdatePromisified.data.setAfterRelationShip(previousTopicUpdate.getSecuredData());
		}

		return topicUpdatePromisified.promise.then(function(topicUpdateData) {
			return socket.emit("messages.createTopicUpdate", {
				chunkID: chunk.getID(),
				topicUpdate: topicUpdateData
			}).then(function(response) {
				topicUpdateData.id = response.id;

				return topicUpdateData;
			});
		});
	};
}
