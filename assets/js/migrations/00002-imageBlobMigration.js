define(["step", "whispeerHelper"], function (step, h) {
	return function ($injector, cb) {
		var settingsService = $injector.get("ssn.settingsService");
		var userService = $injector.get("ssn.userService");
		var blobService = $injector.get("ssn.blobService");

		function setImageBlobPrivacySetting(privacySettings, cb) {
			var newSettings;
			step(function () {
				//set image privacy settings to public
				newSettings = h.deepCopyObj(privacySettings);
				newSettings.imageBlob = {
					encrypt: false,
					visibility: []
				};

				settingsService.updateBranch("privacy", newSettings, this);
			}, h.sF(function () {
				settingsService.uploadChangedData(this);
			}), cb);
		}

		step(function () {
			settingsService.getBranch("privacy", this);
		}, h.sF(function (privacySettings) {
			if (!privacySettings.imageBlob) {
				setImageBlobPrivacySetting(privacySettings, this);
			} else {
				this.ne();
			}
		}), h.sF(function () {
			userService.getown().getProfileAttribute("image", this);
		}), h.sF(function (imageData) {
			if (imageData) {
				var myBlob = blobService.createBlob(h.dataURItoBlob(imageData));

				this.parallel.unflatten();
				myBlob.upload(this.parallel());
				myBlob.getHash(this.parallel());
			} else {
				this.last.ne();
			}
		}), h.sF(function (blobid, hash) {
			if (blobid) {
				userService.getown().setProfileAttribute("imageBlob", {
					blobid: blobid,
					imageHash: hash
				}, this.parallel());

				userService.getown().setProfileAttribute("image", "", this.parallel());
			} else {
				this.ne();
			}			
		}), h.sF(function () {
			userService.getown().uploadChangedProfile(this);
		}), cb);
	};
});