import { SecuredData } from "../asset/securedDataWithMetaData"
import h from "../helper/helper"

export default class TopicUpdate {
	state: any
	private _id: any
	private securedData: any
	private userID: any

	constructor({ content, server, meta, sender }) {
		var content = content,
			meta = meta;

		this._id = server.id;
		this.securedData = new SecuredData(content, meta, { type: "topicUpdate" }, true)
		this.userID = meta.userID;

		this.state = {
			loading: false,
			timestamp: h.parseDecimal(meta.time),
			title: content.title,
			sender
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
		return h.parseDecimal(this.securedData.metaAttr("time"));
	};

	isAfter = (topicUpdate) => {
		if (!topicUpdate) {
			return true;
		}

		return topicUpdate.getTime() < this.getTime();
	};

	ensureParent = (topic) => {
		this.securedData.checkParent(topic.getSecuredData());
	}

	ensureIsAfterTopicUpdate = (topicUpdate) => {
		this.securedData.checkAfter(topicUpdate.getSecuredData());
	}

	getUserID = () => {
		return this.userID;
	}

	getSecuredData = () => {
		return this.securedData;
	}

	getMetaUpdate = () => {
		return this.securedData.metaAttr("metaUpdate")
	}
}
