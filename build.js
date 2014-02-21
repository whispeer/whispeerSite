"use strict";

var fs = require("fs");
var basePath = "assets/js/";

var includeDirs = ["directives", "controllers", "services", "controllers/magicbar"];

var buildBegin = "define(";
var buildEnd = ", function () {});";

var i, result = [];
for (i = 0; i < includeDirs.length; i += 1) {
	result = result.concat(fs.readdirSync(basePath + includeDirs[i]).filter(function (e) {
		return e.indexOf(".js") > -1;
	}).map(function (e) {
		return "./" + includeDirs[i] + "/" + e.substr(0, e.lastIndexOf("."));
	}));
}

console.log("files: " + result.length);

fs.writeFileSync(basePath + "emptyInclude.js", buildBegin + JSON.stringify(result) + buildEnd);