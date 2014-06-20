/**
* BaseService
**/
(function () {
	"use strict";
	var models = ["user", "message"];

	var includes = ["angular"];

	var i;
	for (i = 0; i < models.length; i += 1) {
		includes.push("models/" + models[i]);
	}

	define(includes, function (angular) {
		var modelsProvider = angular.module("ssn.models", []);

		var i;
		for (i = 0; i < models.length; i += 1) {
			modelsProvider.factory("ssn.models." + models[i], arguments[i+1]);
		}

		return models;
	});
})();