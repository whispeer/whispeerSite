window.startup = new Date().getTime();

window.jQuery = require("jquery");

"use strict";

const angular = require("angular");
const app = require("register/registerModule");
require("register/registerController");
require("directives/mobile");
require("directives/autofocus");
require("directives/savebutton");
require("directives/passwordinput");
require("directives/validatedForm");
require("directives/loadVal");

angular.element(document).ready(function () {
	var $html = angular.element("html");
	angular.bootstrap($html, [app.name], { strictDi: true });
    // Because of RequireJS we need to bootstrap the app app manually
    // and Angular Scenario runner won"t be able to communicate with our app
    // unless we explicitely mark the container as app holder
    // More info: https://groups.google.com/forum/#!msg/angular/yslVnZh9Yjk/MLi3VGXZLeMJ
	$html.addClass("ng-app");
});
