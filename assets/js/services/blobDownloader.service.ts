interface SocketService {
	awaitConnection: () => Bluebird<void>;
	emit: (channel: string, request: any) => Bluebird<any>;
}

import * as Bluebird from "bluebird";
import Observer from "../asset/observer";

import { ServerError } from "./socket.service";

import h from "../helper/helper"
import Progress from "../asset/Progress"

export default class BlobDownloader extends Observer {
	static MAXIMUMPARTSIZE = 1000 * 1000
	static STARTPARTSIZE = 5 * 1000
	static MINIMUMPARTSIZE = 1 * 1000
	static MAXIMUMTIME = 2 * 1000

	private blobParts: ArrayBuffer[] = []
	private blobid: string
	private downloadPromise: Bluebird<void>
	private socket: SocketService
	private partSize: number = BlobDownloader.STARTPARTSIZE
	private doneBytes: number = 0
	private done: boolean = false
	private meta: any
	private progress: Progress

	constructor(socket: SocketService, blobid: string, progress?: Progress) {
		super();

		this.blobid = blobid;
		this.socket = socket;
		this.progress = progress || new Progress()
	}

	download = () => {
		if (!this.downloadPromise) {
			this.downloadPromise =  this.downloadPartsUntilDone();
		}

		return this.downloadPromise;
	};

	private halfSize () {
		this.partSize = Math.max(this.partSize / 2, BlobDownloader.MINIMUMPARTSIZE);
	};

	private doubleSize () {
		this.partSize = Math.min(this.partSize * 2, BlobDownloader.MAXIMUMPARTSIZE);
	};

	private concatParts() {
		return Bluebird.resolve({
			blob: new Blob(this.blobParts, { type: "image/png" }),
			meta: this.meta
		})
	}

	private downloadPartsUntilDone = () : Bluebird<any> => {
		if (this.done) {
			this.progress.setTotal(this.doneBytes)
			this.progress.progress(this.doneBytes)

			return this.concatParts()
		}

		return this.downloadPart().then(() => {
			return this.downloadPartsUntilDone();
		});
	}

	private downloadPart () {
		var uploadStarted = new Date().getTime()

		return this.socket.awaitConnection().then(() => {
			return this.socket.emit("blob.getBlobPart", {
				blobid: this.blobid,
				start: this.doneBytes,
				size: this.partSize
			});
		}).then((response) => {
			var uploadTook = new Date().getTime() - uploadStarted;

			this.blobParts.push(response.part)
			this.doneBytes += response.part.byteLength

			this.progress.progress(this.doneBytes)

			if (uploadTook > BlobDownloader.MAXIMUMTIME) {
				this.halfSize();
			} else {
				this.doubleSize();
			}

			this.done = response.last
			this.meta = response.meta

			this.notify(this.doneBytes, "progress");
		}).catch((e: any) => {
			if (e instanceof ServerError) {
				const response = e.extra.response

				if (h.hasErrorId(response, 71)) {
					return Bluebird.reject(e)
				}
			}

			console.error(e);
			this.halfSize();
			return Bluebird.delay(5000);
		});
	};

}
