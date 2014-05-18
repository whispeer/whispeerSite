/**
* SocketService
**/
define(["socket", "step", "whispeerHelper", "config", "cryptoWorker/generalWorkerInclude"], function (io, step, h, config, generalWorkerInclude) {
	"use strict";

	var socket;
	if (config.https) {
		socket = io.connect("https://" + config.ws + ":" + config.wsPort);
	} else {
		socket = io.connect("http://" + config.ws + ":" + config.wsPort);
	}

	var service = function ($rootScope, sessionService) {
		generalWorkerInclude.setBeforeCallBack(function (evt, cb) {
			$rootScope.$apply(cb);
		});

		function updateLogin(data) {
			if (data.logedin) {
				sessionService.setSID(data.sid, data.userid);
			} else {
				sessionService.logout();
			}
		}

		var lastRequestTime = 0;

		var socketS = {
			socket: socket,
			on: function () {
				socket.on.apply(socket, arguments);
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

					console.log("requesting on " + channel);
					console.log(data);
					time = new Date().getTime();

					socket.emit(channel, data, this.ne);
				}, h.sF(function emitResults(data) {
					console.groupCollapsed("Request");
					console.info("On " + channel);
					console.info((new Date().getTime() - time));

					if (data.error) {
						console.error(data);
					} else {
						console.info(data);
					}

					console.groupEnd();

					lastRequestTime = data.serverTime;

					//console.debug(h.parseDecimal(data.serverTime) - new Date().getTime());

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
			lastRequestTime: function () {
				return lastRequestTime;
			},
			send: function (data) {
				socket.send(data);
			}
		};

		socket.on("reconnect", function () {
			socketS.emit("ping", {}, function () {});
		});

		return socketS;
	};

	service.$inject = ["$rootScope", "ssn.sessionService"];

	return service;
});