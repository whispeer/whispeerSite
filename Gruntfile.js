"use strict";

var grunt = require("grunt");

grunt.loadNpmTasks("grunt-contrib-copy");
grunt.loadNpmTasks("grunt-concurrent");
grunt.loadNpmTasks("grunt-run");

grunt.initConfig({
	concurrent: {
		development: {
			tasks: ["run:serve", "run:jekyllWatch"],
			options: {
				logConcurrentOutput: true
			}
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
		serve: {
			cmd: "npm",
			args: [
				"start"
			]
		},
		webpackProduction: {
			cmd: "webpack",
			args: [
				"-p"
			]
		},
		jekyllWatch: {
			cmd: "npm",
			args: [
				"run",
				"build:static:watch",
			]
		}
	}
})

grunt.registerTask("default", ["build:pre", "concurrent:development"]);

grunt.registerTask("build:pre", [
	"run:clean",
	"copy",
]);

grunt.registerTask("build:production",  [
	"run:lint",
	"build:pre",

	"run:webpackProduction"
]);
