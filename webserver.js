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

	cspConfig["img-src"].push("https://www.paypalobjects.com/");

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

var locales = ["en", "de"];

function getPossibleLocale(acceptLanguageHeader) {
	var languages = acceptLanguageHeader.split(",").map(function (lang) {
		return lang.split(";")[0];
	}).filter(function (lang) {
		return locales.indexOf(lang) !== -1;
	});

	return languages[0] || locales[0];
}

function run() {
	/* jshint validthis: true */

	"use strict";
	var express = require('express');
	var app = express();
	var router = express.Router();
	var webpack = require("webpack");
	var webpackConfig = require("./webpack.config.js");
	var webpackWorkerConfig = require("./webpack.worker.config.js");

	var WHISPEER_PORT = process.env.WHISPEER_PORT || 8080;

	process.argv.forEach(function(val, index, array) {
		// let's make nils happy
		if (val === "--port") {
			WHISPEER_PORT = array[index + 1];
		} else {
			// or just.. don't
			val = val.split("=");
			if (val[0] === "--port") {
				WHISPEER_PORT = val[1];
			}
		}
	});

	var csp = buildCSPConfig();

	if (process.env.WHISPEER_NO_CSP) {
		csp = "";
	}

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
		"backup",
		"post",
		"fund",
		"search"
	];

	grunt.log.writeln("Starting webserver...");

	var webpackMiddleware = require("webpack-dev-middleware");
	app.use(webpackMiddleware(webpack(webpackConfig), {
		publicPath: "/assets/js/build/",
	}));

	app.use(webpackMiddleware(webpack(webpackWorkerConfig), {
		publicPath: "/assets/js/build/",
	}));

	router.use("/assets", express.static('assets'))
	router.use("/", express.static('static'))
	router.all("*", function (req, res, next) {
		var paths = req.originalUrl.split(/\/|\?/);

		var redirectLocale = getPossibleLocale(req.get("accept-language"));

		paths = paths.filter(function (path) {
			return path !== "";
		});

		var possibleLocale = paths[0];
		var hasLocale = locales.indexOf(possibleLocale) !== -1;

		if (hasLocale) {
			paths.shift();
		}

		if (!hasLocale) {
			res.redirect("/" + redirectLocale + req.originalUrl);
		} else if (paths[0] === "recovery") {
			res.sendFile(__dirname + possibleLocale + "/recovery/index.html");
		} else if (paths.length === 0 || angular.indexOf(paths[0]) > -1) {
			res.sendFile(__dirname + "/index.html");
		} else if (paths[0] === "verifyMail") {
			res.sendFile(__dirname + possibleLocale + "/verifyMail/index.html");
		} else {
			next();
		}
	});

	app.use(router);
	app.listen(WHISPEER_PORT);

	grunt.log.writeln("Whispeer web server started on port " + WHISPEER_PORT);

	if (this && this.async) {
		this.async();
	}

}

module.exports = run;

if (!module.parent) {
	run();
}
