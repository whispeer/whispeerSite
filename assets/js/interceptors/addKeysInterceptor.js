/**
* SocketService
**/
define([
	"interceptors/interceptorsModule"
], function (interceptorModule) {
	"use strict";

	var interceptor = function (keyStore) {
		return {
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
	};

	interceptorModule.service("ssn.interceptors.addKeys", ["ssn.keyStoreService", interceptor]);
});
