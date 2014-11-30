/**
* SocketService
**/
define(["jquery", "socket", "socketStream", "step", "whispeerHelper", "config"], function ($, io, iostream, step, h, config) {
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

		var socketS = {
			isConnected: function () {
				return socket.socket.connected;
			},
			uploadBlob: function (blob, blobid, cb) {
				step(function () {
					socketS.emit("blob.upgradeStream", {}, this);
				}, h.sF(function () {
					var stream = iostream.createStream();
					iostream(socket).emit("pushBlob", stream, {
						blobid: blobid
					});

					var blobStream = iostream.createBlobReadStream(blob);

					blobStream.on("end", this);

					blobStream.pipe(stream);
				}), cb);
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

					if (socket.socket.connected) {
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

					if (data.error) {
						console.error(data);
						console.groupEnd();
						throw new Error("server returned an error!");
					}

					console.info(data);
					console.groupEnd();

					lastRequestTime = data.serverTime;

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