define (["whispeerHelper", "step", "crypto/keyStore"], function (h, step, keyStore) {
    "use strict";

    /* jshint validthis: true */

    var encryptedMeta = function (data) {
        var encryptedMetaData = data, decryptedMetaData, decrypted = false, changed = false;

        this.reset = function () {
            encryptedMetaData = {};
            decryptedMetaData = {};
            decrypted = false;
            changed = false;
        };

        this.decrypt = function (cb) {
            step(function () {
                if (decrypted) {
                    this.last.ne();
                } else {
                    keyStore.sym.decryptObject(encryptedMetaData, 0, this);
                }
            }, h.sF(function (decryptedObj) {
                if (decryptedObj) {
                    decryptedMetaData = decryptedObj;
                    decrypted = true;
                } else {
                    throw "could not decrypt";
                }

                this.ne();
            }), cb);
        };

        this.getBranch = function (attr, cb) {
            var that = this;
            step(function () {
                that.decrypt(this);
            }, h.sF(function () {
                this.ne(decryptedMetaData[attr]);
            }), cb);
        };

        this.setAttribute = function () {};
        this.getUploadData = function () {
            if (changed) {
                //encryptObject(decryptedMetaData)
                //changed=false
            }
        };
    };

    return encryptedMeta;
});