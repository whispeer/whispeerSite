/* jshint -W097 */
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
grunt.loadNpmTasks("grunt-angular-templates");

grunt.initConfig({
	assetHash: {
		bundles: [

			"assets/js/build/commons.bundle.js",
			"assets/js/build/login.bundle.js",
			"assets/js/build/main.bundle.js",
			"assets/js/build/register.bundle.js",
			"assets/js/build/recovery.bundle.js",
			"assets/js/build/verifyMail.bundle.js"
		],
		worker: [
			"assets/js/build/worker.bundle.js",
		]
	},
	includes: {
		compile: {
			scripts: ["commons.bundle", "main.bundle"],
			sources: ["index.html"]
		},
		register: {
			scripts: ["commons.bundle", "register.bundle"],
			sources: ["static/en/register/index.html", "static/de/register/index.html"]
		},
		login: {
			scripts: ["commons.bundle", "login.bundle"],
			sources: ["static/en/loginframe/index.html", "static/de/loginframe/index.html", "static/en/login/index.html", "static/de/login/index.html"]
		},
		recovery: {
			scripts: ["commons.bundle", "recovery.bundle"],
			sources: ["static/en/recovery/index.html", "static/de/recovery/index.html"]
		},
		verify: {
			scripts: ["commons.bundle", "verifyMail.bundle"],
			sources: ["static/en/verifyMail/index.html", "static/de/verifyMail/index.html"]
		}
	},
	concurrent: {
		development: {
			tasks: ["server", "watch", "run:webpackWatch", "run:webpackWorkerWatch"],
			options: {
				logConcurrentOutput: true
			}
		}
	},
	jshint: {
		all: {
			src: ["Gruntfile.js", "assets/js/**/*.js"],
			options: {
				reporterOutput: "",
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
		webpackWatch: {
			cmd: "webpack",
			args: [
				"--watch"
			]	
		},
		webpackWorkerWatch: {
			cmd: "webpack",
			args: [
				"--watch",
				"--config",
				"webpack.worker.config.js"
			]	
		},
		webpack: {
			cmd: "webpack"
		},
		webpackWorker: {
			cmd: "webpack",
			args: [
				"--config",
				"webpack.worker.config.js"
			]	
		},
		buildsjcl: {
			cmd: "./scripts/build-sjcl.sh"
		}
	},
	"bower-install-simple": {
		prod: {}
	},
	clean: {
		build: ["assets/js/build/*.js", "manifest.mf", "assets/commit.sha", "assets/files.json"]
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

grunt.task.registerTask("workerInclude", function () {
	var workerScriptPath = grunt.file.expand("assets/js/build/*.js").filter(function (script) {
		return script.indexOf("worker") > -1;
	})[0];

	var conf = JSON.parse(grunt.file.read("assets/js/conf/production.config.json"));

	conf.workerScript = workerScriptPath;

	grunt.file.write("assets/js/conf/production.config.json", JSON.stringify(conf, null, "	"));
});

grunt.task.registerMultiTask("includes", "Add the correct script include to the index.html", function () {
	var scripts = grunt.file.expand("assets/js/build/*.js");

	var files = this.data.sources;
	var scriptNames = this.data.scripts;

	files.forEach(function (file) {
		var fileContent = grunt.file.read(file);

		scriptNames.forEach(function (script) {
			var scriptPath = scripts.filter(function (fileName) {
				return fileName.replace("assets/js/build", "").indexOf(script) > -1;
			})[0];

			var regex = new RegExp("assets/js/build/" + script + "[^>]*\.js");

			fileContent = fileContent.replace(regex, scriptPath);
		});

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

function getCurrentCommitHash() {
	var git = require("git-rev-sync");
	return git.long();
}

grunt.task.registerTask("workerCache", "Write worker cache and commit sha", function () {
	var cacheFiles = [
		"assets/js/build/commons*",
		"assets/js/build/main*",
		"assets/js/build/login*",
		"assets/js/build/worker*",
	];

	var preload = [
		"assets/js/bower/requirejs/require.js",

		"assets/img/logo.svg",
		"assets/data/newMessage.ogg",

		"assets/css/style.css",
		"index.html",
		"assets/img/loader.gif",
		"assets/img/user.png",
		"assets/img/circle.png",

		"assets/js/i18n/l_en.json",
		"assets/js/i18n/l_de.json",

		"assets/fonts/fontawesome-webfont.ttf?v=4.6.3",
		"assets/fonts/fontawesome-webfont.woff2?v=4.6.3",
		"assets/fonts/SourceSansPro-Semibold.ttf",
		"assets/fonts/SourceSansPro-Regular.ttf",
		"assets/img/favicons/favicon.png",

		"en",
		"de",
		"en/loginframe/",
		"de/loginframe/",

		"assets/images/videoThumb.jpg",

		"en/login",
		"de/login",

		"assets/views/directives/saveButton.html",

		"assets/js/b2c.js",
		"assets/css/b2c.css",
		"assets/css/static.css",
	];

	var indexRedirects = [
		//basic routes
		"setup",
		"backup",
		"main",
		"friends",
		"acceptInvite",
		"search",

		//complex routes
		"post",
		"settings",
		"invite",
		"fund",
		"logout",
		"messages",
		"circles",
		"user"
	];

	var filesJSON = {
		preload: preload.concat.apply(preload, cacheFiles.map(function (cacheFile) {
			return grunt.file.expand(cacheFile);
		})).map(function (cacheFile) {
			return "/" + cacheFile;
		}),
		redirect: indexRedirects.map(function (redir) {
			return {
				from: "^/[^/]*/" + redir + "(\/.*)?$",
				to: "index.html"
			};
		}).concat([
			{
				from: "^/en/$",
				to: "/en"
			},
			{
				from: "/de/$",
				to: "/de"
			}
		])
	};

	grunt.file.write("assets/files.json", JSON.stringify(filesJSON));
	grunt.file.write("assets/commit.sha", getCurrentCommitHash());
});

function sha1File(filename) {
	var crypto = require("crypto");
	var fs = require("fs");

	return new Bluebird(function (resolve) {
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

grunt.registerTask("build:development", [
	"clean",
	"copy",
	"bower-install-simple",
	"less",
	"autoprefixer",
	"run:buildsjcl",
	"run:webpackWorker",
	"run:webpack",
	"includes",
]);

grunt.registerTask("build:production",  [
	"clean",
	"jshint",
	"copy",
	"bower-install-simple",
	"less",
	"autoprefixer",
	"run:buildsjcl",

	"run:webpackWorker",
	"assetHash:worker",
	"workerInclude",

	"run:webpack",
	"assetHash:bundles",

	"includes",
	"workerCache"
]);

grunt.registerTask("server", "Start the whispeer web server.", require("./webserver"));
