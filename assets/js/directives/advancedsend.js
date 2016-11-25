define(["bluebird", "whispeerHelper", "directives/directivesModule"], function (Bluebird, h, directivesModule) {
    "use strict";
    var advancedsendDirective = function (settingsService, errorService) {
        return {
            link: function (scope, element, attrs) {
                Bluebird.try(function () {
                    var messages = settingsService.getBranch("messages");
                    function send() {
                        scope.$apply(function (){
                            scope.$eval(attrs.advancedsend);
                        });
                    }

                    element.bind("keydown keypress", function (event) {
                        if(event.which === 13) {
                            if (messages.sendShortCut === "ctrlEnter") {
                                if (event.ctrlKey) {
                                    send();
                                    event.preventDefault();
                                }
                            }

                            if (messages.sendShortCut === "enter") {
                                if (!event.ctrlKey && !event.shiftKey) {
                                    send();
                                    event.preventDefault();
                                }
                            }
                        }
                    });
                }).catch(errorService.criticalError);
            }
        };
    };

    advancedsendDirective.$inject = ["ssn.settingsService", "ssn.errorService"];

    directivesModule.directive("advancedsend", advancedsendDirective);
});
