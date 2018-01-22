import h from "../helper/helper";
const validator = require("validation/validator");
import SecuredDataApi, { SecuredData } from "../asset/securedDataWithMetaData"

import * as Bluebird from "bluebird"
import ObjectLoader from "../services/cachedObjectLoader"

import Observer from '../asset/observer';

interface ProfileOptions {
	isPublicProfile?: boolean,
	signKey?: string
}

const PROFILE_SECUREDDATA_OPTIONS = {
	type: "profile",
	removeEmpty: true,
	encryptDepth: 1
}

export default class Profile extends Observer {
	private securedData: any;
	private isPublicProfile: boolean;
	private id: String | number;

	constructor(data: any, options?: ProfileOptions) {
		super();

		options = options || {};

		this.isPublicProfile = options.isPublicProfile === true;

		this.securedData = new SecuredData(data.content, data.meta, PROFILE_SECUREDDATA_OPTIONS, true);

		this.checkProfile();

		if (data.profileid) {
			this.id = data.profileid;
		}
	}

	checkProfile = () => {
		const err = validator.validate("profile", this.securedData.contentGet());

		if (err) {
			throw err;
		}
	}

	getID = () => {
		if (!this.id) {
			return;
		}

		return this.isPublicProfile ? "public-" + this.id : "private-" + this.id;
	};

	sign = (signKey: string, cb?: Function) => {
		if (!this.isPublicProfile) {
			throw new Error("please encrypt private profiles!");
		}

		return this.securedData.sign(signKey).then((signedMeta: any) => {
			return {
				content: this.securedData.contentGet(),
				meta: signedMeta
			};
		}).nodeify(cb);
	};

	signAndEncrypt = (signKey: string, cryptKey: string) => {
		if (this.isPublicProfile) {
			throw new Error("no encrypt for public profiles!");
		}

		return this.securedData.signAndEncrypt(signKey, cryptKey)
	};

	updated = () => {
		return this.securedData.updated();
	};

	changed = () => {
		return this.securedData.isChanged();
	};

	setFullProfile = (data: any) => {
		this.securedData.contentSet(data)
	};

	setAttribute = (attr: string, value: any) => {
		this.securedData.contentSetAttr(attr, value);
		return Bluebird.resolve()
	};

	removeAttribute = (attr: string) => {
		this.securedData.contentRemoveAttr(attr);
	}

	getFull = () => {
		return this.securedData.contentGet()
	};

	getAttribute = (attrs: any) => {
		return h.deepGet(this.securedData.contentGet(), attrs)
	};
}

type ProfileCache = {
	profile: {
		content: any,
		meta: any,
	},
	options: {
		signKey: string,
		isPublic: boolean
	}
}

export class ProfileLoader extends ObjectLoader<Profile, ProfileCache>({
	cacheName: "profile",
	getID: ({ meta, signKey }) => `${signKey}-${meta._signature}`,
	download: () => { throw new Error("profile get by id is not implemented") },
	load: ({ content, meta, isPublic, signKey }): Bluebird<ProfileCache> => {

		const securedData = isPublic ?
			new SecuredData(content, meta, PROFILE_SECUREDDATA_OPTIONS, true) :
			SecuredDataApi.load(content, meta, PROFILE_SECUREDDATA_OPTIONS)

		return Bluebird.all([
			securedData.verifyAsync(signKey),
			isPublic ? null : securedData.decrypt()
		]).then(() => ({
			profile: {
				content: securedData.contentGet(),
				meta: securedData.metaGet(),
			},
			options: {
				signKey,
				isPublic
			}
		}))
	},
	restore: ({ profile, options }: ProfileCache) => new Profile(profile, options)
}) {}
