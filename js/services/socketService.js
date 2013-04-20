/**
* LoginService
**/
define(['angular', 'socket', 'step', 'helper'], function (angular, socket, step, h) {
	"use strict";

	var socket = io.connect('http://localhost:3000');

	var service = function () {
		return {
			listen: function (channel, callback) {
				step(function () {
					socket.on(channel, this.ne);
				}, h.sF(function (data) {
					this.ne(JSON.parse(data));
				}), callback);
			},
			emit: function (channel, data, callback) {
				step(function doEmit() {
					socket.emit(channel, data, this.ne);
				}, h.sF(function emitResults(data) {
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
		}
	};

	service.$inject = [];

	return service;
});