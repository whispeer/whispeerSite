define (["whispeerHelper"], function (h) {
    "use strict";

    /* jshint validthis: true */

    function listenF(fn, type) {
        type = type || "any";
        if (typeof this._listeners[type] === "undefined") {
            this._listeners[type] = [];
        }
        this._listeners[type].push(fn);
    }

    function unListenF(fn, type) {
        type = type || "any";

        this._listeners[type] = h.removeArray(this._listeners[type], fn);
    }
    function notifyF(data, type, returnF) {
        type = type || "any";

        if (!returnF) {
            returnF = function () {};
        }

        var subscribers = this._listeners[type] || [];
        var result = h.callEach(subscribers, [data], returnF);

        if (type !== "any") {
            result = returnF(this.notify(data), result);
        }

        return result;
    }

    var Observer = function () {
        this._listeners = {
            any: [] // event type: this._listeners
        };

        this.listen = listenF;
        this.unlisten = unListenF;
        this.notify = notifyF;
    };

    return Observer;
});