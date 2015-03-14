({
    appDir: "./",
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
        PromiseWorker: "bower/require-promise-worker.js/src/index"

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
	],
    dir: "./appdirectory-build",
    optimize: "none",
    preserveLicenseComments: true,
    generateSourceMaps: false,
    fileExclusionRegExp: /^node_modules$/,
    modules: [
        {
            name: "main"
        }
    ]
})