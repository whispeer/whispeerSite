define(["whispeerHelper", "controllers/controllerModule"], function (h, controllerModule) {
	"use strict";

	function flattenObject(obj, concatString) {
		var result = [];

		if (concatString) {
			concatString += ".";
		} else {
			concatString = "";
		}

		var keys = Object.keys(obj).map(h.parseDecimal);
		keys.sort(function (v1, v2) {
			return v2 - v1;
		});

		keys.map(function (e) {
			if (typeof obj[e] === "object" && !(obj[e] instanceof Array)) {
				result = result.concat(flattenObject(obj[e], concatString + e));
			} else {
				result.push({
					key: concatString + e,
					value: obj[e]
				});
			}
		});

		return result;
	}

	function versionController($scope, $http, cssService) {
		cssService.setClass("versionView");

		$scope.versions = [];

		$http({ method: "GET", url: "changelog.json", cache: false }).success(function (data) {
			if (typeof data === "object") {
				var versionArray = flattenObject(data);

				$scope.versions = versionArray;
			}
		});
	}

	versionController.$inject = ["$scope", "$http", "ssn.cssService"];

	controllerModule.controller("ssn.versionController", versionController);
});
