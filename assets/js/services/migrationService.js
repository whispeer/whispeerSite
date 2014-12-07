define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	//get users migration state

	//load next migration to do (requirejs dynamic loading)

	//execute migration, pass $injector

	//after success: update users migration state

	var migrations = ["regenerateFriendsKeys"];

	var service = function ($injector, errorService) {
		var doMigration = function () {
			var ownUser = $injector.get("ssn.userService").getown(), migrationState;

			if (ownUser) {
				step(function () {
					ownUser.getMigrationState(this);
				}, h.sF(function (state) {
					migrationState = h.parseDecimal(state) || 0;
					if (migrationState < migrations.length) {
						require(["migrations/" + h.pad("" + (migrationState + 1), 5) + "-" + migrations[migrationState]], this.ne, this);
					}
				}), h.sF(function (migration) {
					migration($injector, this);
				}), h.sF(function (success) {
					if (!success) {
						console.error("Migration failed");
						//AUTSCH!
					} else {
						ownUser.setMigrationState(migrationState + 1, this);
					}
				}), errorService.criticalError);
			}
		};

		return doMigration;
	};

	service.$inject = ["$injector", "ssn.errorService"];

	return service;
});
