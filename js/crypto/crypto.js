/**
* The Main Crypto Interface
* Used to generate keys, encrypt/decrypt text and sign/verify text
* Also Used to encrypt a session Key for another user.
* @class
*/
define(["libs/sjcl", "asset/logger", "config", "crypto/rsa", "crypto/waitForReady", "crypto/privateKey", "crypto/publicKey", "crypto/sessionKey"], function (sjcl, logger, config, RSA, waitForReady, PrivateKey, PublicKey, SessionKey) {
	"use strict";

	var crypto = {};

	/**
	* Generate a Key
	* @param password The Password used to encrypt the key.
	* @param callback(privKey,pubKey) function to call when key generation is done.
	* @function
	* @public
	*/
	crypto.generate_Key = function (password, callback) {
		var rsa = new RSA();
		if (typeof callback === "function") {
			if (Modernizr.webworkers) {
				waitForReady(function () {
					rsa.generateAsync(config.keyLength, "10001", function (rsaKey) {
						var privKey = new PrivateKey(rsaKey, password);
						var pubKey = new PublicKey(rsaKey);

						callback(privKey, pubKey);
					});
				});
			} else {
				setTimeout(function () {
					waitForReady(function () {
						var keys = crypto.generate_Key(password);
						callback(keys.privateKey, keys.publicKey);
					});
				}, 1);
			}
		} else {
			var rsaKey = rsa.generate(config.keyLength, "10001");

			var privKey = new PrivateKey(rsaKey, password);
			var pubKey = new PublicKey(rsaKey);

			return {privateKey: privKey, publicKey: pubKey};
		}
	};

	/**
	* Encrypts a Text
	* @param keys an array of public keys for the receivers / one public key
	* @param message Message to encrypt
	* @return {sessionKeys: array of session keys encrypted with public keys, encryptedMessage: encrypted Message} if keys = sessionKey encryptedMessage is returned
	* @public
	* @function
	**/
	crypto.encryptText = function (keys, message, callback) {
		if (typeof callback === "function") {
			setTimeout(function () {
				waitForReady(function () {
					callback(crypto.encryptText(keys, message));
				});
			}, 1);
		} else {
			var i = 0, result = {};
			if (typeof keys === "object") {
				if (keys) {
					//generate a session key.
					//encrypt message with session key
					var sessionKey;

					if (keys instanceof SessionKey) {
						sessionKey = keys;
					} else {
						sessionKey = new SessionKey();
					}

					var encrMessage = SessionKey.encryptText(message);

					if (keys instanceof Array) {
						//sessionKey is the BigInteger holding the session key.
						//encrypt session key with keys
						for (i = 0; i < keys.length; i += 1) {
							result[keys[i].id] = SessionKey.getEncrypted(keys[i]);
						}
					} else if (keys instanceof PublicKey) {
						//encrypt session key with publicKey
						result[keys.id] = SessionKey.getEncrypted(keys);
					}

					if (keys instanceof SessionKey) {
						return encrMessage;
					}

					return {sessionKeys: result, EM: encrMessage};
				}
			}

			return false;
		}
	};

	/**
	* Decrypts a text.
	* @param privateKey private Key to decrypt with
	* @param message message to decrypt
	* @param sessionKey session Key used for decryption
	* @public
	* @function
	*/
	crypto.decryptText = function (privateKey, message, sessionKey, callback) {
		if (typeof callback === "function") {
			setTimeout(function () {
				callback(crypto.decryptText(privateKey, message, sessionKey));
			}, 1);
		} else {
			if (!(sessionKey instanceof sessionKey)) {
				sessionKey = new SessionKey(sessionKey);
			}

			if (sessionKey.decryptKey(privateKey)) {
				if (typeof message === "object") {
					return sessionKey.decryptText(message.ct, message.iv);
				}

				return sessionKey.decryptText(message);
			}

			return false;
		}
	};

	/**
	* Sign a Text
	* @param privateKey private Key to sign with
	* @param message Message/Hash to sign
	* @param callback (optional) a callback to call with the results. non blocking
	* @public
	* @function
	*/
	crypto.signText = function (privateKey, message, callback) {
		if (typeof callback === "function") {
			waitForReady(function () {
				callback(crypto.signText(privateKey, message));
			});
		} else {
			var hash = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(message));
			return privateKey.sign(hash).toString(16);
		}
	};

	/**
	* Verify A Signature.
	* @param publicKey publicKey of the sender.
	* @param message Hash of the Message to verify.
	* @param signature Signature send with the message.
	* @param callback (optional) a callback to call with the results. non blocking
	* @public
	* @function
	*/
	crypto.verifyText = function (publicKey, message, signature, callback) {
		if (typeof callback === "function") {
			setTimeout(function () {
				callback(crypto.verifyText(publicKey, message, signature));
			}, 1);
		} else {
			//signature = new BigInteger(signature, 16);
			var real_hash = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(message));
			var rsa = new RSA();
			return rsa.verifyPSS(real_hash, signature, publicKey.ee, publicKey.n);
		}
	};

	/**
	* removes leading 0.
	*/
	crypto.r0 = function (number) {
		while (number.substr(0, 1) === "0") {
			number = number.substr(1);
		}

		return number;
	};

	/**
	* Encrypt a session key
	* @param publicKey the public Key to encrypt the session Key with
	* @param sessionKey the session key to encrypt.
	* @param privateKey (optional) the private Key to decrypt the session Key if not already decrypted.
	* @param callback (optional) a callback to call with the results. non blocking
	* @public
	* @function
	*/
	crypto.encryptSessionKey = function (publicKey, sessionKey, privateKey, callback) {
		if (typeof callback === "function") {
			setTimeout(function () {
				waitForReady(function () {
					callback(crypto.encryptSessionKey(publicKey, sessionKey, privateKey));
				});
			}, 1);
		} else {
			var time = new Date();
			if (!(sessionKey instanceof sessionKey)) {
				sessionKey = new SessionKey(sessionKey);
			}

			if (sessionKey.decryptKey(privateKey)) {
				logger.log("SKey Decrypted:" + ((new Date().getTime()) - time));
				var result = sessionKey.getEncrypted(publicKey);
				logger.log("SKey ReEncrypted:" + ((new Date().getTime()) - time));
				return result;
			}

			return false;
		}
	};

	/**
	* SHA256 of a string.
	* @param text text to calculate sha256 from
	* @return sha256(text)
	* @public
	* @function
	*/
	crypto.sha256 = function (text) {
		return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(text));
	};

	return crypto;
});