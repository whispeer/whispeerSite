/**
* SessionService
**/
define(["runners/runnerModule", "bluebird"], function (runnerModule, Bluebird) {
	"use strict";

	runnerModule.run(["$rootScope", "$state", "localize", function ($rootScope, $state, localize) {
		var firstStateChange = new Bluebird(function (resolve) {
			$rootScope.$on("$stateChangeSuccess", resolve);
		});

		$rootScope.$on("localizeResourcesUpdates", function () {
			firstStateChange.then(function () {
				$state.go($state.current, { locale: localize.getLanguage() });
			});
		});
	}]);
});
