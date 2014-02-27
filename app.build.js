({
    appDir: "./",
	paths: {
		jquery: "libs/jquery-1.9.1",
		angular: "libs/angular",
		angularRoute: "libs/angular-route",
		socket: "libs/socket.io",
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
    modules: [
        {
            name: "main"
        }
    ]
})