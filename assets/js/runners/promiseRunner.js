var Bluebird = require("bluebird");
var runnerModule = require("runners/runnerModule");

runnerModule.run(["$rootScope",function ($rootScope) {
	"use strict";

	Bluebird.setScheduler(function (cb) {
		$rootScope.$evalAsync(cb);
	});
}]);
