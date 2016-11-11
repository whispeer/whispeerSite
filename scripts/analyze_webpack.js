#!/usr/bin/env node

"use strict";

var bytes = require("bytes");

function analyze(data) {
	console.log("analyzing bundle");

	console.log(data.substr(0, 6));

	var parsed = JSON.parse(data);

	parsed.modules.sort(function (m1, m2) {
		return m1.size - m2.size;
	});

	var smaller = parsed.modules.map(function (m) {
		return {
			identifier: m.identifier,
			size: bytes.format(m.size)
		};
	});

	console.log(JSON.stringify(smaller, null, "  "));
}

var data = "";

process.stdin.resume();
process.stdin.setEncoding("utf8");

process.stdin.on("data", function(chunk) {
	data += chunk;
});

process.stdin.on("end", function() {
	analyze(data);
});
