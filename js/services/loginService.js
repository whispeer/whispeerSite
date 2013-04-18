/**
* LoginService
**/
define(['angular'], function (angular) {
	"use strict";

	var service = function (socketService) {
		return {
			login: true
		}
	};

	service.$inject = ['ssn.socketService'];

	return service;
});