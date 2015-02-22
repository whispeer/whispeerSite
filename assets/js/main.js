var WEB_SOCKET_SWF_LOCATION = "libs/WebSocketMain.swf";
var startup = new Date().getTime();

void(startup);
void (WEB_SOCKET_SWF_LOCATION);

if (window.location.href.indexOf("file:///") === 0) {
	var base = window.location.href.replace("file://", "");
	base = base.replace(/\#\!(.*)/g, "");
	document.getElementsByTagName("base")[0].setAttribute("href", base);
}

var globalErrors = [];

window.onerror = function (str, file, line, col, e) {
	"use strict";

	errors.push({
		str: str,
		file: file,
		line: line,
		col: col,
		e: e
	});
};

requirejs.config({
	paths: {
		step: "step/lib/step",
		whispeerHelper: "helper/helper",
		amanda: "bower/amanda/releases/latest/amanda",
		angular: "bower/angular/angular",
		angularRoute: "bower/angular-route/angular-route",
		angularTouch: "bower/angular-touch/angular-touch",
		bluebird: "bower/bluebird/js/browser/bluebird",
		jquery: "bower/jquery/jquery",
		requirejs: "bower/requirejs/require",
		socket: "bower/socket.io-client/socket.io",
		socketStream: "libs/socket.io-stream",
		qtip: "bower/qtip2/basic/jquery.qtip",
		imageLib: "bower/blueimp-load-image/js/load-image"
	},
	baseUrl: "assets/js",
	shim: {
		angular: {
			deps: [
				"jquery"
			],
			exports: "angular"
		},
		"angularRoute": {
			deps: [
				"angular"
			]
		},
		"angularTouch": {
			deps: [
				"angular"
			]
		}
	},
	priority: [
		"angular"
	]
});

requirejs( [
	"jquery",
	"angular",
	"app",
	"routes",
	"libs/canvas-toBlob",
	"angularTouch"
], function($, angular, app) {
	"use strict";
	$(document).ready(function () {
		var $html = $("html");
		angular.bootstrap($html, [app.name]);
		// Because of RequireJS we need to bootstrap the app app manually
		// and Angular Scenario runner won"t be able to communicate with our app
		// unless we explicitely mark the container as app holder
		// More info: https://groups.google.com/forum/#!msg/angular/yslVnZh9Yjk/MLi3VGXZLeMJ
		$html.addClass("ng-app");
	});
});