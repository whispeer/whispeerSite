/* global process, module */

var grunt = require("grunt");

function buildCSPConfig() {
	"use strict";

	var cspConfig = {
		"default-src": ["'self'"],
		"script-src": ["'self'"],
		"style-src": ["'self'", "'unsafe-inline'"],
		"object-src": ["'none'"],
		"img-src": ["'self'", "blob:", "data:"]
	};

	var os=require("os");
	var ifaces=os.networkInterfaces();

	grunt.log.writeln("Content Security Policy settings:" );
	function pushAddress(address) {
		grunt.log.writeln("Allowing from " + address );


		cspConfig["default-src"].push("http://" + address + ":3000");
		cspConfig["default-src"].push("ws://" + address + ":3000");

		cspConfig["default-src"].push("http://" + address + ":3001");
		cspConfig["default-src"].push("ws://" + address + ":3001");

		cspConfig["script-src"].push("http://" + address + ":3001");
	}

	pushAddress("localhost");
	pushAddress("127.0.0.1");

	cspConfig["default-src"].push("https://data.whispeer.de");
	cspConfig["default-src"].push("wss://data.whispeer.de");

	for (var dev in ifaces) {
		if (ifaces.hasOwnProperty(dev)) {
			ifaces[dev].filter(function (e) { return e.family.indexOf("4") > -1; }).map(function (e) { return e.address; }).forEach(pushAddress);
		}
	}

	var csp = "";

	Object.keys(cspConfig).forEach(function (key) {
		var value = cspConfig[key];
		var current = key + " " + value.join(" ") + "; ";

		csp += current;
	});

	return csp;
}

function run() {
	/* jshint validthis: true */

	"use strict";
	var nstatic = require("node-static");

	var WHISPEER_PORT = process.env.WHISPEER_PORT || 8080;

	var csp = buildCSPConfig();

	if (process.env.WHISPEER_NO_CSP) {
		csp = "";
	}

	var fileServer = new nstatic.Server(".", {
		"headers": {
			"Cache-Control": "no-cache, must-revalidate",
			"Content-Security-Policy": csp
		}
	});

	var angular = ["user", "messages", "circles", "main", "friends", "login", "loading", "help", "settings", "start", "notificationCenter", "setup", "invite", "agb", "impressum", "privacyPolicy", "recovery", "verifyMail"];

	grunt.log.writeln("Starting webserver...");

	var locales = ["en", "de"];

	require("http").createServer(function (request, response) {
		request.addListener("end", function () {
			var paths = request.url.split(/\/|\?/);

			if (locales.indexOf(paths[1]) > -1) {
				paths.splice(1, 1);
				request.url = paths.join("/");
			}

			fileServer.serve(request, response, function (e) {
				if (e && (e.status === 404)) {
					var dir = request.url.split(/\/|\?/)[1];

					if (dir === "recovery") {
						fileServer.serveFile("/recovery/index.html", 200, {}, request, response);
						return;
					}

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

	grunt.log.writeln("Whispeer web server started on port " + WHISPEER_PORT);

	if (this && this.async) {
		this.async();
	}

}

module.exports = run;

if (!module.parent) {
	run();
}
