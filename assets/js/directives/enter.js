define(function () {
    "use strict";
    return function () {
        return {
            link: function (scope, element, attrs) {
                element.bind("keydown keypress", function (event) {
                    if(event.which === 13 && !event.ctrlKey && !event.shiftKey) {
                        scope.$apply(function (){
                            scope.$eval(attrs.enter);
                        });

                        event.preventDefault();
                    }
                });
            }
        };
    };
});