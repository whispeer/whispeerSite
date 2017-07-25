import * as Bluebird from "bluebird"

import h from "../helper/helper"
import Progress from "../asset/Progress"
var Queue = require("asset/Queue");

var blobService = require("services/blobService");

const defaultUploadOptions = {
	encrypt: true
}

const uploadQueue = new Queue(3);
uploadQueue.start();

const encryptionQueue = new Queue(500 * 1000);
encryptionQueue.start();

class FileUpload {
	private progress: Progress
	protected options
	private blob

	constructor(protected file, options?) {
		this.progress = new Progress()
		this.blob = blobService.createBlob(file)

		this.options = options || defaultUploadOptions
	}

	getProgress = () => {
		return this.progress.getProgress();
	};

	protected uploadAndEncryptPreparedBlob = (encryptionKey, blob) => {
		this.progress.addDepend(blob._uploadProgress)
		this.progress.addDepend(blob._encryptProgress)

		return encryptionQueue.enqueue(blob.getSize(), () => {
			return blob.encryptAndUpload(encryptionKey)
		})
	}

	protected uploadPreparedBlob = (blob) => {
		this.progress.addDepend(blob._uploadProgress)

		return blob.upload()
	}

	upload = (encryptionKey) => {
		if (!this.blob) {
			throw new Error("usage error: prepare was not called!")
		}

		return uploadQueue.enqueue(1, () => {
			console.info("Uploading blob")
			if (this.options.encrypt) {
				return this.uploadAndEncryptPreparedBlob(encryptionKey, this.blob)
			}

			return this.uploadPreparedBlob(this.blob)
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
			type: this.file.type
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
