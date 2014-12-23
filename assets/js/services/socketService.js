/**
* SocketService
**/
define(["jquery", "socket", "socketStream", "step", "whispeerHelper", "config", "asset/observer"], function ($, io, iostream, step, h, config, Observer) {
	"use strict";

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
		var upload = {};

		var internalObserver = new Observer();
		var uploadingCounter = 0, streamUpgraded = false;

		var socketS = {
			uploadObserver: internalObserver,
			isConnected: function () {
				return socket.connected;
			},
			getUploadStatus: function (blobid) {
				return upload[blobid];
			},
			uploadBlob: function (blob, blobid, cb) {
				if (uploadingCounter > 3) {
					internalObserver.listenOnce(function () {
						socketS.uploadBlob(blob, blobid, cb);
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

					internalObserver.notify(blobid, "uploadStart:" + blobid);
					var stream = iostream.createStream();
					iostream(socket).emit("pushBlob", stream, {
						blobid: blobid
					});

					var blobStream = iostream.createBlobReadStream(blob);

					upload[blobid] = {
						fullSize: blob.size,
						uploaded: 0,
						blobid: blobid,
					};

					blobStream.on("data", function(chunk) {
						$rootScope.$apply(function () {
							upload[blobid].uploaded += chunk.length;
							internalObserver.notify(blobid, "uploadProgress");
							internalObserver.notify(blobid, "uploadProgress:" + blobid);
						});
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
			emit: function (channel, data, callback) {
				var time;
				step(function doEmit() {
					data.sid = sessionService.getSID();

					console.groupCollapsed("Request on " + channel);
					console.log(data);
					console.groupEnd();

					time = new Date().getTime();
					loading++;

					if (socketS.isConnected()) {
						socket.emit(channel, data, this.ne);
					} else {
						throw new Error("no connection");
					}
				}, h.sF(function emitResults(data) {
					console.groupCollapsed("Answer on " + channel);
					console.info((new Date().getTime() - time));

					loading--;

					if (data.keys) {
						data.keys.forEach(function (key) {
							keyStore.upload.addKey(key);
						});
					}

					loading--;
					lastRequestTime = data.serverTime;

					if (data.error) {
						console.error(data);
						console.groupEnd();
						throw new Error("server returned an error!");
					}

					console.info(data);
					console.groupEnd();

					lastRequestTime = data.serverTime;

					updateLogin(data);

					if (typeof callback === "function") {
						this.ne(data);
					} else {
						console.log("unhandled response" + data);
					}
				}), function () {
					var args = arguments, that = this;
					window.setTimeout(function () {
						$rootScope.$apply(function () {
							that.apply(that, args);
						});
					});
				}, callback);
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