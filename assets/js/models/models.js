/**
* BaseService
**/

var models = ["user"];

var includes = ["angular"];

var i;
for (i = 0; i < models.length; i += 1) {
	includes.push("models/" + models[i]);
}

console.log(JSON.stringify(includes));

define(includes, function (angular) {
	"use strict";
	var modelsProvider = angular.module("ssn.models", []);

	var i;
	for (i = 0; i < models.length; i += 1) {
		modelsProvider.factory("ssn.models." + models[i], arguments[i+1]);
	}

	return models;
});