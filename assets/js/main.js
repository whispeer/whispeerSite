var WEB_SOCKET_SWF_LOCATION = "libs/WebSocketMain.swf";
var startup = new Date().getTime();

void(startup);
void (WEB_SOCKET_SWF_LOCATION);

if (window.location.href.indexOf("file:///") === 0) {
	var base = window.location.href.replace("file://", "");
	base = base.replace(/\#\!(.*)/g, "");
	document.getElementsByTagName("base")[0].setAttribute("href", base);
}

requirejs.config({
	paths: {
		jquery: "libs/jquery-1.9.1",
		qtip: "libs/jquery.qtip",
		angular: "libs/angular",
		angularRoute: "libs/angular-route",
		socket: "libs/socket.io",
		socketStream: "libs/socket.io-stream",
		step: "step/lib/step",
		whispeerHelper: "helper/helper",
		amanda: "libs/amanda"
	},
	baseUrl: "assets/js",
    shim: {
        "angular": {
            deps: ["jquery"],
            exports: "angular"
        },
        "angularRoute":{
            deps:["angular"]
        }

    },
    /*
	shim: {
		"angular" : {"exports" : "angular"},
		"angularMocks": {deps:["angular"], "exports":"angular.mock"}
	},*/
	priority: [
		"angular"
	]
});

requirejs( [
	"jquery",
	"angular",
	"app",
	"routes",
	"libs/canvas-toBlob"
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