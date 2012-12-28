"use strict";

var page = process.argv[2];
var subView = process.argv[3];

var fs = require('fs');

function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

if (typeof page === "string") {
	if (!fs.existsSync("views/" + page)) {
		fs.mkdirSync("views/" + page);
	}

	//create overall.js with right content ifn
	if (!fs.existsSync("views/" + page + "/overall.js")) {
		var data = fs.readFileSync("views/overallExample.js", 'utf8');
		var data = data.replace(/\$NAME\$/g, page);
		fs.writeFileSync("views/" + page + "/overall.js", data);
	}

	//create menu.view with right content ifn
	if (!fs.existsSync("views/" + page + "/menu.view")) {
		fs.writeFileSync("views/" + page + "/menu.view", "");
	}

	if (typeof subView === "string") {
		if (!fs.existsSync("views/" + page + "/" + subView)) {
			fs.mkdirSync("views/" + page + "/" + subView);

			var data = fs.readFileSync("views/menuExample.view", 'utf8');
			var data = data.replace(/\$NAME\$/g, subView);
			fs.appendFileSync("views/" + page + "/menu.view", data);
		}

		//create overall.js with right content ifn
		if (!fs.existsSync("views/" + page + "/" + subView + "/" + subView + ".js")) {
			var data = fs.readFileSync("views/subViewExample.js", 'utf8');
			var data = data.replace(/\$NAME\$/g, subView + capitaliseFirstLetter(page));
			fs.writeFileSync("views/" + page + "/" + subView + "/" + subView + ".js", data);
		}

		//create menu.view with right content ifn
		if (!fs.existsSync("views/" + page + "/" + subView + "/" + subView + ".view")) {
			fs.writeFileSync("views/" + page + "/" + subView + "/" + subView + ".view", "");
		}
	}
} else {
	console.log("Wrong arguments: node generateView.js <page> <subView>");
	console.log("Subview is optional!");
}