/**
* Base Controller
**/
(function() {
	"use strict";
	var controllers = ["logout", "login", "root" ,"user", "main", "friends", "messages", "circles", "settings", "help", "loading", "register", "start", "version"];
	
	var includes = ["angular"];
	
	var i;
	for (i = 0; i < controllers.length; i += 1) {
		includes.push("controllers/" + controllers[i] + "Controller");
	}

	console.log(JSON.stringify(includes));
	
	define(includes, function (angular) {
		var cons = angular.module("ssn.controllers", ["ssn.services"]);
	
		var i;
		for (i = 0; i < controllers.length; i += 1) {
			cons.controller("ssn." + controllers[i] + "Controller", arguments[i+1]);
		}
	
		return cons;
	});
})();