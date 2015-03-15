define(["whispeerHelper"], function (h) {
    "use strict";
    var directive = function ($window, localize) {
        var ONEHOUR = 60*60*1000;
        var ONEMINUTE = 60*1000;

        function getDifferenceString(diff) {
            var minutes = Math.floor(diff%ONEHOUR/ONEMINUTE);

            if (diff < ONEMINUTE) {
                return localize.getLocalizedString("date.time.justNow");
            }

            if (diff < 2*ONEMINUTE) {
                return localize.getLocalizedString("date.time.oneMinuteAgo");
            }

            if (diff < ONEHOUR) {
                return localize.getLocalizedString("date.time.minutesAgo", {
                    minutes: minutes
                });
            }

            if (diff < 2*ONEHOUR) {
                return localize.getLocalizedString("date.time.oneHourAgo", {
                    minutes: minutes
                });
            }

            return localize.getLocalizedString("date.time.hoursAgo", {
                hours: Math.floor(diff/ONEHOUR),
                minutes: minutes
            });
        }

        function toDateString(input) {
            if (input) {
                var date = new Date(h.parseDecimal(input));
                var diff = new Date().getTime() - date.getTime();

                var sameDate = new Date(date).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);
                if (sameDate) {
                    return getDifferenceString(diff);
                }

                return date.toLocaleDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        }

        return {
            scope: {
                time: "=smartDate"
            },
            link: function (scope, element) {
                var previousResult;
                function updateDateString() {
                    var result = toDateString(scope.time);

                    if (result !== previousResult) {
                        element.text(result);
                    }
                }
                
                updateDateString();

                scope.$watch(function () {
                    return scope.time;
                }, updateDateString);

                $window.setInterval(updateDateString, 1000);
            }
        };
    };

    directive.$inject = ["$window", "localize"];

    return directive;
});