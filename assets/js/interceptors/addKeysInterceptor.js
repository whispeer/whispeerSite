var keyStore = require("services/keyStore.service").default;
var socketService = require("services/socket.service").default;

var interceptor = {
	transformResponse: function (response) {
		if (!response.keys) {
			return response;
		}

		response.keys.forEach(function (key) {
			keyStore.upload.addKey(key);
		});

		return response;
	}
};

socketService.addInterceptor(interceptor);
