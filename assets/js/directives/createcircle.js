var templateUrl = require("../../views/directives/createcircle.html");
var circleService = require("circles/circleService");

"use strict";

const Bluebird = require("bluebird");
const directivesModule = require("directives/directivesModule");

function createcircle() {
    return {
        scope: {
            "name": "=",
            "afterCreate": "&"
        },
        restrict: "E",
        templateUrl: templateUrl,
        replace: false,
        transclude: false,
        link: function (scope) {
            scope.createCircle = function (name) {
                circleService.create(name).then(function (circle) {
                    scope.afterCreate({
                        circle: circle
                    });
                });
            };
        }
    };
}

createcircle.$inject = [];

directivesModule.directive("createcircle", createcircle);
