/**
* Base Controller
**/

var controllers = ['login', 'root', 'magicbar' ,'user', 'main', 'friends', 'messages', 'settings', 'help'];

var includes = ['angular'];

var i;
for (i = 0; i < controllers.length; i += 1) {
	includes.push('controllers/' + controllers[i] + 'Controller');
}

define(includes, function (angular) {
	"use strict";
	var cons = angular.module('ssn.controllers', ['ssn.services']);

	var i;
	for (i = 0; i < controllers.length; i += 1) {	
		cons.controller('ssn.' + controllers[i] + 'Controller', arguments[i+1]);
	}

	return cons;
});