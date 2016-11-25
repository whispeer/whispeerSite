
define (["whispeerHelper", "bluebird", "crypto/keyStore"], function (h, Bluebird, keyStore) {
	"use strict";

	/* jshint validthis: true */

	var encryptedDataObject = function (data) {
		var encryptedData = data, decryptedData;

		this.decrypt = function (cb) {
			if (decryptedData) {
				return Bluebird.resolve(decryptedData).nodeify(cb);
			}

			return keyStore.sym.decryptObject(encryptedData, 0).then(function (decryptedObj) {
				if (decryptedObj) {
					decryptedData = decryptedObj;

					return decryptedData;
				}

				throw new Error("could not decrypt");
			}).nodeify(cb);
		};
	};

	return encryptedDataObject;
});
