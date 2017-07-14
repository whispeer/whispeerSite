"use strict";
const directivesModule = require("directives/directivesModule");
var autofocusDirective = function() {
    return {
        link: function(scope, elm, attr) {
            if (!attr.autofocus) {
                elm.focus();
            } else {
                scope.$watch(attr.autofocus, function (val) {
                    if (val) {
                        window.setTimeout(function () {
                            elm.focus();
                        });
                    }
                });
            }
        }
    };
};

directivesModule.directive("autofocus", autofocusDirective);
