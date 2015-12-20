define (["whispeerHelper"], function (h) {
    "use strict";

    /* jshint validthis: true */

    function listenOnceF(fn, type) {
        type = type || "any";

        if (typeof this._listenersOnce[type] === "undefined") {
            this._listenersOnce[type] = [];
        }
        this._listenersOnce[type].push(fn);
    }

    function listenPromiseF(type) {

    }

    function listenF(fn, type) {
        type = type || "any";
        if (typeof this._listeners[type] === "undefined") {
            this._listeners[type] = [];
        }
        this._listeners[type].push(fn);
    }

    function notifyF(data, type, returnF) {
        type = type || "any";

        if (!returnF) {
            returnF = function () {};
        }

        var listeners = this._listeners[type] || [];
        var listenersOnce = this._listenersOnce[type] || [];

        var subscribers = (listeners).concat(listenersOnce);

        this._listenersOnce[type] = [];

        var result = h.callEach(subscribers, [data], returnF);

        if (type !== "any") {
            result = returnF(this.notify(data), result);
        }

        return result;
    }

    var Observer = function () {
        this._listeners = {};
        this._listenersOnce = {};

        this.listenPromise = listenPromiseF;
        this.listenOnce = listenOnceF;
        this.listen = listenF;
        //this.unlisten = unListenF;
        this.notify = notifyF;
    };

    return Observer;
});
