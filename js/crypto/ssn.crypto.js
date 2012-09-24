"use strict";

if (typeof (ssn) === "undefined") {
	var ssn = {};
}

/**
* The Main Crypto Interface
* Used to generate keys, encrypt/decrypt text and sign/verify text
* Also Used to encrypt a session Key for another user.
* @class
*/
ssn.crypto = {
	/**
	* Generate a Key
	* @param password The Password used to encrypt the key.
	* @param callback(privKey,pubKey) function to call when key generation is done.
	* @function
	* @public
	*/
	generate_Key: function (password, callback) {
		var rsa = new RSA();
		if (typeof callback === "function") {
			if (Modernizr.webworkers) {
				ssn.crypto.waitForReady(function () {
					rsa.generateAsync(ssn.config.keyLength, "10001", function (rsaKey) {
						var privKey = new ssn.crypto.privateKey(rsaKey, password);
						var pubKey = new ssn.crypto.publicKey(rsaKey);

						callback(privKey, pubKey);
					});
				});
			} else {
				setTimeout(function () {
					ssn.crypto.waitForReady(function () {
						var keys = ssn.crypto.generate_Key(password);
						callback(keys.privateKey, keys.publicKey);
					});
				}, 1);
			}
		} else {
			var rsaKey = rsa.generate(ssn.config.keyLength, "10001");

			var privKey = new ssn.crypto.privateKey(rsaKey, password);
			var pubKey = new ssn.crypto.publicKey(rsaKey);

			return {privateKey: privKey, publicKey: pubKey};
		}
	},

	/**
	* Encrypts a Text
	* @param keys an array of public keys for the receivers / one public key
	* @param message Message to encrypt
	* @return {sessionKeys: array of session keys encrypted with public keys, encryptedMessage: encrypted Message} if keys = sessionKey encryptedMessage is returned
	* @public
	* @function
	**/
	encryptText: function (keys, message, callback) {
		if (typeof callback === "function") {
			setTimeout(function () {
				ssn.crypto.waitForReady(function () {
					callback(ssn.crypto.encryptText(keys, message));
				});
			}, 1);
		} else {
			var i = 0, result = {};
			if (typeof keys === "object") {
				if (keys) {
					//generate a session key.
					//encrypt message with session key
					var sessionKey;

					if (keys instanceof ssn.crypto.sessionKey) {
						sessionKey = keys;
					} else {
						sessionKey = new ssn.crypto.sessionKey();
					}

					var encrMessage = sessionKey.encryptText(message);

					if (keys instanceof Array) {
						//sessionKey is the BigInteger holding the session key.
						//encrypt session key with keys
						for (i = 0; i < keys.length; i += 1) {
							result[keys[i].id] = sessionKey.getEncrypted(keys[i]);
						}
					} else if (keys instanceof ssn.crypto.publicKey) {
						//encrypt session key with publicKey
						result[keys.id] = sessionKey.getEncrypted(keys);
					}

					if (keys instanceof ssn.crypto.sessionKey) {
						return encrMessage;
					}

					return {sessionKeys: result, EM: encrMessage};
				}
			}

			return false;
		}
	},

	/**
	* Decrypts a text.
	* @param privateKey private Key to decrypt with
	* @param message message to decrypt
	* @param sessionKey session Key used for decryption
	* @public
	* @function
	*/
	decryptText: function (privateKey, message, sessionKey, callback) {
		if (typeof callback === "function") {
			setTimeout(function () {
				callback(ssn.crypto.decryptText(privateKey, message, sessionKey));
			}, 1);
		} else {
			if (!(sessionKey instanceof ssn.crypto.sessionKey)) {
				sessionKey = new ssn.crypto.sessionKey(sessionKey);
			}

			if (sessionKey.decryptKey(privateKey)) {
				if (typeof message === "object") {
					return sessionKey.decryptText(message.ct, message.iv);
				}

				return sessionKey.decryptText(message);
			}

			return false;
		}
	},

	/**
	* Sign a Text
	* @param privateKey private Key to sign with
	* @param message Message/Hash to sign
	* @param callback (optional) a callback to call with the results. non blocking
	* @public
	* @function
	*/
	signText: function (privateKey, message, callback) {
		if (typeof callback === "function") {
			ssn.crypto.waitForReady(function () {
				callback(ssn.crypto.signText(privateKey, message));
			});
		} else {
			var hash = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(message));
			return privateKey.sign(hash).toString(16);
		}
	},

	/**
	* Verify A Signature.
	* @param publicKey publicKey of the sender.
	* @param message Hash of the Message to verify.
	* @param signature Signature send with the message.
	* @param callback (optional) a callback to call with the results. non blocking
	* @public
	* @function
	*/
	verifyText: function (publicKey, message, signature, callback) {
		if (typeof callback === "function") {
			setTimeout(function () {
				callback(ssn.crypto.verifyText(publicKey, message, signature));
			}, 1);
		} else {
			signature = new BigInteger(signature, 16);
			var real_hash = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(message));
			var rsa = new RSA();
			return rsa.verifyPSS(real_hash, signature, publicKey.ee, publicKey.n);
		}
	},

	/**
	* Wait until randomizer is ready.
	* calls callback if randomizer is ready.
	*/
	waitForReady: function (callback) {
		if (sjcl.random.isReady()) {
			callback();
		} else {
			ssn.logger.log("Not yet ready!");
			ssn.display.showNotReadyWarning();
			sjcl.random.addEventListener("seeded", function () {
				ssn.display.hideNotReadyWarning();
				ssn.logger.log("Lets go!");

				callback();
			});
		}
	},

	/**
	* removes leading 0.
	*/
	r0: function (number) {
		while (number.substr(0, 1) === "0") {
			number = number.substr(1);
		}

		return number;
	},

	/**
	* Encrypt a session key
	* @param publicKey the public Key to encrypt the session Key with
	* @param sessionKey the session key to encrypt.
	* @param privateKey (optional) the private Key to decrypt the session Key if not already decrypted.
	* @param callback (optional) a callback to call with the results. non blocking
	* @public
	* @function
	*/
	encryptSessionKey: function (publicKey, sessionKey, privateKey, callback) {
		if (typeof callback === "function") {
			setTimeout(function () {
				ssn.crypto.waitForReady(function () {
					callback(ssn.crypto.encryptSessionKey(publicKey, sessionKey, privateKey));
				});
			}, 1);
		} else {
			var time = new Date();
			if (!(sessionKey instanceof ssn.crypto.sessionKey)) {
				sessionKey = new ssn.crypto.sessionKey(sessionKey);
			}

			if (sessionKey.decryptKey(privateKey)) {
				ssn.logger.log("SKey Decrypted:" + ((new Date().getTime()) - time));
				var result = sessionKey.getEncrypted(publicKey);
				ssn.logger.log("SKey ReEncrypted:" + ((new Date().getTime()) - time));
				return result;
			}

			return false;
		}
	},

	/**
	* SHA256 of a string.
	* @param text text to calculate sha256 from
	* @return sha256(text)
	* @public
	* @function
	*/
	sha256: function (text) {
		return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(text));
	}
};