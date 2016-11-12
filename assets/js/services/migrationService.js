define(["bluebird", "whispeerHelper", "services/serviceModule"], function (Bluebird, h, serviceModule) {
	"use strict";

	//get users migration state

	//load next migration to do (requirejs dynamic loading)

	//execute migration, pass $injector

	//after success: update users migration state

	var migrations = ["regenerateFriendsKeys", "fixBrokenSettings"];

	var service = function ($injector, errorService) {
		var doMigration = function () {
			var ownUser = $injector.get("ssn.userService").getown(), migrationState;

			if (ownUser) {
				ownUser.getMigrationState().then(function(state) {
					migrationState = h.parseDecimal(state) || 0;
					if (migrationState < migrations.length) {
						var migration = Bluebird.promisify(
							require("migrations/" + h.pad("" + (migrationState + 1), 5) + "-" + migrations[migrationState])
						);
						return migration($injector);
					}
				}).then(function(success) {
					if (!success) {
						console.error("Migration failed");
						//AUTSCH!
					} else {
						return ownUser.setMigrationState(migrationState + 1);
					}
				}).catch(errorService.criticalError);
			}
		};

		return doMigration;
	};

	service.$inject = ["$injector", "ssn.errorService"];

	serviceModule.factory("ssn.migrationService", service);
});
