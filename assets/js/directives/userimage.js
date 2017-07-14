var templateUrl = require("../../views/directives/userimage.html");

"use strict";

const directivesModule = require("directives/directivesModule");

function userimage() {
    return {
        transclude: false,
        scope:	{
            userData: 	"=user"
        },
        restrict: "E",
        templateUrl: templateUrl,
        replace: true
    };
}

directivesModule.directive("userimage", userimage);
