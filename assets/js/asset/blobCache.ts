import Cache from "../services/Cache"
import h from "../helper/helper"
import * as Bluebird from "bluebird"

const cache = new Cache("blobs");

const uriToBlob = (blob) => {
	if (typeof blob === "string") {
		return h.dataURItoBlob(blob);
	}

	return blob
}

const blobCache = {
	store: (blob) => {
		return cache.store(blob.getBlobID(), blob.getMeta(), blob.getBlobData());
	},
	readFileAsArrayBuffer: (dir, name) => Bluebird.reject(`We are not on a device. Can't read file ${dir} ${name}`),
	getBlobUrl: (blobID) => {
		return cache.get(blobID).then((data) => {
			if (typeof data.blob === "undefined" || data.blob === false) {
				throw new Error("cache invalid!");
			}

			return h.toUrl(uriToBlob(data.blob))
		})
	},
	isLoaded: (blobID) => cache.contains(blobID),
	clear: () => cache.deleteAll()
}

export default blobCache
