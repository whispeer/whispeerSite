({
    appDir: "./",
	paths: {
		jquery: "libs/jquery-1.9.1",
		angular: "libs/angular",
		socket: "libs/socket.io",
		step: "step/lib/step",
		whispeerHelper: "helper/helper",
		amanda: "libs/amanda",
		valid: "validation"
	},
	baseUrl: "js",
	shim: {
		"angular" : {"exports" : "angular"},
		"angularMocks": {deps:["angular"], "exports":"angular.mock"}
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