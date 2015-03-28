/**
* SocketService
**/
define(["jquery", "socket", "socketStream", "step", "whispeerHelper", "config", "asset/observer", "bluebird"], function ($, io, iostream, step, h, config, Observer, Promise) {
	"use strict";

	var APIVERSION = "0.0.1";

	var socket;
	if (config.https) {
		socket = io.connect("https://" + config.ws + ":" + config.wsPort);
	} else {
		socket = io.connect("http://" + config.ws + ":" + config.wsPort);
	}

	var service = function ($rootScope, sessionService, keyStore) {
		function updateLogin(data) {
			if (data.logedin) {
				sessionService.setSID(data.sid, data.userid);
			} else {
				sessionService.logout();
			}
		}

		var lastRequestTime = 0;

		window.setInterval(function () {
			try {
				if (!socket.connected) {
					socket.connect();
				}
			} catch (e) {
				console.error(e);
			}
		}, 10000);

		var loading = 0;

		var internalObserver = new Observer();
		var uploadingCounter = 0, streamUpgraded = false;

		var log = {
			log: function () {
				console.log.apply(console, arguments);
			},
			info: function () {
				console.info.apply(console, arguments);
			},
			error: function () {
				console.error.apply(console, arguments);
			},
			timer: function (name) {
				var message = new Date().toLocaleTimeString() + ":" + name + "(" + Math.random() + ")";
				console.time(message);
				return message;
			},
			timerEnd: function (message) {
				console.timeEnd(message);
			}
		};

		function addKeys(keys) {
			if (!keys) {
				return;
			}

			keys.forEach(function (key) {
				keyStore.upload.addKey(key);
			});
		}

		function emit(channel, request) {
			return new Promise(function (resolve, reject) {
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
			listen: function (channel, callback) {
				socket.on(channel, function (data) {
					console.log("received data on " + channel);
					console.log(data);
					$rootScope.$apply(function () {
						callback(null, data);
					});
				});
			},
			awaitNoRequests: function () {
				return Promise.resolve();
			},
			emit: function (channel, request, callback) {
				if (!socketS.isConnected()) {
					throw new Error("no connection");
				}

				var timer = log.timer("request on " + channel);

				request.sid = sessionService.getSID();
				request.version = APIVERSION;

				log.info("Request on " + channel);
				log.info(request);

				loading++;

				var resultPromise = emit(channel, request).then(function (response) {
					log.info("Answer on " + channel);
					log.timerEnd(timer);

					addKeys(response.keys);

					lastRequestTime = response.serverTime;

					if (response.error) {
						log.error(response);
						throw new Error("server returned an error!");
					}

					log.info(response);

					lastRequestTime = response.serverTime;

					updateLogin(response);
					
					return response;
				}).finally(function () {
					loading--;
				});

				if (typeof callback === "function") {
					step.unpromisify(resultPromise, callback);
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

		$(document).keypress(function (e) {
			if (e.shiftKey && e.ctrlKey && e.keyCode === 5) {
				if (errors.length > 0) {
					var yes = confirm("Send errors to whispeer server?");

					if (yes) {
						socketS.emit("errors", {
							errors: errors
						}, function (e) {
							if (e) {
								alert("Transfer failed!");
							} else {
								alert("Errors successfully transfered to server");
							}
						});
					}
				}
			}
		});


		socket.on("disconnect", function () {
			console.info("socket disconnected");
			loading = 0;
			streamUpgraded = false;
			uploadingCounter = 0;
		});

		socket.on("connect", function () {
			console.info("socket connected");
			socketS.emit("ping", {}, function () {});
		});

		keyStore.upload.setSocket(socketS);

		return socketS;
	};

	service.$inject = ["$rootScope", "ssn.sessionService", "ssn.keyStoreService"];

	return service;
});
