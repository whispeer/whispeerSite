var templateUrl = require("../../views/directives/inviteButtons.html");

"use strict";

const directivesModule = require("directives/directivesModule");

function newPostDirective() {
    return {
        scope: {},
        restrict: "E",
        templateUrl: templateUrl,
        replace: false,
        transclude: false,
        controller: "ssn.inviteController"
    };
}

newPostDirective.$inject = [];

directivesModule.directive("invitebuttons", newPostDirective);
