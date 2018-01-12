"use strict";

const grunt = require("grunt");

grunt.loadNpmTasks("grunt-contrib-copy");
grunt.loadNpmTasks("grunt-run");

grunt.initConfig({
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
		development: {
			cmd: "npm",
			args: [
				"run",
				"development"
			]
		},
		webpackProduction: {
			cmd: "webpack",
			args: [
				"-p"
			]
		},
	}
})

grunt.registerTask("default", ["run:development"]);

grunt.registerTask("build:pre", [
	"run:clean",
	"copy",
]);

grunt.registerTask("build:production",  [
	"run:lint",
	"build:pre",

	"run:webpackProduction"
]);
