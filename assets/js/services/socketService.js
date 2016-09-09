/**
* SocketService
**/
define([
	"services/serviceModule",
	"debug",
	"socket",
	"step",
	"whispeerHelper",
	"config",
	"asset/observer",
	"bluebird"
], function (serviceModule, debug, io, step, h, config, Observer, Bluebird) {
	"use strict";

	var APIVERSION = "0.0.3";

	var socketDebug = debug("whispeer:socket");
	var socketError = debug("whispeer:socket:error");

	var provider = function () {
		var interceptorFactories = [];

		var domain = (config.https ? "https://" : "http://") + config.ws + ":" + config.wsPort;
		var autoConnect = config.socket.autoConnect;
		var autoReconnect = config.socket.autoReconnect;

		var DisconnectError = h.createErrorType("disconnectedError");
		var ServerError = h.createErrorType("serverError");

		this.addInterceptor = function (interceptorName) {
			interceptorFactories.push(interceptorName);
		};

		this.setDomain = function (_domain) {
			domain = _domain;
		};

		this.disableAutoConnect = function () {
			autoConnect = false;
		};

		var service = function ($injector, $rootScope) {
			var socket, blockedWithToken = false, token, socketS;

			var lastRequestTime = 0;

			var loading = 0;

			var internalObserver = new Observer();
			var uploadingCounter = 0, streamUpgraded = false;

			function connect() {
				socket = io.connect(domain, config.socket.options);

				socket.on("disconnect", function () {
					socketDebug("socket disconnected");
					loading = 0;
					streamUpgraded = false;
					uploadingCounter = 0;
				});

				socket.on("connect", function () {
					socketDebug("socket connected");
					socketS.emit("ping", { blockageToken: token }, function () {});
				});
			}

			if (autoConnect) {
				connect();
			}

			if (autoConnect && autoReconnect) {
				window.setInterval(function () {
					try {
						if (!socket.connected) {
							socket.connect();
						}
					} catch (e) {
						socketError(e);
					}
				}, 10000);
			}

			var interceptors;
			function loadInterceptors() {
				if (!interceptors) {
					interceptors = interceptorFactories.map(function (name) {
						return $injector.get(name);
					}).reverse();
				}
			}

			var log = {
				timer: function (name) {
					var message = new Date().toLocaleTimeString() + ":" + name + "(" + Math.random() + ")";
					if (debug.enabled("whispeer:socket")) {
						console.time(message);
					}
					return message;
				},
				timerEnd: function (message) {
					if (debug.enabled("whispeer:socket")) {
						console.timeEnd(message);
					}
				}
			};

			function emit(channel, request) {
				return new Bluebird(function (resolve, reject) {
					var onDisconnect = function () {
						reject(new DisconnectError("Disconnected while sending"));
					};
					socket.once("disconnect", onDisconnect);
					socket.emit(channel, request, function (response) {
						socket.off("disconnect", onDisconnect);
						resolve(response);
					});
				});
			}

			if (config.debug) {
				window.socket = socket;
			}

			function BlobUploader(blob, blobid) {
				this._blob = blob;
				this._blobid = blobid;
				this._progressListeners = [];

				this._reset();

				Observer.call(this);
			}

			BlobUploader.MAXIMUMPARTSIZE = 1000 * 1000;
			BlobUploader.STARTPARTSIZE = 5 * 1000;
			BlobUploader.MINIMUMPARTSIZE = 1 * 1000;
			BlobUploader.MAXIMUMTIME = 2 * 1000;

			BlobUploader.sliceBlob = function (blob, start, end) {
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

			BlobUploader.prototype.upload = function () {
				if (!this._uploadingPromise) {
					this._uploadingPromise =  this._uploadPartUntilDone();
				}

				return this._uploadingPromise;
			};

			BlobUploader.prototype._uploadPartUntilDone = function () {
				if (this._doneBytes === this._blob.size) {
					return Bluebird.resolve();
				}

				return this._uploadPart().then(function () {
					return this._uploadPartUntilDone();
				});
			};

			BlobUploader.prototype._reset = function () {
				this._doneBytes = 0;
				this._partSize = BlobUploader.STARTPARTSIZE;
			};

			BlobUploader.prototype._uploadPart = function () {
				var uploadStarted = new Date().getTime(), uploadSize;

				return socketS.awaitConnection().bind(this).then(function () {
					var partToUpload = BlobUploader.sliceBlob(this._blob, this._doneBytes, this._doneBytes + this._partSize);
					uploadSize = partToUpload.size;
					var lastPart = this._blob.size === this._doneBytes + uploadSize;

					return socketS.emit("blob.uploadBlobPart", {
						blobid: this._blobid,
						blobPart: partToUpload,
						doneBytes: this._doneBytes,
						size: uploadSize,
						lastPart: lastPart
					});
				}).then(function (response) {
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
				}).catch(function (e) {
					console.error(e);
					this._halfSize();
					return Bluebird.delay(5000);
				});
			};

			BlobUploader.prototype._halfSize = function () {
				this._partSize = Math.max(this._partSize / 2, BlobUploader.MINIMUMPARTSIZE);
			};

			BlobUploader.prototype._doubleSize = function () {
				this._partSize = Math.min(this._partSize * 2, BlobUploader.MAXIMUMPARTSIZE);
			};

			socketS = {
				errors: {
					Disconnect: DisconnectError,
					Server: ServerError
				},
				uploadObserver: internalObserver,
				isConnected: function () {
					return socket.connected;
				},
				uploadBlob: function (blob, blobid, progress, cb) {
					if (uploadingCounter > 3) {
						internalObserver.listenOnce(function () {
							socketS.uploadBlob(blob, blobid, progress, cb);
						}, "uploadFinished");
						return;
					}

					uploadingCounter++;
					var uploader = new BlobUploader(blob, blobid);

					uploader.listen(function (doneBytes) {
						progress.progress(doneBytes);
					}, "progress");

					var uploadPromise = uploader.upload().then(function () {
						uploadingCounter--;

						internalObserver.notify(blobid, "uploadFinished");
						internalObserver.notify(blobid, "uploadFinished:" + blobid);						
					});

					return step.unpromisify(uploadPromise, cb);
				},
				blockEmitWithToken: function() {
					blockedWithToken = true;
					token = Math.random();
					return token;
				},
				allowEmit: function(accessToken) {
					if (blockedWithToken && accessToken === token) {
						blockedWithToken = false;
					}
				},
				on: function () {
					return socket.on.apply(socket, arguments);
				},
				once: function () {
					return socket.once.apply(socket, arguments);
				},
				removeAllListener: function (channel) {
					socket.removeAllListeners(channel);
				},
				channel: function (channel, callback) {
					socket.on(channel, function (data) {
						socketDebug("received data on " + channel);
						socketDebug(data);
						$rootScope.$apply(function () {
							callback(null, data);
						});
					});
				},
				awaitNoRequests: function () {
					if (loading === 0) {
						return Bluebird.resolve();
					}

					return new Bluebird(function (resolve) {
						socketS.listen(function () {
							if (loading === 0) {
								resolve();
							}
						}, "response");
					});
				},
				awaitConnection: function() {
					return new Bluebird(function (resolve) {
						if (socketS.isConnected()) {
							resolve();
						} else {
							socketS.once("connect", resolve);
						}
					});
				},
				/** definitly emits the request. might emit it multiple times! **/
				definitlyEmit: function (channel, request, callback) {
					var SOCKET_TIMEOUT = 10000;

					return socketS.awaitConnection().then(function () {
						return socketS.emit(channel, request).timeout(SOCKET_TIMEOUT);
					}).catch(function (e) {
						console.error(e);
						return Bluebird.delay(500).then(function () {
							return socketS.definitlyEmit(channel, request, callback);
						});
					}).nodeify(callback);
				},
				emit: function (channel, request, callback) {
					loadInterceptors();

					if (blockedWithToken && request.blockageToken !== token) {
						throw new DisconnectError("request blocked by token (channel: " + channel + ")");
					}

					if (!socketS.isConnected()) {
						throw new DisconnectError("no connection");
					}

					var timer = log.timer("request on " + channel);

					request.version = APIVERSION;

					socketDebug("Request on " + channel);
					socketDebug(request);

					interceptors.forEach(function (interceptor) {
						if (interceptor.transformRequest) {
							request = interceptor.transformRequest(request);
						}
					});

					loading++;
					socketS.notify(null, "request");

					var resultPromise = emit(channel, request).then(function (response) {
						socketDebug("Answer on " + channel);
						log.timerEnd(timer);

						lastRequestTime = response.serverTime;

						if (response.error) {
							socketError(response);
							throw new ServerError("server returned an error!");
						}

						socketDebug(response);

						interceptors.forEach(function (interceptor) {
							if (interceptor.transformResponse) {
								response = interceptor.transformResponse(response);
							}
						});
						
						return response;
					}).finally(function () {
						loading--;
						socketS.notify(null, "response");
					});

					if (typeof callback === "function") {
						//TODO: move $rootScope.$apply to afterHook
						step.unpromisify(resultPromise, h.addAfterHook(callback, $rootScope.$apply.bind($rootScope, null)));
					}

					return resultPromise;
				},
				getLoadingCount: function () {
					return loading;
				},
				lastRequestTime: function () {
					return lastRequestTime;
				},
				send: function (data) {
					socket.send(data);
				}
			};

			Observer.call(socketS);

			return socketS;
		};

		this.$get = ["$injector", "$rootScope", service];
	};

	serviceModule.provider("ssn.socketService", provider);
});
