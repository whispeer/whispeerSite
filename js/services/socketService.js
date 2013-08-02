/**
* SocketService
**/
define(["socket", "step", "helper"], function (io, step, h) {
	"use strict";

	var socket = io.connect("http://localhost:3000");

	var service = function ($rootScope, sessionService) {
		function updateLogin(data) {
			if (data.logedin) {
				sessionService.setSID(data.sid);
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
				step(function doEmit() {
					data.sid = sessionService.getSID();

					console.log("Sending: " + data);

					socket.emit(channel, data, this.ne);
				}, h.sF(function emitResults(data) {
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