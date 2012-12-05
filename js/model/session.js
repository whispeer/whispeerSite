define(['model/storage'], function (storage) {
	var session = {
		storageAvailable: function () {
			return storage.available;
		},

		logedin: function () {
			//TODO
		}
	};

	return session;
});