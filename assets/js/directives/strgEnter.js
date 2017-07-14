"use strict";
const directivesModule = require('directives/directivesModule');
var strgEnterDirective = function () {
    return {
        link: function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if(event.which === 13 && event.ctrlKey) {
                    scope.$apply(function (){
                        scope.$eval(attrs.strgEnter);
                    });

                    event.preventDefault();
                }
            });
        }
    };
};

directivesModule.directive("strgEnter", strgEnterDirective);
