
define (["whispeerHelper", "step", "crypto/keyStore"], function (h, step, keyStore) {
    "use strict";

    /* jshint validthis: true */

    var encryptedDataObject = function (data) {
        var encryptedData = data, decryptedData;

        this.decrypt = function (cb) {
            step(function () {
                if (decryptedData) {
                    this.last.ne();
                }

                keyStore.sym.decryptObject(encryptedData, 0, this);
            }, h.sF(function (decryptedObj) {
                if (decryptedObj) {
                    decryptedData = decryptedObj;
                } else {
                    throw new Error("could not decrypt");
                }

                this.ne(decryptedData);
            }), cb);
        };
    };

    return encryptedDataObject;
});
