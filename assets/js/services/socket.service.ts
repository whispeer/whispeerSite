const APIVERSION = "0.0.3";

const debug = require("debug");
const h = require("whispeerHelper");
import { connect } from "socket.io-client";

const config = require('../config.js');
import * as Bluebird from "bluebird";
import Observer from "../asset/observer";
import BlobUploader from "./blobUploader.service"

const socketDebug = debug("whispeer:socket");
const socketError = debug("whispeer:socket:error");

const DisconnectError = h.createErrorType("disconnectedError");
const ServerError = h.createErrorType("serverError");

const SOCKET_TIMEOUT = 60000;

interface Interceptor {
	transformRequest: Function
	transformResponse: Function
}

const log = {
	timer: function (name: string) {
		var message = new Date().toLocaleTimeString() + ":" + name + "(" + Math.random() + ")";
		if (debug.enabled("whispeer:socket")) {
			console.time(message);
		}
		return message;
	},
	timerEnd: function (message: string) {
		if (debug.enabled("whispeer:socket")) {
			console.timeEnd(message);
		}
	}
};

class SocketService extends Observer {

	private _interceptors: Interceptor[] = [];

	_domain = (config.https ? "https://" : "http://") + config.ws + ":" + config.wsPort;
	_autoReconnect = config.socket.autoReconnect;
	_autoConnect: boolean = config.socket.autoConnect;

	_socket: SocketIOClient.Socket;
	_blockedWithToken = false;
	_token: number;

	_lastRequestTime = 0;
	_loading = 0;

	uploadObserver = new Observer();
	_uploadingCounter = 0;

	static errors = {
		Disconnect: DisconnectError,
		Server: ServerError
	};

	errors = {
		Disconnect: DisconnectError,
		Server: ServerError
	}

	constructor() {
		super();

		if (this._autoConnect) {
			this._connect();
		}

		if (this._autoConnect && this._autoReconnect) {
			window.setInterval(() => {
				try {
					if (!this._socket.connected) {
						this._socket.connect();
					}
				} catch (e) {
					socketError(e);
				}
			}, 10000);
		}
	}

	_connect () {
		this._socket = connect(this._domain, config.socket.options);

		this._socket.on("disconnect", () => {
			socketDebug("socket disconnected");
			this._loading = 0;
			this._uploadingCounter = 0;
		});

		this._socket.on("connect", () => {
			socketDebug("socket connected");
			this.emit("ping", { blockageToken: this._token });
		});
	}

	_emit (channel: string, request: Object) {
		return new Bluebird<any>((resolve, reject) => {
			var onDisconnect = function () {
				reject(new DisconnectError("Disconnected while sending"));
			};
			this._socket.once("disconnect", onDisconnect);
			this._socket.emit(channel, request, (response: any) => {
				this._socket.off("disconnect", onDisconnect);
				resolve(response);
			});
		});
	}

	getLoadingCount () {
		return this._loading;
	};

	lastRequestTime () {
		return this._lastRequestTime;
	};

	send (data: Object) {
		this._socket.send(data);
	}

	addInterceptor (interceptor: Interceptor) {
		this._interceptors.push(interceptor);
	}

	uploadBlob = (blob: Blob, blobid: string, progress: any, cb?: Function) => {
		if (this._uploadingCounter > 3) {
			this.uploadObserver.listenOnce(() => {
				this.uploadBlob(blob, blobid, progress, cb);
			}, "uploadFinished");
			return;
		}

		this._uploadingCounter++;
		var uploader = new BlobUploader(this, blob, blobid);

		uploader.listen(function (doneBytes: number) {
			progress.progress(doneBytes);
		}, "progress");

		var uploadPromise = uploader.upload().then(() => {
			this._uploadingCounter--;

			this.uploadObserver.notify(blobid, "uploadFinished");
			this.uploadObserver.notify(blobid, "uploadFinished:" + blobid);
		});

		return uploadPromise.nodeify(cb);
	}

	isConnected () {
		return this._socket.connected;
	}

	blockEmitWithToken () {
		this._blockedWithToken = true;
		this._token = Math.random();
		return this._token;
	}

	allowEmit (accessToken: number) {
		if (this._blockedWithToken && accessToken === this._token) {
			this._blockedWithToken = false;
		}
	}

	emit (channel: string, request: any, cb?: Function) {
		if (this._blockedWithToken && request.blockageToken !== this._token) {
			throw new DisconnectError("request blocked by token (channel: " + channel + ")");
		}

		if (!this.isConnected()) {
			throw new DisconnectError("no connection");
		}

		var timer = log.timer("request on " + channel);

		request.version = APIVERSION;
		request.clientInfo = CLIENT_INFO;

		socketDebug("Request on " + channel);
		socketDebug(request);

		this._interceptors.forEach(function (interceptor) {
			if (interceptor.transformRequest) {
				request = interceptor.transformRequest(request);
			}
		});

		this._loading++;
		this.notify(null, "request");

		var resultPromise = this._emit(channel, request).timeout(SOCKET_TIMEOUT).then((response) => {
			socketDebug("Answer on " + channel);
			log.timerEnd(timer);

			if (response.alert) {
				alert(response.alert)
			}

			this._lastRequestTime = response.serverTime;

			if (response.error) {
				socketError(response);
				throw new ServerError("server returned an error!");
			}

			socketDebug(response);

			this._interceptors.forEach((interceptor) => {
				if (interceptor.transformResponse) {
					response = interceptor.transformResponse(response);
				}
			});

			return response;
		}).finally(() => {
			this._loading--;
			this.notify(null, "response");
		});

		return resultPromise.nodeify(cb);
	}

	awaitNoRequests() {
		if (this._loading === 0) {
			return Bluebird.resolve();
		}

		return new Bluebird<void>((resolve) => {
			this.listen(() => {
				if (this._loading === 0) {
					resolve();
				}
			}, "response");
		});
	}

	awaitConnection() {
		return new Bluebird<void>((resolve) => {
			if (this.isConnected()) {
				resolve();
			} else {
				this.once("connect", resolve);
			}
		});
	}

	on(eventName: string, callback: Function) {
		return this._socket.on(eventName, callback);
	}

	once(eventName: string, callback: Function) {
		return this._socket.once(eventName, callback);
	}

	/** definitly emits the request. might emit it multiple times! **/
	definitlyEmit (channel: string, request: any, callback?: Function) : Bluebird<void> {
		var SOCKET_TIMEOUT = 10000;

		return this.awaitConnection().then(() => {
			return this.emit(channel, request).timeout(SOCKET_TIMEOUT);
		}).catch((e) => {
			console.error(e);
			return Bluebird.delay(500).then(() => {
				return this.definitlyEmit(channel, request, callback);
			});
		}).nodeify(callback);
	}

	channel (channel: string, callback: Function) {
		this._socket.on(channel, (data: any) => {
			socketDebug("received data on " + channel);
			socketDebug(data);
			callback(null, data);
		});
	}

}

export default new SocketService();
