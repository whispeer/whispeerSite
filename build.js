"use strict";

var fs = require("fs");
var basePath = "./assets/js/";

var rewriteFiles = ["directives/basicDirectives", "controllers/controllers", "services/services", "controllers/magicbarControllers", "validation/validator"];

var includes;

global.define = function (inc) {
	includes = inc;
};

var i, content;
for (i = 0; i < rewriteFiles.length; i += 1) {
	require(basePath + rewriteFiles[i]);
	content = fs.readFileSync(basePath + rewriteFiles[i] + ".js").toString();
	content = content.replace(/define\([^ ,]*/i, "define(" + JSON.stringify(includes));
	fs.writeFileSync(basePath + rewriteFiles[i] + ".js", content);
}


/*var buildBegin = "define(";
var buildEnd = ", function () {});";

var i, result = [];
for (i = 0; i < includeDirs.length; i += 1) {
	result = result.concat(fs.readdirSync(basePath + includeDirs[i]).filter(function (e) {
		return e.indexOf(".js") === e.length - 3;
	}).map(function (e) {
		return "./" + includeDirs[i] + "/" + e.substr(0, e.lastIndexOf("."));
	}));
}

console.log("files: " + result.length);

fs.writeFileSync(basePath + "emptyInclude.js", buildBegin + JSON.stringify(result) + buildEnd);*/