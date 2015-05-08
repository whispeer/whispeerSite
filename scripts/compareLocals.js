#!/usr/bin/env node

process.nextTick(function () {
	var fs = require("fs");
	var basePath = "./assets/js/i18n/";
	var files = ["l_en-US.json", "l_de.json"];

	var fileContents = [];

	var i;
	for (i = 0; i < files.length; i += 1) {
		console.log("Parsing File: " + files[i]);
		fileContents[i] = JSON.parse(fs.readFileSync(basePath + files[i]));
	}

	var h = require("./assets/js/helper/");

	function sLen(str, len) {
		while(str.length < len) {
			str = str + " ";
		}
		return str;
	}

	function check(jsonData, path) {
		var i, objKeys = [];
		for (i = 0; i < jsonData.length; i += 1) {
			if (typeof jsonData[i] === "object") {
				objKeys[i] = Object.keys(jsonData[i]);
			} else if (typeof jsonData[i] === "string") {
				objKeys[i] = [];
			} else if (typeof jsonData[i] === "undefined") {
				console.log("File " + sLen(files[i], 15) + " is missing " + path.substr(1));
				objKeys[i] = [];
			}
		}

		var allKeys = objKeys[0].slice(0);

		for (i = 1; i < objKeys.length; i += 1) {
			allKeys = allKeys.concat(h.arraySubtract(objKeys[i], allKeys));
		}

		for (i = 0; i < allKeys.length; i += 1) {
			check(jsonData.map(function (e) {
				if (e) {
					return e[allKeys[i]];
				}
			}), path + "." + allKeys[i]);
		}
	}

	check(fileContents, "");
});
