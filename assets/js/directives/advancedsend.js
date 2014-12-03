define(["step", "whispeerHelper"], function (step, h) {
    "use strict";
    var directive = function (settingsService, errorService) {
        return {
            link: function (scope, element, attrs) {
                step(function () {
                    settingsService.getBranch("messages", this);
                }, h.sF(function (messages) {
                    function send() {
                        scope.$apply(function (){
                            scope.$eval(attrs.advancedsend);
                        });
                    }

                    element.bind("keydown keypress", function (event) {
                        if(event.which === 13) {
                            if (messages && messages.sendShortCut === "ctrlEnter") {
                                if (event.ctrlKey) {
                                    send();
                                    event.preventDefault();
                                }
                            } else {
                                if (!event.ctrlKey && !event.shiftKey) {
                                    send();
                                    event.preventDefault();
                                }
                            }
                        }
                    });
                }), errorService.criticalError);
            }
        };
    };

    directive.$inject = ["ssn.settingsService", "ssn.errorService"];

    return directive;
});