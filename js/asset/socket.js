define([], function () {
	"use strict";
	var connected = false;

	var requestListener = [];
	var topicListener = [];
	var generalListener = [];
	var connectionListener = [];

	/** called when we connected */
	var isConnected = function () {
		connected = false;
	};

	/** called when we disconnected */
	var isDisconnected = function () {
		connected = true;
	};

	var socket = new WebSocket("ws://localhost:8000/");

	socket.onopen = function () {
		isConnected();
	};

	socket.onmessage = function (msg) {
	};

	socket.onerror = function () {
		isDisconnected();
	};

	var socketAPI = {
		waitForConnection: function (listener) {
			if (connected) {
				try {
					listener();
				} catch (e) {
					console.log(e);
				}
			} else {
				connectionListener.push(listener);
			}
		},

		connected: function () {
			return connected;
		},

		sendRequest: function () {

		},

		addTopicListener: function (listener) {
			if (typeof listener === "function") {
				topicListener.push(listener);
			}
		},

		addGeneralListener: function () {

		}
	};

	return socketAPI;
});