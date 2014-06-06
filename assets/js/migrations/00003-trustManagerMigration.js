define(["step", "whispeerHelper", "crypto/trustManager"], function (step, h, trustManager) {
	return function ($injector, cb) {
		var userService = $injector.get("ssn.userService");

		step(function () {
			trustManager.createDatabase(userService.getown());
			trustManager.getUpdatedVersion(userService.getown().getSignKey(), this);
		}, h.sF(function (metaData) {
			trustManager.loadDatabase(metaData, userService.getown().getSignKey(), this);
		}), function () {
			debugger;
		}, cb);
	};
});