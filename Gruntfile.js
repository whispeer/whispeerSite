"use strict";

var grunt = require("grunt");

grunt.loadNpmTasks("grunt-contrib-jshint");
grunt.loadNpmTasks("grunt-contrib-less");
grunt.loadNpmTasks("grunt-contrib-watch");
grunt.loadNpmTasks("grunt-browser-sync");
grunt.loadNpmTasks("grunt-contrib-copy");
grunt.loadNpmTasks("grunt-execute");
grunt.loadNpmTasks("grunt-concurrent");
grunt.loadNpmTasks("grunt-bower-install-simple");
grunt.loadNpmTasks("grunt-run");
grunt.loadNpmTasks("grunt-contrib-requirejs");

grunt.initConfig({
	requirejs: {
		compile: {
			options: {
				mainConfigFile: "./assets/js/requireConfig.js",

				out: "assets/js/build/build.js",
				baseUrl: "./assets/js",

				optimize: "none",
				preserveLicenseComments: true,
				generateSourceMaps: false,

				name: "main",
				include: ["bower/requirejs/require.js", "requireConfig"]
			}
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
				"assets/css/style.css": "assets/less/style.less"
			}
		}
	},
	copy: {
		vendor: {
			files: [
			  { expand: true,
					cwd: "node_modules/font-awesome/",
					src: ["css/**", "fonts/**"],
					dest: "assets/vendor/",
					filter: "isFile" }
			]
		}
	},
	watch: {
		scripts: {
			files: ["assets/less/**/*.less"],
			tasks: ["less"],
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
	fileToHashName: {
		build: {
			source: "assets/js/build/build.js"
		}
	}
});

grunt.registerTask("default", ["build:development", "browserSync", "concurrent:development"]);

grunt.registerTask("build:development", ["copy", "bower-install-simple", "less", "run:buildsjcl"]);
grunt.registerTask("build:production", ["copy", "bower-install-simple", "less", "requirejs", "run:buildsjcl", "buildDate", "fileToHashName", "manifest"]);

grunt.registerTask("server", "Start the whispeer web server.", require("./webserver"));

grunt.task.registerTask("buildDate", function () {
	var buildTime = new Date();
	var buildDate = buildTime.getFullYear().toString() + (buildTime.getMonth() + 1) + buildTime.getDate().toString();

	var fs = require("fs");
	var rootController = fs.readFileSync("./assets/js/config.js").toString();
	rootController = rootController.replace(/var buildDate \= \"[0-9\-]*\";/, "var buildDate = \"" + buildDate + "\";");
	fs.writeFileSync("./assets/js/config.js", rootController);
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

