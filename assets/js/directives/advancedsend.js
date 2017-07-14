var errorService = require("services/error.service").errorServiceInstance;
var settingsService = require("services/settings.service").default;

"use strict";
const Bluebird = require('bluebird');
const h = require("whispeerHelper").default;
const directivesModule = require('directives/directivesModule');
var advancedsendDirective = function () {
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

advancedsendDirective.$inject = [];

directivesModule.directive("advancedsend", advancedsendDirective);
