/**
* SocketService
**/
define(["socket", "step", "whispeerHelper"], function (io, step, h) {
	"use strict";

	var socket = io.connect("http://127.0.0.1:3000");

	var service = function ($rootScope, sessionService) {
		function updateLogin(data) {
			if (data.logedin) {
				sessionService.setSID(data.sid, data.id);
			} else {
				sessionService.logout();
			}
		}

		return {
			socket: socket,
			listen: function (channel, callback) {
				step(function () {
					socket.on(channel, this.ne);
				}, h.sF(function (data) {
					var that = this;
					$rootScope.$apply(function () {
						updateLogin(data);

						that.ne(data);
					});
				}), callback);
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
					console.log("request took: " + (new Date().getTime() - time));
					console.log(data);
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
	};

	service.$inject = ["$rootScope", "ssn.sessionService"];

	return service;
});