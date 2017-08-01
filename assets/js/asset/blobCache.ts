import Cache from "../services/Cache"
import h from "../helper/helper"

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
	get: (blobID) => {
		return cache.get(blobID).then((data) => {
			if (typeof data.blob === "undefined" || data.blob === false) {
				throw new Error("cache invalid!");
			}

			const blob = uriToBlob(data.blob)

			return {
				meta: data.data,
				blobID,
				blob
			}
		})
	}
}

export default blobCache
