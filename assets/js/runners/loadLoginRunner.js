require("angularServices/locationService");

var landingPage = require("services/location.manager").landingPage;

var runnerModule = require("runners/runnerModule");
var sessionService = require("services/session.service").default;

runnerModule.run(["ssn.locationService", function (locationService) {
	"use strict";

	sessionService.loadLogin().then(function (loggedin) {
		if (loggedin) {
			locationService.loadInitialURL();
		} else {
			landingPage()
		}
	});
}]);
