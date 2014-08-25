var grunt = require("grunt");

grunt.loadNpmTasks("grunt-contrib-jshint");
grunt.loadNpmTasks("grunt-contrib-less");
grunt.loadNpmTasks("grunt-contrib-watch");
grunt.loadNpmTasks("grunt-browser-sync");
grunt.loadNpmTasks('grunt-contrib-copy');

grunt.initConfig({
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
				watchTask: true
			}
		}
	}
});

grunt.registerTask("default", ["browserSync", "watch"]);

grunt.registerTask("build", ["copy", "less"]);

