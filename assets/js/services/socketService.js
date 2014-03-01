/**
* SocketService
**/
define(["socket", "step", "whispeerHelper", "config"], function (io, step, h, config) {
	"use strict";

	var socket = io.connect("http://" + config.ws + ":" + config.wsPort);

	var service = function ($rootScope, sessionService) {
		function updateLogin(data) {
			if (data.logedin) {
				sessionService.setSID(data.sid, data.userid);
			} else {
				sessionService.logout();
			}
		}

		var socketS = {
			socket: socket,
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
					console.info("request on " + channel + " took: " + (new Date().getTime() - time));

					if (data.error) {
						console.error(data);
					} else {
						console.log(data);
					}

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
			send: function (data) {
				socket.send(data);
			}
		};
		return socketS;
	};

	service.$inject = ["$rootScope", "ssn.sessionService"];

	return service;
});