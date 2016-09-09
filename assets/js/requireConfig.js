requirejs.config({
	paths: {
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
		workerQueue: "bower/worker-queue.js/src/index",
		PromiseWorker: "bower/require-promise-worker.js/src/index",
		dexie: "bower/dexie/dist/dexie",
		debug: "bower/visionmedia-debug/dist/debug",
		emojify: "bower/js-emoji/lib/emoji",
	},
	baseUrl: "assets/js",
	shim: {
		dexie: {
			exports: "Dexie"
		},
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
		"angularUiRouter": {
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

window.startup = new Date().getTime();

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

var initialElement = document.querySelectorAll("script[data-initial]");

if (initialElement.length === 1) {
	var initialModule = initialElement[0].getAttribute("data-initial");
	requirejs([initialModule]);
}
