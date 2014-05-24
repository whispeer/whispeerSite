define(["step", "whispeerHelper"], function (step, h) {
	return function ($injector, cb) {
		var settingsService = $injector.get("ssn.settingsService");
		var userService = $injector.get("ssn.userService");
		var blobService = $injector.get("ssn.blobService");

		var newSettings;

		step(function () {
			settingsService.getBranch("privacy", this);
		}, h.sF(function (privacySettings) {
			if (!privacySettings["imageBlob"]) {
				//set image privacy settings to public
				newSettings = h.deepCopyObj(privacySettings);
				newSettings.imageBlob = {
					encrypt: false,
					visibility: []
				};				
			}

			userService.getown().getProfileAttribute("image", this);
		}), h.sF(function (imageData) {
			if (imageData) {
				var myBlob = blobService.createBlob(h.dataURItoBlob(imageData));

				debugger;

				this.parallel.unflatten();
				myBlob.upload(this.parallel());
				myBlob.getHash(this.parallel());
			} else {
				this.ne();
			}
		}), h.sF(function (blobid, hash) {
			if (blobid) {
				userService.getown().setProfileAttribute("imageBlob", {
					blobid: blobid,
					imageHash: hash
				}, this.parallel());

				userService.getown().setProfileAttribute("image", "", this.parallel());
			}

			settingsService.updateBranch("privacy", newSettings, this.parallel());
		}), h.sF(function () {
			userService.getown().uploadChangedProfile(this.parallel());
			settingsService.uploadChangedData(this.parallel());
		}), cb);
	};
});