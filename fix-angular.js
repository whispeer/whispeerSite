#!/usr/bin/env node

var replaceString = /(\s)(assertNoDuplicate\(\'template\', templateDirective, directive, \$compileNode\)\;)/g;

var basePath = "./assets/js/bower/angular/";

var fs = require("fs");
var bower = JSON.parse(fs.readFileSync(basePath + "bower.json"));

var angular = fs.readFileSync(basePath + bower.main).toString();

fs.writeFileSync(basePath + bower.main, angular.replace(replaceString, "$1//$2"));

console.log("fixed angular.js");
