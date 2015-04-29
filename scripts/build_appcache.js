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
		expand: function (dir, filter) {
			if (dir.lastIndexOf("/") !== dir.length - 1) {
				dir += "/";
			}

			var names = fs.readdirSync(dir);

			names = names.map(function (file) { return dir + file; });

			var files = names.filter(function (file) { return fs.statSync(file).isFile(); });

			var dirs = names.filter(function (file) { return fs.statSync(file).isDirectory(); }).map(function (dir) {
				return commands.expand(dir, filter);
			});

			return files.concat.apply(files, dirs).map(function (file) {
				return file.indexOf(".") === 0 ? file.substr(1) : file;
			}).filter(function (file) {
				var i;
				for (i = 0; i < filter.length; i += 1) {
					if (file.lastIndexOf(filter[i]) > file.length - filter[i].length - 1) {
						return true;
					}
				}

				return false;
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
