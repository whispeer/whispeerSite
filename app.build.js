({
    appDir: "./",
	paths: {
		jquery: "libs/jquery-1.9.1",
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
	priority: [
		"angular"
	],
    dir: "../appdirectory-build",
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