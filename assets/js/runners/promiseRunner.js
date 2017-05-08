var Bluebird = require("bluebird");
var runnerModule = require("runners/runnerModule");
var Observer = require("asset/observer").default;

runnerModule.run(["$rootScope",function ($rootScope) {
	"use strict";

	Bluebird.setScheduler(function (cb) {
		$rootScope.$evalAsync(cb);
	});

	Observer.addAfterHook(function () {
		$rootScope.$evalAsync();
	});
}]);
