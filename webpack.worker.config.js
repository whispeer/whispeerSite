var path = require("path");
var webpack = require("webpack");

process.env.WHISPEER_ENV = process.env.WHISPEER_ENV || "development";

var plugins = [];

if (process.env.WHISPEER_ENV !== "development") {
	plugins.push(new webpack.optimize.UglifyJsPlugin());
}

module.exports = {
	context: path.resolve("./assets/js"),
	plugins: plugins,
	module: {
		noParse: [
			/sjcl\.js$/,
		]
	},
	resolve: {
		root: [
			path.resolve("./assets/js")
		]
	},
	entry: {
		worker: "./worker/worker.js"
	},
	output: {
		path: path.resolve("./assets/js/build/"),
		publicPath: "/assets/js/build/",
		filename: "[name].bundle.js"
	}
};
