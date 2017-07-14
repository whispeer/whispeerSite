"use strict";
const directivesModule = require('directives/directivesModule');
var stopEventDirective = function () {
    return {
        restrict: "A",
        link: function (scope, element, attr) {
            element.bind(attr.stopEvent, function (e) {
                e.stopPropagation();
            });
        }
    };
};

directivesModule.directive("stopEvent", stopEventDirective);
