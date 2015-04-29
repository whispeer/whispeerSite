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

				out: "assets/js/build.js",
				baseUrl: "./assets/js",

				optimize: "none",
				preserveLicenseComments: true,
				generateSourceMaps: false,

				name: "main",
				insertRequire: ["main"],
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
    execute: {
        manifest: {
            src: ["./scripts/build_appcache.js"]
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
	}
});

grunt.registerTask("default", ["build:development", "browserSync", "concurrent:development"]);

grunt.registerTask("build:development", ["copy", "bower-install-simple", "less", "run:buildsjcl"]);
grunt.registerTask("build:production", ["copy", "bower-install-simple", "less", "requirejs", "execute:manifest", "run:buildsjcl"]);

grunt.registerTask("server", "Start the whispeer web server.", require("./webserver"));

grunt.task.registerMultiTask("manifest", "Build the manifest file.", function () {
	var destination = this.data.destination;
	var source = this.data.source;
	var config = require(this.data.config);

	require("./scripts/build_appcache")(source, destination, config, this.async());

	/*
	var buildTime = new Date();
	var buildDate = buildTime.getFullYear().toString() + (buildTime.getMonth() + 1) + buildTime.getDate().toString();

	var rootController = fs.readFileSync("./assets/js/config.js").toString();
	rootController = rootController.replace(/var buildDate \= \"[0-9\-]*\";/, "var buildDate = \"" + buildDate + "\";");
	fs.writeFileSync("./assets/js/config.js", rootController);
	*/
});

