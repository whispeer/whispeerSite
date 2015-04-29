define([
	"jquery",
	"angular",
	"app",
	"routes",
	"libs/canvas-toBlob",
	"angularTouch"
], function($, angular, app) {
	"use strict";

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
		globalErrors.push({
			str: str,
			file: file,
			line: line,
			col: col,
			e: e
		});
	};

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
