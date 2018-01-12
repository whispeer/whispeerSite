const express = require("express");
const webpack = require("webpack");
const webpackConfig = require("./webpack.config.js");
const webpackMiddleware = require("webpack-dev-middleware");

const locales = ["en", "de"];

const angular = [
	"user",
	"messages",
	"circles",
	"main",
	"friends",
	"settings",
	"start",
	"notificationCenter",
	"setup",
	"invite",
	"backup",
	"post",
	"fund",
	"search",
]

const ownIndexFile = [
	"recovery",
	"token",
	"verifyMail"
]

const log = (line) => {
	console.log(line)
}

const getPossibleLocale = (acceptLanguageHeader) => {
	const languages = acceptLanguageHeader.split(",")
		.map((lang) => lang.split(";")[0].split("-")[0])
		.filter((lang) => locales.indexOf(lang) !== -1)

	return languages[0] || locales[0];
}

const app = express();
const router = express.Router();

var WHISPEER_PORT = process.env.WHISPEER_PORT || 8080;

process.argv.forEach(function(val, index, array) {
	// let's make nils happy
	if (val === "--port") {
		WHISPEER_PORT = array[index + 1];
	} else {
		// or just.. don't
		val = val.split("=");
		if (val[0] === "--port") {
			WHISPEER_PORT = val[1];
		}
	}
});

log("Starting webserver...");

const mid = webpackMiddleware(webpack(webpackConfig), {
	publicPath: "/assets",
})

router.use("/", express.static("static"))
router.use("/assets", express.static("assets"))
router.all("*", function (req, res, next) {
	const paths = req.originalUrl.split(/\/|\?/).filter((path) => path !== "")

	const redirectLocale = getPossibleLocale(req.get("accept-language"));

	const possibleLocale = paths[0];
	const hasLocale = locales.indexOf(possibleLocale) !== -1;

	if (!hasLocale) {
		return res.redirect(`/${redirectLocale}${req.originalUrl}`)
	}

	paths.shift()

	if (ownIndexFile.indexOf(paths[0]) > -1) {
		req.url = `/assets/../${possibleLocale}/${paths[0]}/index.html`
		console.log(req.url)
		return mid(req, res, next)
	}

	if (angular.indexOf(paths[0]) > -1) {
		req.url = "/assets/../index.html"
		return mid(req, res, next)
	}

	next();
})

app.use(mid)
app.use(router)
app.listen(WHISPEER_PORT);

log("Whispeer web server started on port " + WHISPEER_PORT);
