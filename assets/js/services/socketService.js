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
				if (!socket.socket.connected) {
					socket.socket.connect();
				}
			} catch (e) {
				console.error(e);
			}
		}, 10000);

		var loading = 0;
		var upload = {
			fullSize: 0,
			uploaded: 0,
			blobid: ""
		};
		var uploading = false;

		var internalObserver = new Observer();

		var socketS = {
			uploadObserver: internalObserver,
			isConnected: function () {
				return socket.socket.connected;
			},
			getUploadStatus: function () {
				return upload;
			},
			uploadBlob: function (blob, blobid, cb) {
				step(function () {
					if (uploading) {
						internalObserver.listenOnce("uploadFinished", function () {
							socketS.uploadBlob(blob, blobid, cb);
						});
						return;
					}

					socketS.emit("blob.upgradeStream", {}, this);
				}, h.sF(function () {
					internalObserver.notify(blobid, "uploadStart:" + blobid);
					var stream = iostream.createStream();
					iostream(socket).emit("pushBlob", stream, {
						blobid: blobid
					});

					var blobStream = iostream.createBlobReadStream(blob);

					upload = {
						fullSize: blob.size,
						uploaded: 0,
						blobid: blobid,
					};
					uploading = true;

					blobStream.on("data", function(chunk) {
						$rootScope.$apply(function () {
							upload.uploaded += chunk.length;
							internalObserver.notify(blobid, "uploadProgress");
							internalObserver.notify(blobid, "uploadProgress:" + blobid);
						});
					});

					blobStream.on("end", this);

					blobStream.pipe(stream);
				}), h.sF(function () {
					uploading = false;
					internalObserver.notify(blobid, "uploadFinished:" + blobid);
					this.ne();
				}), cb);
			},
			on: function () {
				socket.on.apply(socket, arguments);
			},
			once: function () {
				socket.once.apply(socket, arguments);
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

					if (socket.socket.connected) {
						socket.emit(channel, data, this.ne);
					} else {
						throw new Error("no connection");
					}
				}, h.sF(function emitResults(data) {
					console.groupCollapsed("Answer on " + channel);
					console.info((new Date().getTime() - time));

					if (data.keys) {
						data.keys.forEach(function (key) {
							keyStore.upload.addKey(key);
						});
					}

					loading--;
					lastRequestTime = data.serverTime;

					if (data.error) {
						console.error(data);
						throw new Error("server returned an error!");
					} else {
						console.info(data);
					}

					console.groupEnd();

					var that = this;
					$rootScope.$apply(function () {
						updateLogin(data);

						if (typeof callback === "function") {
							that.ne(data);
						} else {
							console.log("unhandled response" + data);
						}
					});
				}), callback);
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

		socket.on("disconnect", function () {
			console.info("socket disconnected");
			loading = 0;
		});

		socket.on("reconnect", function () {
			console.info("socket reconnected");
			socketS.emit("ping", {}, function () {});
		});

		keyStore.upload.setSocket(socketS);

		return socketS;
	};

	service.$inject = ["$rootScope", "ssn.sessionService", "ssn.keyStoreService"];

	return service;
});