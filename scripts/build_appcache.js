#!/usr/bin/env node

"use strict";

var Lazy    = require("lazy"),
	fs  = require("fs");

function parse(source, destination, config, done) {
	var ifStop = false;

	var commands = {
		"if": function (line) {
			var vm = require("vm");

			ifStop = !vm.runInNewContext(line, config);
		},
		endif: function () {
			ifStop = false;
		},
		params: function (basePath) {
			return process.argv.slice(2).map(function (arg) {
				return basePath + arg;
			});
		},
		fallback: function () {
			var dirs = ["en"];
			var names = [];

			dirs.forEach(function (dir) {
				names = names.concat(fs.readdirSync("./static/" + dir).map(function (dir) {
					return "/en/" + dir;
				}));
			});

			names = names.map(function (name) {
				return name + " " + name + "/index.html";
			});

			return names;
		},
		expand: function (dir, remove) {
			if (dir.lastIndexOf("/") !== dir.length - 1) {
				dir += "/";
			}

			var names = fs.readdirSync(dir);

			names = names.map(function (file) { return dir + file; });

			var files = names.filter(function (file) { return fs.statSync(file).isFile(); });

			var dirs = names.filter(function (file) { return fs.statSync(file).isDirectory(); }).map(function (dir) {
				return commands.expand(dir, remove);
			});

			return files.concat.apply(files, dirs).map(function (file) {
				return file.indexOf(".") === 0 ? file.substr(1) : file;
			}).map(function (file) {
				console.log(file.replace(remove, ""));
				return file.replace(remove, "");
			});
		},
		timestamp: function () {
			return ["#" + new Date().getTime()];
		}
	};

	function evaluateLine(line) {
		var command, param, param2;

		var match = line.match(/^\s*\#([A-z]*)?:?([^:]*)?:?(.*)/);

		if (!match) {
			return line;
		}

		command = match[1];
		param = match[2];
		param2 = match[3].split("|");

		if (commands[command] && (!ifStop || command === "endif")) {
			var result = commands[command](param, param2) || [];
			result.unshift(line);
			return result;
		}

		return line;
	}

	new Lazy(fs.createReadStream(source))
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
			console.log("Successfully created manifest file");
			done();
		});
}

module.exports = parse;
