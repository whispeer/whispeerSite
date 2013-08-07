define([
	'angular',
	'controllers/controllers',
	'controllers/magicbarControllers',
	'services/services',
	'directives/directives',
	'i18n/localizationModule'
], function (angular) {
	'use strict';

	return angular.module('ssn', ['ssn.controllers', 'ssn.magicbar.controllers', 'ssn.services', 'ssn.directives', 'localization']);
});