#!/usr/bin/env node

"use strict";

var destination = "whispeer.mf";
var source = "whispeer.mf.template";

var Lazy    = require("lazy"),
	fs  = require("fs");

var ifStop = false;

var commands = {
	"if": function (line) {
		var vm = require("vm");

		var variables = {
			production: false
		};

		ifStop = !vm.runInNewContext(line, variables);
	},
	endif: function () {
		ifStop = false;
	},
	params: function (basePath) {
		return process.argv.slice(2).map(function (arg) {
			return basePath + arg;
		});
	},
	expand: function (dir) {
		if (dir.lastIndexOf("/") !== dir.length - 1) {
			dir += "/";
		}

		var names = fs.readdirSync(dir);

		names = names.map(function (file) { return dir + file; });

		var files = names.filter(function (file) { return fs.statSync(file).isFile(); });

		var dirs = names.filter(function (file) { return fs.statSync(file).isDirectory(); }).map(commands.expand);

		return files.concat.apply(files, dirs).map(function (file) {
			return file.indexOf(".") === 0 ? file.substr(1) : file;
		});
	},
	timestamp: function () {
		return ["#" + new Date().getTime()];
	}
};

function evaluateLine(line) {
	var command, param;

	var match = line.match(/^\s*\#([A-z]*)?:?(.*)/);

	if (!match) {
		return line;
	}

	command = match[1];
	param = match[2];

	if (commands[command] && (!ifStop || command === "endif")) {
		var result = commands[command](param) || [];
		result.unshift(line);
		return result;
	}

	return line;
}

Lazy(fs.createReadStream(source))
	.lines
	.map(String)
	.map(function (line) {
		if (line === "0") {
			return "";
		}

		return line;
	})
	.map(function(line){
		if (line.match(/^\s*\#/)) {
			return evaluateLine(line);
		}

		return line;
	})
	.map(function (line) {
		if (Array.isArray(line)) {
			return line.join("\n");
		}

		return line;
	})
	.join(function (result) {
		fs.writeFileSync(destination, result.join("\n"));
	});