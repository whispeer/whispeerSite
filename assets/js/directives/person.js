var templateUrl = require("../../views/directives/person.html");

"use strict";

const directivesModule = require("directives/directivesModule");

function personDirective() {
    return {
        transclude: true,
        scope:	{
            userData: "=user"
        },
        restrict: "E",
        templateUrl: templateUrl,
        replace: true
    };
}

directivesModule.directive("person", personDirective);
