/**
* SocketService
**/
define([
	"interceptors/interceptorsModule"
], function (interceptorModule) {
	"use strict";

	var interceptor = function (sessionService) {
		return {
			transformResponse: function (response) {
				if (response.logedin) {
					sessionService.setSID(response.sid, response.userid);
				} else {
					sessionService.logout();
				}

				return response;
			},

			transformRequest: function(request) {
				request.sid = sessionService.getSID();

				return request;
			}
		};
	};

	interceptorModule.service("ssn.interceptors.sessionService", ["ssn.sessionService", interceptor]);
});
