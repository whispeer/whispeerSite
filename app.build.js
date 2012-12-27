({
    appDir: "js/",
    baseUrl: ".",
    dir: "js-build",
    //Comment out the optimize line if you want
    //the code minified by UglifyJS.
    //optimize: "none",

    paths: {
        "jquery": "libs/require-jquery"
    },

    modules: [
        {
            name: "main",
            exclude: ["jquery"]
        }
    ]
})