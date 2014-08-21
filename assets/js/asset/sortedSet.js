define ([], function () {
    "use strict";

    /* jshint validthis: true */

    var sortedSet = function (sortFunction) {
        var arr = [];
        arr.push = function () {
            Array.prototype.push.apply(this, arguments);
            this.resort();
        };

        arr.join = function (elements) {
            Array.prototype.push.apply(this, elements);
            this.resort();
        };

        arr.resort = function () {
            this.sort(sortFunction);
        };

        return arr;
    };

    return sortedSet;
});