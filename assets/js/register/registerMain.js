define([
	"angular",
	"register/registerModule",
	"register/registerController",

	"directives/savebutton",
	"directives/passwordinput",
	"directives/validatedForm",
], function($, angular, app) {
	"use strict";

	$(document).ready(function () {
		var $html = $("html");
		angular.bootstrap($html, [app.name]);
		// Because of RequireJS we need to bootstrap the app app manually
		// and Angular Scenario runner won"t be able to communicate with our app
		// unless we explicitely mark the container as app holder
		// More info: https://groups.google.com/forum/#!msg/angular/yslVnZh9Yjk/MLi3VGXZLeMJ
		$html.addClass("ng-app");
	});
});
