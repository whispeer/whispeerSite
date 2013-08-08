/**
* Magicbar Base Controller
**/
(function() {
	"use strict";
	var controllers = ['main', 'messages', 'friends', 'news', 'settings'];
	
	var includes = ['angular'];
	
	var i;
	for (i = 0; i < controllers.length; i += 1) {
		includes.push('controllers/magicbar/' + controllers[i] + 'Controller');
	}
	
	define(includes, function (angular) {
		var cons = angular.module('ssn.magicbar.controllers', ['ssn.services']);
	
		var i;
		for (i = 0; i < controllers.length; i += 1) {	
			cons.controller('ssn.magicbar.' + controllers[i] + 'Controller', arguments[i+1]);
		}
	
		return cons;
	});
})();