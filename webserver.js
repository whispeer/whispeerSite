/* global process, module */

var grunt = require("grunt");

function buildCSPConfig() {
	"use strict";

	var cspConfig = {
		"default-src": ["'self'"],
		"script-src": ["'self'"],
		"style-src": ["'self'", "'unsafe-inline'"],
		"object-src": ["'none'"],
		"img-src": ["'self'", "blob:", "data:"],
		"frame-src": ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"]
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

	var staticServer = new nstatic.Server("./static", {
		"headers": {
			"Cache-Control": "no-cache, must-revalidate",
			"Content-Security-Policy": csp
		}
	});

	var mainServer = new nstatic.Server(".", {
		"headers": {
			"Cache-Control": "no-cache, must-revalidate",
			"Content-Security-Policy": csp
		}
	});

	var angular = [
		"user",
		"messages",
		"circles",
		"main",
		"friends",
		"settings",
		"start",
		"notificationCenter",
		"setup",
		"invite",
		"backup"
	];

	grunt.log.writeln("Starting webserver...");

	var locales = ["en", "de"];

	function Responder(request, response) {
		this._request = request;
		this._response = response;
	}

	Responder.prototype.ifError = function (cb) {
		return function (e) {
			if (e && (e.status === 404)) {
				cb.apply(this, arguments);
			}
		}.bind(this);
	};

	Responder.prototype.serveStatic = function () {
		staticServer.serve(this._request, this._response, this.ifError(this.serveMain));
	};

	Responder.prototype.serveMain = function () {
		mainServer.serve(this._request, this._response, this.ifError(this.serveAngular));
	};

	Responder.prototype.getPossibleLocale = function () {
		var languages = this._request.headers["accept-language"].split(",").map(function (lang) {
			return lang.split(";")[0];
		}).filter(function (lang) {
			return locales.indexOf(lang) !== -1;
		});

		return languages[0] || locales[0];
	};

	Responder.prototype.redirectLocale = function () {
		var redirectUrl = "/" + this.getPossibleLocale() + this._request.url;

		this._response.writeHead(302, {
			Location: redirectUrl
		});
		this._response.write("Found - Redirecting");
		this._response.end();
	};

	Responder.prototype.serveAngular = function () {
		var paths = this._request.url.split(/\/|\?/);

		paths = paths.filter(function (path) {
			return path !== "";
		});

		var possibleLocale = paths[0];
		var hasLocale = locales.indexOf(possibleLocale) !== -1;

		if (hasLocale) {
			paths.shift();
		}

		if (!hasLocale) {
			this.redirectLocale();
		} else if (paths[0] === "recovery") {
			staticServer.serveFile("/recovery/index.html", 200, {}, this._request, this._response);
		} else if (paths.length === 0 || angular.indexOf(paths[0]) > -1) {
			mainServer.serveFile("/index.html", 200, {}, this._request, this._response);
		} else if (paths[0] === "verifyMail") {
			staticServer.serveFile(possibleLocale + "/verifyMail/index.html", 200, {}, this._request, this._response);
		} else {
			this.write404.apply(this, arguments);
		}
	};

	Responder.prototype.write404 = function (e) {
		this._response.writeHead(e.status, e.headers);
		this._response.write("Not found");
		this._response.end();
	};

	require("http").createServer(function (request, response) {
		var responder = new Responder(request, response);

		request.addListener("end", responder.serveStatic.bind(responder)).resume();
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
