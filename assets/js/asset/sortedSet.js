define ([], function () {
    "use strict";

    /* jshint validthis: true */

    var sortedSet = function (sortFunction) {
        var arr = [];
        arr.push = function (e) {
            Array.prototype.push.call(this, e);
            this.sort(sortFunction);
        };

        return arr;
    };

    return sortedSet;
});