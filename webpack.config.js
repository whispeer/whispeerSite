var path = require("path");
var webpack = require("webpack");

module.exports = {
	plugins: [
		new webpack.ProvidePlugin({
			$: "jquery",
			"window.jQuery": "jquery"
		})
	],
	resolve: {
		root: [
			path.resolve("./assets/js")
		],
		alias: {
			text: "bower/requirejs-plugins/lib/text",
			json: "bower/requirejs-plugins/src/json",

			step: "step/lib/step",
			whispeerHelper: "helper/helper",
			amanda: "bower/amanda/releases/latest/amanda",
			angular: "bower/angular/angular",
			angularRoute: "bower/angular-route/angular-route",
			angularUiRouter: "bower/angular-ui-router/release/angular-ui-router",
			angularTouch: "bower/angular-touch/angular-touch",
			bluebird: "bower/bluebird/js/browser/bluebird",
			jquery: "bower/jquery/dist/jquery",
			requirejs: "bower/requirejs/require",
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
	module: {
		loaders: [
			{ test: /angular/, loader: "exports?angular!imports?jquery" }
		]
	},
	entry: {
		main: "./assets/js/main.js",
		worker: "./assets/js/worker/worker.js"
	},
	output: {
		path: __dirname,
		filename: "[name].bundle.js"
	}
};
