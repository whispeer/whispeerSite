interface BlobPrefixed extends Blob {
	webkitSlice?: (start: number, end: number) => Blob;
	mozSlice?: (start: number, end: number) => Blob;
}

interface SocketService {
	awaitConnection: () => Bluebird<void>;
	emit: (channel: string, request: any) => Bluebird<any>;
}

import * as Bluebird from "bluebird";
import Observer from "../asset/observer";

export default class BlobUploader extends Observer {
	static MAXIMUMPARTSIZE = 1000 * 1000;
	static STARTPARTSIZE = 5 * 1000;
	static MINIMUMPARTSIZE = 1 * 1000;
	static MAXIMUMTIME = 2 * 1000;

	_blob: BlobPrefixed;
	_doneBytes = 0;
	_partSize: number;
	_blobid: string;
	_uploadingPromise: Bluebird<void>;
	_socket: SocketService;

	constructor(socket: SocketService, blob: Blob, blobid: string) {
		super();

		this._blob = blob;
		this._blobid = blobid;

		this._socket = socket;

		this._reset();
	}

	_reset() {
		this._doneBytes = 0;
		this._partSize = BlobUploader.STARTPARTSIZE;
	}

	static sliceBlob (blob: BlobPrefixed, start: number, end: number) {
		if (typeof blob.slice === "function") {
			return blob.slice(start, end);
		}

		if (typeof blob.webkitSlice === "function") {
			return blob.webkitSlice(start, end);
		}

		if (typeof blob.mozSlice === "function") {
			return blob.mozSlice(start, end);
		}

		return blob;
	};

	upload = () => {
		if (!this._uploadingPromise) {
			this._uploadingPromise =  this._uploadPartUntilDone();
		}

		return this._uploadingPromise;
	};

	_halfSize () {
		this._partSize = Math.max(this._partSize / 2, BlobUploader.MINIMUMPARTSIZE);
	};

	_doubleSize () {
		this._partSize = Math.min(this._partSize * 2, BlobUploader.MAXIMUMPARTSIZE);
	};

	_uploadPartUntilDone = () : Bluebird<void> => {
		if (this._doneBytes === this._blob.size) {
			return Bluebird.resolve();
		}

		return this._uploadPart().then(() => {
			return this._uploadPartUntilDone();
		});
	}

	_uploadPart () {
		var uploadStarted = new Date().getTime(), uploadSize: number;

		return this._socket.awaitConnection().then(() => {
			var partToUpload = BlobUploader.sliceBlob(this._blob, this._doneBytes, this._doneBytes + this._partSize);
			uploadSize = partToUpload.size;
			var lastPart = this._blob.size === this._doneBytes + uploadSize;

			return this._socket.emit("blob.uploadBlobPart", {
				blobid: this._blobid,
				blobPart: partToUpload,
				doneBytes: this._doneBytes,
				size: uploadSize,
				lastPart: lastPart
			});
		}).then((response: any) => {
			if (response.reset) {
				console.warn("Restarting Upload");
				return this._reset();
			}

			var uploadTook = new Date().getTime() - uploadStarted;

			if (uploadTook > BlobUploader.MAXIMUMTIME) {
				this._halfSize();
			} else {
				this._doubleSize();
			}

			this._doneBytes += uploadSize;
			this.notify(this._doneBytes, "progress");
		}).catch((e: any) => {
			console.error(e);
			this._halfSize();
			return Bluebird.delay(5000);
		});
	};

}
