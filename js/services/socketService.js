/**
* SocketService
**/
define(['socket', 'step', 'helper'], function (io, step, h) {
	"use strict";

	var socket = io.connect('http://localhost:3000');

	var service = function (sessionService) {
		function updateLogin(data) {
			if (data.logedin) {
				sessionService.setSID(data.sid);
			} else {
				sessionService.logout();
			}
		}

		return {
			listen: function (channel, callback) {
				step(function () {
					socket.on(channel, this.ne);
				}, h.sF(function (data) {
					updateLogin(data);

					this.ne(data);
				}), callback);
			},
			emit: function (channel, data, callback) {
				step(function doEmit() {
					socket.emit(channel, data, this.ne);
				}, h.sF(function emitResults(data) {
					updateLogin(data);

					if (typeof callback === "function") {
						this.ne(data);
					} else {
						console.log("unhandled response" + data);
					}
				}), callback);
			},
			send: function (data) {
				socket.send(data);
			}
		};
	};

	service.$inject = ['ssn.sessionService'];

	return service;
});