var serviceModule = require("./serviceModule");
var LocationService = require("services/location.service.ts").default;

serviceModule.service("ssn.locationService", ["$location", function ($location) {
	"use strict";

	// compensate the difference between ng2 Location and ng1 $location
	// (basically path() is no longer a setter. go does pretty much the same thing)
	$location.go = function(path) {
		return $location.path(path);
	};

	return new LocationService($location);
}]);
