define(["step", "whispeerHelper"], function (step, h) {
	return function ($injector, cb) {
		var settingsService = $injector.get("ssn.settingsService");
		var userService = $injector.get("ssn.userService");
		var newSettings;

		step(function () {
			settingsService.getBranch("privacy", this);
		}, h.sF(function (privacySettings) {
			if (privacySettings["image"]) {
				this.last.ne(true);
			} else {
				//set image privacy settings to public
				newSettings = h.deepCopyObj(privacySettings);
				newSettings.image = {
						encrypt: false,
						visibility: []
				};

				//rebuild profiles
				userService.getown().rebuildProfilesForSettings(newSettings,  privacySettings, this);
			}
		}), h.sF(function () {
			settingsService.updateBranch("privacy", newSettings, this);
		}), h.sF(function () {
			settingsService.uploadChangedData(this);
		}), cb);
	};
});