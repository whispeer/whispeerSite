"use strict";

window.startup = new Date().getTime();

const $ = require("jquery")
const angular = require("angular")

const app = require("app")

const Bluebird = require("bluebird")

Bluebird.config({
	warnings: false,
	longStackTraces: false,
	cancellation: false,
	monitoring: false
})

require("./config/routesConfig")
require("i18n/localizationConfig")

require("asset/toBlobPolyfill")
require("angularTouch")

$(document).ready(function () {
	var $html = $("html");
	angular.bootstrap($html, [app.name], { strictDi: true });
	// Because of RequireJS we need to bootstrap the app app manually
	// and Angular Scenario runner won"t be able to communicate with our app
	// unless we explicitely mark the container as app holder
	// More info: https://groups.google.com/forum/#!msg/angular/yslVnZh9Yjk/MLi3VGXZLeMJ
	$html.addClass("ng-app");
});
