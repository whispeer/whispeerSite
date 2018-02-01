import * as Bluebird from "bluebird"

import h from "../helper/helper"
import Progress from "../asset/Progress"
import blobService, { BlobType, unpath } from "./blobService"
import blobCache from "../asset/blobCache"
import Queue from '../asset/Queue'

import { queue as fileTransferQueue } from './fileTransferQueue'

const defaultUploadOptions = {
	encrypt: true,
	extraInfo: {}
}

const encryptionQueue = new Queue(500 * 1000);
encryptionQueue.start();

class FileUpload {
	private progress: Progress
	protected options
	private blob: BlobType

	constructor(protected file, options?) {
		this.progress = new Progress()
		this.blob = blobService.createBlob(file)

		this.options = options || defaultUploadOptions
	}

	getProgress = () => {
		return this.progress.getProgress();
	};

	protected uploadAndEncryptPreparedBlob = (encryptionKey, blob: BlobType) => {
		this.progress.addDepend(blob.uploadProgress)
		this.progress.addDepend(blob.encryptProgress)

		return encryptionQueue.enqueue(blob.getSize(), () => {
			return blob.encryptAndUpload(encryptionKey)
		})
	}

	protected uploadPreparedBlob = (blob: BlobType) => {
		this.progress.addDepend(blob.uploadProgress)

		return blob.upload()
	}

	upload = (encryptionKey) => {
		if (!this.blob) {
			throw new Error("usage error: prepare was not called!")
		}

		return fileTransferQueue.enqueue(1, () => {
			console.info("Uploading blob")
			if (this.options.encrypt) {
				return this.uploadAndEncryptPreparedBlob(encryptionKey, this.blob)
			}

			return this.uploadPreparedBlob(this.blob)
		}).then((keys) => {
			if (this.file.originalUrl) {
				const { directory, name } = unpath(this.file.originalUrl)

				return blobCache.moveFileToBlob(directory, name, this.blob.getBlobID()).then(() => keys)
			}

			return keys
		})
	}

	prepare = h.cacheResult(() => {
		return FileUpload.blobToDataSet(this.blob).then((data) => {
			data.content = {
				...data.content,
				...this.getInfo()
			}

			return data
		})
	})

	getInfo = () => {
		return {
			name: this.file.name,
			size: this.file.size,
			type: this.file.type,
			...this.options.extraInfo
		}
	}

	getFile = () => {
		return this.file
	}

	getName = () => {
		return this.file.name;
	}

	static blobToDataSet(blob) {
		return Bluebird.all([blob.preReserveID(), blob.getHash()]).spread((blobID, hash) => {
			return {
				blob: blob,
				content: {
					blobHash: hash
				},
				meta: {
					blobID: blobID
				}
			}
		})
	}

	static fileCallback(cb) {
		return (e) => {
			cb(Array.prototype.slice.call(e.target.files));

			try {
				e.target.value = null;
			} catch (ex) {
				console.log(ex);
			}
		};
	}
}

export default FileUpload
