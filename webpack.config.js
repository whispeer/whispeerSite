var path = require("path");
var webpack = require("webpack");

process.env.WHISPEER_ENV = process.env.WHISPEER_ENV || "development";

var UnusedFilesWebpackPlugin = require("unused-files-webpack-plugin")["default"];

var plugins = [
	new webpack.optimize.CommonsChunkPlugin({
		names: "commons",
		filename: "commons.bundle.js",

		minChunks: 2,
		chunks: ["login", "register", "main"]
	}),
	new webpack.optimize.MinChunkSizePlugin({
		minChunkSize: 2048
	}),
	new webpack.DefinePlugin({
		"WHISPEER_ENV": JSON.stringify(process.env.WHISPEER_ENV)
	}),
	new UnusedFilesWebpackPlugin({
		globOptions: {
			ignore: [
				"node_modules/**/*",
				"bower/**/*",
				"**/*.json",
				"**/*.md",
				"**/*.markdown",
				"build/*",
				"crypto/sjclWorker.js",
				"worker/worker.js",
			]
		}
	}),
];

var bail = false;

if (process.env.WHISPEER_ENV !== "development") {
	plugins.push(new webpack.optimize.UglifyJsPlugin());
	bail = true;
}

var config = {
	context: path.resolve("./assets/js"),
	plugins: plugins,
	devtool: "inline-source-map",
	bail: bail,
	resolve: {
		root: [
			path.resolve("./assets/js")
		],
		extensions: ["", ".webpack.js", ".web.js", ".ts", ".tsx", ".js"],
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
	module: {
		loaders: [
			{ test: /angular/, loader: "exports?angular!imports?jquery" },
			{ test: /localizationModule/, loader: "imports?jquery" },
			{ test: /\.html$/, loader: "ngtemplate?relativeTo=assets/views/!html?-attrs" },
			// all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
			{ test: /\.tsx?$/, loader: "ts-loader" }
		]
	},
	entry: {
		login: "./login/loginMain.js",
		register: "./register/registerMain.js",
		main: "./main.js",
		recovery: "./recovery/recoveryMain.js",
		verifyMail: "./verifyMail/verifyMailMain.js"
	},
	output: {
		path: path.resolve("./assets/js/build/"),
		publicPath: "/assets/js/build/",
		filename: "[name].bundle.js"
	}
};

module.exports = config;
