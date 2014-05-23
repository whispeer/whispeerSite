define (["whispeerHelper", "step", "crypto/keyStore"], function (h, step, keyStore) {
    "use strict";

    /* jshint validthis: true */

    var encryptedMeta = function (data, isDecrypted) {
        var encryptedMetaData, decryptedMetaData, updatedMetaData = {}, decrypted = false, changed = false, that = this;

        if (isDecrypted) {
            decryptedMetaData = data;
            decrypted = true;
            changed = true;
        } else {
            encryptedMetaData = data;
        }

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
                    throw new Error("could not decrypt");
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

        this.setAttribute = function (attrs, value, cb) {
            step(function () {
                that.decrypt(this);
            }, h.sF(function () {
                if (h.deepGet(decryptedMetaData, attrs) !== value) {
                    changed = h.deepSetCreate(updatedMetaData, attrs, value) || changed;
                }

                this.ne();
            }), cb);
        };

        this.isChanged = function () {
            return changed;
        };

        this.getUploadData = function (key, cb) {
            if (changed) {
                //pad updated profile
                //merge paddedProfile and updatedPaddedProfile
                //sign/hash merge
                //encrypt merge
                step(function () {
                    that.decrypt(this);
                }, h.sF(function  () {
                    decryptedMetaData = h.extend(decryptedMetaData, updatedMetaData, 5);

                    keyStore.sym.encryptObject(decryptedMetaData, key, 0, this);
                }), h.sF(function (newEncryptedMetaData) {
                    this.ne(newEncryptedMetaData);
                }), cb);
                //encryptObject(decryptedMetaData)
                //changed=false
            } else {
                cb(null, false);
            }
        };
    };

    return encryptedMeta;
});