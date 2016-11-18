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
	resolve: {
		root: [
			path.resolve("./assets/js")
		],
		alias: {
			text: "bower/requirejs-plugins/lib/text",
			json: "bower/requirejs-plugins/src/json",

			whispeerHelper: "helper/helper",
			amanda: "bower/amanda/releases/latest/amanda",
			angular: "bower/angular/angular",
			angularUiRouter: "bower/angular-ui-router/release/angular-ui-router",
			angularTouch: "bower/angular-touch/angular-touch",
			bluebird: "bower/bluebird/js/browser/bluebird",
			jquery: "bower/jquery/dist/jquery",
			socket: "bower/socket.io-client/socket.io",
			qtip: "bower/qtip2/basic/jquery.qtip",
			imageLib: "bower/blueimp-load-image/js/load-image",
			localizationModule: "bower/angular-i18n-directive/src/localizationModule",
			workerQueue: "worker/worker-queue",
			PromiseWorker: "worker/worker-loader",
			dexie: "bower/dexie/dist/dexie",
			debug: "bower/visionmedia-debug/dist/debug",
			emojify: "bower/js-emoji/lib/emoji",
		}
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
