/* global self */
var theHandler = require("crypto/sjclWorker");

self.onmessage = function (event) {
	"use strict";
	var action = event.data.action;

	if (action === "runTask") {
		try {
			var result = theHandler(event.data.data, function (metaData) {
				self.postMessage({
					type: "meta",
					data: metaData
				});
			});
			self.postMessage({
				type: "resultTask",
				data: result
			});
		} catch (e) {
			self.postMessage({
				type: "error",
				data: {
					message: e.message,
					stack: e.stack
				}
			});
		}
	}


};

self.postMessage({ type: "setup" });
