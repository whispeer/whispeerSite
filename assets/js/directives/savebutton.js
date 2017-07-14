var templateUrl = require("../../views/directives/saveButton.html");

"use strict";

const directivesModule = require('directives/directivesModule');

function savebuttonDirective() {
    return {
        transclude: true,
        scope:	{
            state:		"=state"
        },
        restrict: "E",
        templateUrl: templateUrl,
        replace: true,
        link: function (scope, iElement, iAttrs) {
            scope.successIcon = "fa-check-circle";
            scope.initIcon = "fa-check-circle";
            scope.failureIcon = "fa-times-circle";

            if (iAttrs.initicon) {
                scope.initIcon = iAttrs.initicon;
            }

            if (iAttrs.successicon) {
                scope.successIcon = iAttrs.successicon;
            }

            if (iAttrs.failureicon) {
                scope.failureIcon = iAttrs.failureicon;
            }

            if (typeof iAttrs.noiniticon !== "undefined") {
                delete scope.initIcon;
            }
        }
    };
}

directivesModule.directive("savebutton", savebuttonDirective);
