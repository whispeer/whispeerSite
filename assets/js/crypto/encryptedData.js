
define (["whispeerHelper", "step", "crypto/keyStore"], function (h, step, keyStore) {
    "use strict";

    /* jshint validthis: true */

    var encryptedDataObject = function (data, options, isDecrypted) {
        var encryptedData, decryptedData, updatedData = {};
        var decryptedStatus = {}, changed = false, that = this;

        options = options || {};
        var encryptionDepth = options.encryptionDepth || 0;

        if (isDecrypted) {
            decryptedData = data;
            decryptedStatus = true;
            changed = true;
        } else {
            encryptedData = data;
        }

        function breakPartial(partial) {
            if (typeof partial === "string") {
                return partial.split(".");
            } else if (typeof partial === "object") {
                return partial;
            }

            return [];
        }

        this.reset = function () {
            encryptedData = {};
            decryptedData = {};
            decryptedStatus = {};
            changed = false;
        };

        function aggregateDecryptionStatus(givenEncryptedData, givenDecryptedStatus) {
            var aggregate = true;

            if (givenDecryptedStatus === true) {
                return true;
            }

            h.objectEach(givenEncryptedData, function (key, value) {
                if (givenDecryptedStatus[key]) {
                    if (typeof value === "object") {
                        givenDecryptedStatus[key] = aggregateDecryptionStatus(value, givenDecryptedStatus[key]);
                    }

                    if (givenDecryptedStatus[key] !== true) {
                        aggregate = false;
                    }
                } else {
                    aggregate = false;
                }
            });

            if (aggregate) {
                return true;
            }

            return givenDecryptedStatus;
        }

        function reducePartialLength(partial) {
            return partial.slice(0, encryptionDepth);
        }

        this.decrypt = function (cb, partial) {
            var reducedPartial = reducePartialLength(breakPartial(partial));

            var toDecrypt = h.object.deepGet(encryptedData, reducedPartial);

            step(function () {
                var partialDecryptionStatus = h.object.deepGet(decryptedStatus, reducedPartial);

                if (partialDecryptionStatus.value === true || toDecrypt.depth !== encryptionDepth) {
                    this.last.ne();
                } else {
                    keyStore.sym.decryptObject(toDecrypt.value, encryptionDepth-toDecrypt.depth, this);
                }
            }, h.sF(function (decryptedObj) {
                if (decryptedObj) {
                    decryptedData = h.object.deepSet(decryptedData, reducedPartial, decryptedObj);

                    decryptedStatus = h.object.deepSet(decryptedStatus, reducedPartial, true);
                    decryptedStatus = aggregateDecryptionStatus(encryptedData, decryptedStatus);
                } else {
                    throw new Error("could not decrypt");
                }

                this.ne();
            }), cb);
        };

        this.getBranch = function (attr, cb) {
            var that = this;
            step(function () {
                that.decrypt(this, attr);
            }, h.sF(function () {
                this.ne(decryptedData[attr]);
            }), cb);
        };

        this.setAttribute = function (partial, value, cb) {
            partial = breakPartial(partial);
            var reducedPartial = reducePartialLength(partial);

            step(function () {
                that.decrypt(this, partial);
            }, h.sF(function () {
                if (!h.object.deepHas(updatedData, reducedPartial)) {
                    updatedData = h.object.deepSet(updatedData, reducedPartial, h.object.deepGet(decryptedData, reducedPartial));
                }

                if (h.object.deepGet(updatedData, partial) !== value) {
                    changed = true;

                    h.object.deepSet(updatedData, partial, value);
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
                    keyStore.sym.encryptObject(updatedData, key, encryptionDepth, this);
                }), h.sF(function (newEncryptedData) {
                    this.ne(h.extend(encryptedData, newEncryptedData, encryptionDepth+1));
                }), cb);
                //encryptObject(decryptedData)
                //changed=false
            } else {
                cb(null, false);
            }
        };
    };

    return encryptedDataObject;
});