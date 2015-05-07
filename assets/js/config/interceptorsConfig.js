define(["angular", "interceptors/addKeysInterceptor", "interceptors/sessionServiceInterceptor"], function (angular) {
	"use strict";

	angular.module("ssn.interceptors.config", ["ssn.interceptors"]).config(["ssn.socketServiceProvider", function (socketServiceProvider) {
		socketServiceProvider.addInterceptor("ssn.interceptors.sessionService");
		socketServiceProvider.addInterceptor("ssn.interceptors.addKeys");
	}]);
});
