const path = require("path")
const webpack = require("webpack")

const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin
const WebpackBundleSizeAnalyzerPlugin = require("webpack-bundle-size-analyzer").WebpackBundleSizeAnalyzerPlugin
const UnusedFilesWebpackPlugin = require("unused-files-webpack-plugin")["default"]

process.env.WHISPEER_ENV = process.env.WHISPEER_ENV || "development";

const unusedFiles = new UnusedFilesWebpackPlugin({
	globOptions: {
		ignore: [
			"node_modules/**/*",
			"**/*.json",
			"**/*.md",
			"**/*.markdown",
			"build/*",
			"crypto/sjclWorker.js",
			"worker/worker.js",
			"helper/helper.d.ts",
			"helper/helper.js"
		]
	}
})

const SENTRY_KEY_DEV = "https://fbe86ea09967450fa14f299f23038a96@errors.whispeer.de/9"

const getSentryKey = () => {
	if (process.env.WHISPEER_BUSINESS) {
		return process.env.SENTRY_KEY_BUSINESS || SENTRY_KEY_DEV
	}

	return process.env.SENTRY_KEY_PROD || SENTRY_KEY_DEV
}

const packageJSON = require(path.resolve("package.json"))

const entryPoint = (entry, angular) => {
	return [
		"es6-shim",
		angular ? "./ravenConfigAngular.ts" : "./ravenConfig.ts",
		entry,
	]
}

var plugins = [
	new webpack.optimize.CommonsChunkPlugin({
		names: "commons",
		filename: "commons.bundle.js",

		minChunks: module => /node_modules/.test(module.resource),
		chunks: ["login", "register", "main", "recovery", "verifyMail"]
	}),
	new webpack.optimize.MinChunkSizePlugin({
		minChunkSize: 2048
	}),
	new webpack.DefinePlugin({
		"WHISPEER_ENV": JSON.stringify(process.env.WHISPEER_ENV),
		"WHISPEER_BUSINESS": JSON.stringify(!!process.env.WHISPEER_BUSINESS),
		"SENTRY_KEY": JSON.stringify(getSentryKey()),
		"CLIENT_INFO": JSON.stringify({
			type: "browser",
			version: packageJSON.version
		})
	}),
	new webpack.optimize.ModuleConcatenationPlugin(),
	new BundleAnalyzerPlugin({
		analyzerMode: "static",
		reportFilename: "report-chunks.html",
		openAnalyzer: false
	}),
	new WebpackBundleSizeAnalyzerPlugin("./report-size.txt"),
	unusedFiles,
];

var bail = false;
var devtool = "cheap-inline-source-map";

if (process.env.WHISPEER_ENV !== "development") {
	bail = true;
	devtool = "source-map";
}

var config = {
	context: path.resolve("./assets/js"),
	plugins,
	devtool,
	bail,
	resolve: {
		modules: [
			path.resolve("./assets/js"),
			"node_modules"
		],
		extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js"],
		alias: {
			whispeerHelper: "helper/helper",
			angularUiRouter: "angular-ui-router",
			angularTouch: "angular-touch",
			socket: "socket.io-client",
			imageLib: "blueimp-load-image",
			localizationModule: "i18n/localizationModule",
		}
	},
	module: {
		rules: [
			{ test: /\.html$/, loader: "ngtemplate-loader?relativeTo=assets/views/!html-loader?-attrs" },
			// all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
			{ test: /\.tsx?$/, loader: "ts-loader", exclude: /node_modules/ },
			{ test: /\.js$/, loader: "babel-loader", exclude: /(node_modules|bower_components)/ },
		],
		noParse: [
			/sjcl\.js$/,
			/socket\.io\.js$/,
			/visionmedia-debug\/.*debug\.js$/,
		]
	},
	entry: {
		login: entryPoint("./login/loginMain.js", true),
		register: entryPoint("./register/registerMain.js", true),
		main: entryPoint("./main.js", true),
		recovery: entryPoint("./recovery/recoveryMain.js", true),
		verifyMail: entryPoint("./verifyMail/verifyMailMain.js", true),
		token: entryPoint("./token/tokenMain.ts", false),
		sales: entryPoint("./sales/salesMain.ts", false)
	},
	output: {
		path: path.resolve("./assets/js/build/"),
		publicPath: "/assets/js/build/",
		filename: "[name].bundle.js"
	}
};

module.exports = config;
