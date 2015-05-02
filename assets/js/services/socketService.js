/**
* SocketService
**/
define([
	"services/serviceModule",
	"debug",
	"jquery",
	"socket",
	"socketStream",
	"step",
	"whispeerHelper",
	"config",
	"asset/observer",
	"bluebird"
], function (serviceModule, debug, $, io, iostream, step, h, config, Observer, Promise) {
	"use strict";

	var APIVERSION = "0.0.1";

	var socket;
	if (config.https) {
		socket = io.connect("https://" + config.ws + ":" + config.wsPort);
	} else {
		socket = io.connect("http://" + config.ws + ":" + config.wsPort);
	}

	var socketDebug = debug("whispeer:socket");
	var socketError = debug("whispeer:socket:error");

	var provider = function () {
		var interceptorFactories = [];
		this.addInterceptor = function (interceptorName) {
			interceptorFactories.push(interceptorName);
		};

		var service = function ($injector, $rootScope, keyStore) {
			var interceptors = interceptorFactories.map(function (name) {
				return $injector.get(name);
			}).reverse();

			var lastRequestTime = 0;

			window.setInterval(function () {
				try {
					if (!socket.connected) {
						socket.connect();
					}
				} catch (e) {
					socketError(e);
				}
			}, 10000);

			var loading = 0;

			var internalObserver = new Observer();
			var uploadingCounter = 0, streamUpgraded = false;

			var log = {
				timer: function (name) {
					var message = new Date().toLocaleTimeString() + ":" + name + "(" + Math.random() + ")";
					console.time(message);
					return message;
				},
				timerEnd: function (message) {
					console.timeEnd(message);
				}
			};

			function emit(channel, request) {
				return new Promise(function (resolve) {
					socket.emit(channel, request, resolve);
				});
			}

			var socketS = {
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
					step(function () {
						if (!streamUpgraded) {
							socketS.emit("blob.upgradeStream", {}, this);
						} else {
							this.ne();
						}
					}, h.sF(function () {
						streamUpgraded = true;

						var stream = iostream.createStream();
						iostream(socket).emit("pushBlob", stream, {
							blobid: blobid
						});

						var blobStream = iostream.createBlobReadStream(blob);

						blobStream.on("data", function(chunk) {
							progress.progressDelta(chunk.length);
						});

						blobStream.on("end", this);

						blobStream.pipe(stream);
					}), function (e) {
						uploadingCounter--;

						internalObserver.notify(blobid, "uploadFinished");
						internalObserver.notify(blobid, "uploadFinished:" + blobid);

						this(e);
					}, cb);
				},
				on: function () {
					socket.on.apply(socket, arguments);
				},
				once: function () {
					socket.once.apply(socket, arguments);
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
						return Promise.resolve();
					}

					return new Promise(function (resolve) {
						socketS.listen(function () {
							if (loading === 0) {
								resolve();
							}
						}, "response");
					});
				},
				emit: function (channel, request, callback) {
					if (!socketS.isConnected()) {
						throw new Error("no connection");
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
							throw new Error("server returned an error!");
						}

						socketDebug(response);

						interceptors.forEach(function (interceptor) {
							if (interceptor.transformResponse) {
								response = interceptor.transformResponse(request);
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

			$(document).keypress(function (e) {
				if (e.shiftKey && e.ctrlKey && e.keyCode === 5) {
					if (globalErrors.length > 0) {
						if (confirm("Send errors to whispeer server?")) {
							socketS.emit("errors", {
								errors: globalErrors
							}, function (e) {
								if (e) {
									alert("Transfer failed!");
								} else {
									alert("Errors successfully transfered to server");
								}
							});
						}
					} else {
						alert("No Errors to transfer");
					}
				}
			});


			socket.on("disconnect", function () {
				socketDebug("socket disconnected");
				loading = 0;
				streamUpgraded = false;
				uploadingCounter = 0;
			});

			socket.on("connect", function () {
				socketDebug("socket connected");
				socketS.emit("ping", {}, function () {});
			});

			keyStore.upload.setSocket(socketS);

			return socketS;
		};

		this.$get = ["$injector", "$rootScope", "ssn.keyStoreService", service];
	};

	serviceModule.provider("ssn.socketService", provider);
});
