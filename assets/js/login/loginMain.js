var WEB_SOCKET_SWF_LOCATION = "libs/WebSocketMain.swf";
var startup = new Date().getTime();

if (window.location.href.indexOf("file:///") === 0) {
	var base = window.location.href.replace("file://", "");
	base = base.replace(/\#\!(.*)/g, "");
	document.getElementsByTagName("base")[0].setAttribute("href", base);
}

/*
	Console-polyfill. MIT license.
	https://github.com/paulmillr/console-polyfill
	Make it safe to do console.log() always.
*/
(function(con) {
	"use strict";
	var dummy = function() {};

	var methods =
		["assert","clear","count","debug","dir","dirxml","error","exception","group","groupCollapsed",
		"groupEnd","info","log","markTimeline","profile","profileEnd","table","time","timeEnd",
		"timeStamp","trace","warn"];

	con.memory = {};

	var i;
	for (i = 0; i < methods.length; i += 1) {
		con[methods[i]] = con[methods[i]] || dummy;
	}
})(this.console = this.console || {}); // Using `this` for web workers.

var globalErrors = [];

window.onerror = function (str, file, line, col, e) {
	"use strict";
	globalErrors.push({
		str: str,
		file: file,
		line: line,
		col: col,
		e: e
	});
};

define([
	"jquery",
	"angular",
	"login/loginModule",
	"login/loginController",
	"localizationModule"
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
