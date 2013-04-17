define([
	'angular',
	'controllers/controllers',
	'services/services',
	'directives/directives'
], function (angular) {
	'use strict';

	return angular.module('ssn', ['ssn.controllers', 'ssn.services', 'ssn.directives']);
});