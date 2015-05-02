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
		imageLib: "bower/blueimp-load-image/js/load-image",
		localizationModule: "bower/angular-i18n-directive/src/localizationModule",
		workerQueue: "bower/worker-queue.js/src/index",
		PromiseWorker: "bower/require-promise-worker.js/src/index",
		dexie: "bower/dexie/dist/latest/Dexie",
		debug: "bower/visionmedia-debug/dist/debug"
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

requirejs(["main"]);
