requirejs.config({
	paths: {
		step: "step/lib/step",
		whispeerHelper: "helper/helper",
		angular: "bower/angular/angular",
		bluebird: "bower/bluebird/js/browser/bluebird",
		jquery: "bower/jquery/jquery",
		requirejs: "bower/requirejs/require",
		socket: "bower/socket.io-client/socket.io",
		qtip: "bower/qtip2/basic/jquery.qtip",
		localizationModule: "bower/angular-i18n-directive/src/localizationModule",
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
		}
	},
	priority: [
		"angular"
	]
});

requirejs(["login/loginMain"]);
