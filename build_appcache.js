#!/usr/bin/env node

"use strict";

var destination = "whispeer.mf";
var source = "whispeer.mf.template";

var Lazy    = require("lazy"),
	fs  = require("fs");

function expandDir(dir) {
	if (dir.lastIndexOf("/") !== dir.length - 1) {
		dir += "/";
	}

	var names = fs.readdirSync(dir);

	names = names.map(function (file) { return dir + file; });

	var files = names.filter(function (file) { return fs.statSync(file).isFile(); });

	var dirs = names.filter(function (file) { return fs.statSync(file).isDirectory(); }).map(expandDir);

	return files.concat.apply(files, dirs);
} 

function expandLine(line) {
	var command, param;

	var match = line.match(/^\s*\#([A-z]*)?:?(.*)/);

	if (!match) {
		return line;
	}

	command = match[1];
	param = match[2];

	var result;

	if (command === "expand") {
		result = expandDir(param).map(function (file) {
			return file.substr(1);
		});
	} else if (command === "timestamp") {
		result = ["#" + new Date().getTime()];
	} else {
		return line;
	}

	result.unshift(line);
	return result;
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
			return expandLine(line);
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