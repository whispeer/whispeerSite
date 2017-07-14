"use strict";

const directivesModule = require("directives/directivesModule");

function focusMeDirective($timeout) {
    return {
        scope: { trigger: "=focusMe" },
        link: function(scope, element) {
            scope.$watch("trigger", function(value) {
                if(value === true) { 
                    $timeout(function() {
                        element[0].focus(); 
                    });
                }
            });
        }
    };
}

focusMeDirective.$inject = ["$timeout"];

directivesModule.directive("focusMe", focusMeDirective);
