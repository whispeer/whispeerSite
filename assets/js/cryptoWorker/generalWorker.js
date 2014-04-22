"use strict";

importScripts("../libs/require.js");

requirejs.config({
	baseUrl: "/assets/js"
});


var theHandler;

self.onmessage = function (event) {
	var result;

	if (event.data.loadScript) {
		require([event.data.loadScript], function (handler) {
			theHandler = handler;

			self.postMessage("ready");
		});

		return;
	}

	if (theHandler) {
		result = theHandler(event);

		if (result) {
			self.postMessage(result);
		}
	}
};