"use strict";

var Bluebird = require("bluebird");
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
grunt.loadNpmTasks('grunt-angular-templates');

var libs = [
	"step",
	"whispeerHelper",
	"angular",
	"bluebird",
	"requirejs",
	"socket",
	"workerQueue",
	"PromiseWorker",
	"debug",
	"libs/sjcl",
	"jquery",
	"dexie",
	"amanda"
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
				include: ["requireConfig", "build/template"],
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
	assetHash: {
		compile: [
			"assets/js/build/lib.js",
			"assets/js/build/build.js",
			"assets/js/build/register.js",
			"assets/js/build/login.js",
			"assets/js/build/recovery.js",
			"assets/js/build/verifyMail.js"
		]
	},
	ngtemplates:  {
		ssn: {
			src: "assets/views/**/*.html",
			dest: "assets/js/build/template.js",
			options:  {
				bootstrap:  function(module, script) {
					return "define(['app'], function (app) { app.run(['$templateCache', function ($templateCache) { " + script + " }]); });";
				},
				htmlmin: {
					collapseBooleanAttributes:      true,
					collapseWhitespace:             true,
					removeAttributeQuotes:          true,
					removeComments:                 true, // Only if you don't use comment directives!
					removeEmptyAttributes:          true,
					removeRedundantAttributes:      true,
					removeScriptTypeAttributes:     true,
					removeStyleLinkTypeAttributes:  true
				}
			}
		}
	},
	includes: {
		compile: {
			scripts: ["lib", "build"],
			sources: ["index.html"]
		},
		register: {
			scripts: ["lib", "register"],
			sources: ["static/en/register/index.html", "static/de/register/index.html"]
		},
		login: {
			scripts: ["lib", "login"],
			sources: ["static/en/loginframe/index.html", "static/de/loginframe/index.html", "static/en/login/index.html", "static/de/login/index.html"]
		},
		recovery: {
			scripts: ["lib", "recovery"],
			sources: ["static/en/recovery/index.html", "static/de/recovery/index.html"]
		},
		verify: {
			scripts: ["lib", "verifyMail"],
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
				"assets/css/style-b2b.css": "assets/less/style-b2b.less",
				"assets/css/fund.css": "assets/less/views/fund.less"
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
	clean: {
		build: ["assets/js/build/*.js", "manifest.mf"]
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
	var scripts = grunt.file.expand("assets/js/build/*.js");

	var files = this.data.sources;
	var scriptNames = this.data.scripts;

	var includes = scriptNames.map(function (script) {
		var scriptPath = scripts.filter(function (fileName) {
			return fileName.replace("assets/js/build", "").indexOf(script) > -1;
		})[0];

		return "<script src='" + scriptPath + "'></script>";
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

function sha1File(filename) {
	var crypto = require("crypto");
	var fs = require("fs");

	return new Bluebird(function (resolve, reject) {
		var shasum = crypto.createHash("sha1");
		var s = fs.ReadStream(filename);

		s.on("data", function(d) {
			shasum.update(d);
		});

		s.on("end", function() {
			var hash = shasum.digest("hex");

			resolve(hash);
		});
	});
}

grunt.task.registerMultiTask("assetHash", "Hash a file and rename the file to the hash", function () {
	var done = this.async();

	var fs = require("fs");

	return Bluebird.resolve(this.data).map(function (filename) {
		return sha1File(filename).then(function (hash) {
			var newFileName = filename.replace(/\/([^\/]*).js/, "/$1-" + hash + ".js");

			console.log("Renaming " + filename + " to " + newFileName);

			fs.renameSync(filename, newFileName);
		});
	}).then(done);
});


grunt.registerTask("default", ["build:development", "browserSync", "concurrent:development"]);

grunt.registerTask("build:development", ["clean", "copy", "bower-install-simple", "less", "autoprefixer", "run:buildsjcl"]);
grunt.registerTask("build:production",  ["clean", "copy", "bower-install-simple", "less", "autoprefixer", "ngtemplates", "requirejs", "run:buildsjcl", "buildDate", "assetHash", "includes"]);

grunt.registerTask("server", "Start the whispeer web server.", require("./webserver"));
