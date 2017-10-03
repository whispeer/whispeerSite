var Bluebird = require("bluebird");
var h = require("../helper/helper").default;

var errorService = require("services/error.service").errorServiceInstance;

var migrations = ["regenerateFriendsKeys", "fixBrokenSettings"];

function runMigration(ownUser, migrationState) {
	return Bluebird.try(function () {
		var migration = require("migrations/" + h.pad("" + (migrationState + 1), 5) + "-" + migrations[migrationState]);
		return migration();
	}).then(function (success) {
		if (!success) {
			console.error("Migration failed " + migrationState, success);
			//AUTSCH!
		} else {
			return ownUser.setMigrationState(migrationState + 1);
		}
	});
}


var doMigration = function () {
	var ownUser = require("users/userService").default.getOwn(), migrationState;

	if (ownUser) {
		ownUser.getMigrationState().then(function(state) {
			migrationState = h.parseDecimal(state) || 0;
			if (migrationState < migrations.length) {
				return runMigration(ownUser, migrationState);
			}
		}).catch(errorService.criticalError);
	}
};

module.exports = doMigration;
