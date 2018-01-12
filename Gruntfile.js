"use strict";

var grunt = require("grunt");

var business = !!process.env.WHISPEER_BUSINESS

grunt.loadNpmTasks("grunt-contrib-less");
grunt.loadNpmTasks("grunt-autoprefixer");
grunt.loadNpmTasks("grunt-contrib-watch");
grunt.loadNpmTasks("grunt-contrib-copy");
grunt.loadNpmTasks("grunt-concurrent");
grunt.loadNpmTasks("grunt-run");
grunt.loadNpmTasks("grunt-contrib-clean");

grunt.initConfig({
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
			tasks: ["server", "watch", "run:jekyllWatch"],
			options: {
				logConcurrentOutput: true
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
				"assets/css/style.css": business ? "assets/less/business.less" : "assets/less/style.less",
				"assets/css/static.css": business ? "assets/less/static_business.less" : "assets/less/static.less",
			}
		}
	},
	autoprefixer: {
		options: {
			browsers: ["last 2 versions", "ie >= 11", "> 0.5% in DE", "iOS > 7"],
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
	run: {
		lint: {
			cmd: "npm",
			args: [
				"run",
				"lint"
			]
		},
		clean: {
			cmd: "npm",
			args: [
				"run",
				"clean"
			]
		},
		webpackProduction: {
			cmd: "webpack",
			args: [
				"-p"
			]
		},
		jekyllWatch: {
			cmd: "bundle",
			args: [
				"exec",
				"jekyll",
				"build",
				"--watch"
			]
		}
	}
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

grunt.registerTask("default", ["build:pre", "concurrent:development"]);

grunt.registerTask("build:pre", [
	"run:clean",
	"copy",
	"less",
	"autoprefixer",
]);

grunt.registerTask("build:production",  [
	"run:lint",
	"build:pre",

	"run:webpackProduction",

	"includes"
]);

grunt.registerTask("server", "Start the whispeer web server.", require("./webserver"));
