/* global process */
(function() {
	"use strict";

	var nstatic = require("node-static");

	var WHISPEER_PORT = process.env.WHISPEER_PORT || 80;

	var cspConfig = {
		"default-src": ["'self'", "ws://localhost:3000" ,"localhost:3000", "ws://localhost:3001", "localhost:3001"],
		"script-src": ["'self'", "ws://localhost:3000", "localhost:3000", "ws://localhost:3001", "localhost:3001"],
		"style-src": ["'self'", "'unsafe-inline'"],
		"object-src": ["'none'"],
		"img-src": ["'self'", "blob:", "data:"]
	};

	var os=require("os");
	var ifaces=os.networkInterfaces();

	function pushAddress(details){
		if (details.family === "IPv4") {
			cspConfig["default-src"].push("http://" + details.address + ":3000");
			cspConfig["default-src"].push("ws://" + details.address + ":3000");
		}
	}

	cspConfig["default-src"].push("https://beta.whispeer.de:3001");
	cspConfig["default-src"].push("wss://beta.whispeer.de:3001");

	for (var dev in ifaces) {
		ifaces[dev].forEach(pushAddress);
	}

	var csp = "";

	Object.keys(cspConfig).forEach(function (key) {
		var value = cspConfig[key];
		var current = key + " " + value.join(" ") + "; ";

		csp += current;
	});

	var fileServer  = new nstatic.Server(".", {
		"headers": {
			"Cache-Control": "no-cache, must-revalidate",
			"Content-Security-Policy": csp
		}
	});

	var angular = ["user", "messages", "circles", "main", "friends", "login", "loading", "help", "settings", "start", "notificationCenter"];

	require("http").createServer(function (request, response) {
		request.addListener("end", function () {
			fileServer.serve(request, response, function (e, res) {
				if (e && (e.status === 404)) {
					var dir = request.url.split(/\/|\?/)[1];

					if (angular.indexOf(dir) === -1) {
						console.error("File not found: " + request.url);
						fileServer.serveFile("/index.html", 404, {}, request, response);
					} else {
						fileServer.serveFile("/index.html", 200, {}, request, response);
					}
				}
			});
		}).resume();
	}).listen(WHISPEER_PORT);

	console.log("Server started");
})();
