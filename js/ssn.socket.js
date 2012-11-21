"use strict";
if (typeof (ssn) === "undefined") {
	var ssn = {};
}

ssn.socket = function () {
	var useSocket = !!Modernizr.websockets;

	this.isConnected = function () {
		if (useSocket) {
		
		} else {
		
		}
	};
	
	this.send = function (dataObject) {

	};

	this.addReceiveListener = function (topic) {

	};
};

var theSocket = new ssn.socket();
ssn.socket = theSocket;