"use strict";

var grunt = require("grunt");

grunt.loadNpmTasks("grunt-contrib-jshint");
grunt.loadNpmTasks("grunt-contrib-less");
grunt.loadNpmTasks("grunt-autoprefixer");
grunt.loadNpmTasks("grunt-contrib-watch");
grunt.loadNpmTasks("grunt-browser-sync");
grunt.loadNpmTasks("grunt-contrib-copy");
grunt.loadNpmTasks("grunt-concurrent");
grunt.loadNpmTasks("grunt-bower-install-simple");
grunt.loadNpmTasks("grunt-run");
grunt.loadNpmTasks("grunt-contrib-requirejs");
grunt.loadNpmTasks("grunt-contrib-clean");

var libs = [
	"step",
	"whispeerHelper",
	"angular",
	"bluebird",
	"requirejs",
	"socket",
	"socketStream",
	"workerQueue",
	"PromiseWorker",
	"debug",
	"libs/sjcl",
	"jquery"
];

var extend = require("extend");

var baseConfig = {
	mainConfigFile: "./assets/js/requireConfig.js",

	baseUrl: "./assets/js",

	optimize: "none",
	preserveLicenseComments: true,
	generateSourceMaps: false,
};

grunt.initConfig({
	requirejs: {
		lib: {
			options: extend({}, baseConfig, {
				out: "assets/js/build/lib.js",

				optimize: "uglify2",

				include: ["requirejs"].concat(libs)
			})
		},
		compile: {
			options: extend({}, baseConfig, {
				out: "assets/js/build/build.js",

				name: "main",
				insertRequire: ["main"],
				include: ["requireConfig"],
				excludeShallow: libs
			})
		},
		register: {
			options: extend({}, baseConfig, {
				out: "assets/js/build/register.js",

				name: "register/registerMain",
				insertRequire: ["register/registerMain"],
				include: ["requireConfig"],
				excludeShallow: libs
			})
		},
		login: {
			options: extend({}, baseConfig, {
				out: "assets/js/build/login.js",

				name: "login/loginMain",
				insertRequire: ["login/loginMain"],
				include: ["requireConfig"],
				excludeShallow: libs
			})
		},
		recovery: {
			options: extend({}, baseConfig, {
				out: "assets/js/build/recovery.js",

				name: "recovery/recoveryMain",
				insertRequire: ["recovery/recoveryMain"],
				include: ["requireConfig"],
				excludeShallow: libs
			})
		},
		verify: {
			options: extend({}, baseConfig, {
				out: "assets/js/build/verifyMail.js",

				name: "verifyMail/verifyMailMain",
				insertRequire: ["verifyMail/verifyMailMain"],
				include: ["requireConfig"],
				excludeShallow: libs
			})
		}
	},
	includes: {
		compile: {
			scripts: ["assets/js/build/lib.js", "assets/js/build/build.js"],
			sources: ["index.html"]
		},
		register: {
			scripts: ["assets/js/build/lib.js", "assets/js/build/register.js"],
			sources: ["static/en/register/index.html", "static/de/register/index.html"]
		},
		login: {
			scripts: ["assets/js/build/lib.js", "assets/js/build/login.js"],
			sources: ["static/en/loginframe/index.html", "static/de/loginframe/index.html", "static/en/login/index.html", "static/de/login/index.html"]
		},
		recovery: {
			scripts: ["assets/js/build/lib.js", "assets/js/build/recovery.js"],
			sources: ["static/en/recovery/index.html", "static/de/recovery/index.html"]
		},
		verify: {
			scripts: ["assets/js/build/lib.js", "assets/js/build/verifyMail.js"],
			sources: ["static/en/verifyMail/index.html", "static/de/verifyMail/index.html"]
		}
	},
	concurrent: {
		development: {
			tasks: ["server", "watch"],
			options: {
				logConcurrentOutput: true
			}
		}
	},
	jshint: {
		all: {
			src: ["Gruntfile.js", "assets/js/**/*.js"],
			options: {
				jshintrc: true
			}
		}
	},
	less: {
		development: {
			options: {
				paths: ["assets/less"],
				sourceMap: true,
				sourceMapFilename: "assets/css/style.css.map",
				sourceMapRootpath: "/"
			},
			files: {
				"assets/css/style.css": "assets/less/style.less",
				"assets/css/static.css": "assets/less/static.less",
				"assets/css/style-b2b.css": "assets/less/style-b2b.less"
			}
		}
	},
	autoprefixer: {
		options: {
			browsers: ["last 2 versions", "ie 9", "> 1% in DE"],
			remove: true
		},
		style: {
			expand: true,
			flatten: true,
			src: "assets/css/*.css",
			dest: "assets/css/"
		}
	},
	copy: {
		vendor: {
			files: [
				{
					expand: true,
					cwd: "node_modules/font-awesome/css/",
					src: "font-awesome.min.css",
					dest: "assets/less/base/addons/",
					rename: function (dest, src) {
						return dest + src.replace(".min.css", ".less");
					}
				},
				{
					expand: true,
					cwd: "node_modules/font-awesome/css/",
					src: "font-awesome.min.css",
					dest: "staticRaw/_sass/",
					rename: function (dest, src) {
						return dest + src.replace(".min.css", ".scss");
					}
				},
				{
					expand: true,
					cwd: "node_modules/font-awesome/fonts/",
					src: "**",
					dest: "assets/fonts/",
					filter: "isFile"
				},
				{
					expand: true,
					cwd: "node_modules/normalize.css/",
					src: "normalize.css",
					dest: "assets/less/base/addons/",
					rename: function (dest, src) {
						return dest + src.replace(".css", ".less");
					}
				},
				{
					expand: true,
					cwd: "node_modules/normalize.css/",
					src: "normalize.css",
					dest: "staticRaw/_sass/",
					rename: function (dest, src) {
						return dest + src.replace(".css", ".scss");
					}
				}
			]
		}
	},
	watch: {
		scripts: {
			files: ["assets/less/**/*.less"],
			tasks: ["less", "autoprefixer"],
			options: {
				spawn: false
			}
		}
	},
	browserSync: {
		dev: {
			bsFiles: {
				src: "assets/css/*.css"
			},
			options: {
				port: 3001,
				watchTask: true
			}
		}
	},
    run: {
        buildsjcl: {
            cmd: "./scripts/build-sjcl.sh"
        }
    },
	"bower-install-simple": {
		prod: {}
	},
	manifest: {
		production: {
			destination: "./manifest.mf",
			source: "./templates/manifest.mf.template",
			config: "./assets/js/config"
		}
	},
	clean: {
		build: ["assets/js/build/*.js", "manifest.mf"]
	},
	fileToHashName: {
		build: {
			source: "assets/js/build/build.js"
		}
	}
});


grunt.task.registerTask("buildDate", function () {
	var buildTime = new Date();
	var buildDate = buildTime.getFullYear().toString() + (buildTime.getMonth() + 1) + buildTime.getDate().toString();

	var fs = require("fs");
	var rootController = fs.readFileSync("./assets/js/config.js").toString();
	rootController = rootController.replace(/var buildDate \= \"[0-9\-]*\";/, "var buildDate = \"" + buildDate + "\";");
	fs.writeFileSync("./assets/js/config.js", rootController);
});

grunt.task.registerMultiTask("includes", "Add the correct script include to the index.html", function () {
	var files = this.data.sources;
	var scripts = this.data.scripts;

	var includes = scripts.map(function (script) {
		return "<script src='" + script + "'></script>";
	}).join("\n");

	files.forEach(function (file) {
		var fileContent = grunt.file.read(file);
		fileContent = fileContent.replace(/<script.*/, includes);
		grunt.file.write(file, fileContent);
	});
});

grunt.task.registerTask("scriptInclude", "Add the correct script include to the index.html", function () {
	var include = grunt.file.expand("assets/js/build/*.js");
	if(include.length === 1) {
		var index = grunt.file.read("index.html");

		index = index.replace(/<script.*/, "<script src='" + include[0] + "'></script>");
		grunt.file.write("index.html", index);
	} else {
		throw new Error("No build file!");
	}
});

grunt.task.registerMultiTask("fileToHashName", "Hash a file and rename the file to the hash", function () {
	var done = this.async();

	var filename = this.data.source;
	var crypto = require("crypto");
	var fs = require("fs");

	var shasum = crypto.createHash("sha1");

	var s = fs.ReadStream(filename);
	s.on("data", function(d) {
		shasum.update(d);
	});

	s.on("end", function() {
		var hash = shasum.digest("hex");
		var newFileName = filename.replace(/\/[^/]*.js/, "/" + hash + ".js");

		fs.renameSync(filename, newFileName);

		done();
	});
});

grunt.task.registerMultiTask("manifest", "Build the manifest file.", function () {
	var destination = this.data.destination;
	var source = this.data.source;
	var config = require(this.data.config);

	require("./scripts/build_appcache")(source, destination, config, this.async());
});

grunt.registerTask("default", ["build:development", "browserSync", "concurrent:development"]);

grunt.registerTask("build:development", ["clean", "copy", "bower-install-simple", "less", "autoprefixer", "run:buildsjcl"]);
grunt.registerTask("build:production",  ["clean", "copy", "bower-install-simple", "less", "autoprefixer", "requirejs", "run:buildsjcl", "buildDate", "includes"]);

grunt.registerTask("server", "Start the whispeer web server.", require("./webserver"));
