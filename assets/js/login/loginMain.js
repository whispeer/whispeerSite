window.startup = new Date().getTime();
window.globalErrors = [];

window.jQuery = require("jquery");

"use strict";

const angular = require("angular");
const app = require("login/loginModule");
require("login/loginController");
require("runners/promiseRunner");

angular.element(document).ready(function () {
    var $html = angular.element(document.documentElement);
    angular.bootstrap($html, [app.name], { strictDi: true });
    // Because of RequireJS we need to bootstrap the app app manually
    // and Angular Scenario runner won"t be able to communicate with our app
    // unless we explicitely mark the container as app holder
    // More info: https://groups.google.com/forum/#!msg/angular/yslVnZh9Yjk/MLi3VGXZLeMJ
    $html.addClass("ng-app");
});
