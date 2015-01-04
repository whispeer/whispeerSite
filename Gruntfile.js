var grunt = require("grunt");

grunt.loadNpmTasks("grunt-contrib-jshint");
grunt.loadNpmTasks("grunt-contrib-less");
grunt.loadNpmTasks("grunt-contrib-watch");
grunt.loadNpmTasks("grunt-browser-sync");
grunt.loadNpmTasks("grunt-contrib-copy");
grunt.loadNpmTasks("grunt-execute");
grunt.loadNpmTasks("grunt-concurrent");
grunt.loadNpmTasks("grunt-bower-install-simple");

grunt.initConfig({
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
		},
		manifest: {
			files: ["assets/**/*", "index.html"],
			tasks: ["build"],
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
            src: ["build_appcache.js"]
        },
        fixAngular: {
            src: ["fix-angular.js"]
        }
    },
	"bower-install-simple": {
		prod: {}
	}
});

grunt.registerTask("default", ["build", "browserSync", "concurrent:development"]);

grunt.registerTask("build", ["copy", "bower-install-simple", "less", "execute:manifest", "execute:fixAngular"]);

grunt.registerTask("server", "Start the whispeer web server.", require("./webserver"));
