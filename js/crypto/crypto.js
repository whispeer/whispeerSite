/**
* The Main Crypto Interface
* Used to generate keys, encrypt/decrypt text and sign/verify text
* Also Used to encrypt a session Key for another user.
* @class
*/
define(["libs/sjcl", "config", "asset/helper", "libs/step"], function (sjcl, config, h, step) {
	"use strict";

	var crypto = {};

	/** Generate a Key
	* @param password The Password used to encrypt the key.
	* @param callback(privKey,pubKey) function to call when key generation is done.
	* @function
	* @public
	*/
	crypto.generateKey = function (password, callback) {
		if (typeof callback !== "function") {
			throw new Error("invalid call! Need Callback Function");
		}

		//TODO: chunking for non blocking execution even on browsers without worker
		var PrivateKey;
		step(function getWR() {
			require.wrap("crypto/waitForReadyDisplay", this);
		}, h.sF(function theWR(waitForReady) {
			waitForReady(this);
		}), h.sF(function ready() {
			require.wrap(["crypto/rsa", "crypto/privateKey"], this);
		}), h.sF(function theRSA(RSA, privK) {
			PrivateKey = privK;

			var rsa = new RSA();
			if (Modernizr.webworkers) {
				rsa.generateAsync(config.keyLength, "10001", this);
			} else {
				this(null, rsa.generate(config.keyLength, "10001"));
			}
		}), h.sF(function theKey(rsaKey) {
			var privKey = new PrivateKey(rsaKey, password);

			this(null, privKey);
		}), callback);
	};

	/** Encrypts a Text
	* @param keys an array of public keys for the receivers / one public key
	* @param message Message to encrypt
	* @return {sessionKeys: array of session keys encrypted with public keys, encryptedMessage: encrypted Message}
	* @public
	* @function
	**/
	crypto.asymEncryptText = function (keys, message, callback) {
		if (typeof callback !== "function") {
			throw new Error("invalid call! Need Callback Function");
		}

		var sessionKey, cryptedText, PublicKey, PrivateKey;
		step(function () {
			require.wrap("crypto/waitForReadyDisplay", this);
		}, h.sF(function theWR(waitForReady) {
			waitForReady(this);
		}), h.sF(function () {
			require.wrap(["crypto/publicKey", "crypto/privateKey", "crypto/sessionKey"], this);
		}), h.sF(function (pubK, privK, SessionKey) {
			PublicKey = pubK;
			PrivateKey = privK;
			//generate a session key or take the given one
			sessionKey = new SessionKey();
			crypto.symEncryptText(sessionKey, message, this);
		}), h.sF(function (encryptedText) {
			cryptedText = encryptedText;
			if (keys instanceof PublicKey || keys instanceof PrivateKey) {
				keys = [keys];
			}

			if (keys instanceof Array) {
				var i;
				for (i = 0; i < keys.length; i += 1) {
					if (keys[i] instanceof PublicKey || keys[i] instanceof PrivateKey) {
						sessionKey.getEncrypted(keys[i], this.parallel());
					} else {
						throw new Error("need a asym key");
					}
				}
			} else {
				throw new Error("need a asym key");
			}
		}), h.sF(function (encryptedKey) {
			if (encryptedKey.length !== keys.length) {
				throw new Error("keys got lost?");
			}

			var resultK = {};
			var i;
			for (i = 0; i < encryptedKey.length; i += 1) {
				resultK[keys[i].id()] = encryptedKey[i];
			}

			callback(null, resultK, cryptedText);
		}), callback);
	};

	crypto.symEncryptText = function (sessionKeys, message, callback, iv) {
		step(function () {
			require.wrap("crypto/waitForReadyDisplay", this);
		}, h.sF(function theWR(waitForReady) {
			waitForReady(this);
		}), h.sF(function () {
			if (sessionKeys instanceof Array) {
				var i;
				for (i = 0; i < sessionKeys.length; i += 1) {
					sessionKeys[i].encryptText(message, iv, this.parallel());
				}
			} else {
				sessionKeys.encryptText(message, iv, this);
			}
		}), callback);
	};

	crypto.symDecryptText = function (sessionKey, message, callback, iv) {
		step(function () {
			require.wrap("crypto/waitForReadyDisplay", this);
		}, h.sF(function theWR(waitForReady) {
			waitForReady(this);
		}), h.sF(function () {
			sessionKey.decryptText(message, iv, this);
		}), callback);
	};

	/** Decrypts a text.
	* @param privateKey private Key to decrypt with
	* @param message message to decrypt
	* @param sessionKey session Key used for decryption
	* @public
	* @function
	*/
	crypto.decryptText = function (privateKey, message, sessionKey, callback) {
		step(function () {
			require.wrap(["crypto/privateKey", "crypto/sessionKey"], this);
		}, h.sF(function (PrivateKey, SessionKey) {
			if (typeof sessionKey === "string") {
				sessionKey = new SessionKey(sessionKey);
			}

			if (privateKey instanceof PrivateKey && sessionKey instanceof SessionKey) {
				sessionKey.decryptKey(privateKey, this);
			} else {
				throw new Error("need correct keys!");
			}
		}), h.sF(function (success) {
			if (!success) {
				throw new Error("wrong private key");
			}

			if (typeof message === "object") {
				sessionKey.decryptText(message.ct, message.iv, this);
			} else {
				sessionKey.decryptText(message, undefined, this);
			}
		}), callback);
	};

	/** Sign a Text
	* @param privateKey private Key to sign with
	* @param message Message/Hash to sign
	* @param callback (optional) a callback to call with the results. non blocking
	* @public
	* @function
	*/
	crypto.signText = function (privateKey, message, callback) {
		step(function () {
			require.wrap(["crypto/waitForReadyDisplay", "crypto/privateKey"], this);
		}, h.sF(function theWR(waitForReady, PrivateKey) {
			if (!privateKey instanceof PrivateKey) {
				throw new Error("we need a private key!");
			}

			waitForReady(this);
		}), h.sF(function () {
			privateKey.signPSS(message, this);
		}), callback);
	};

	/** Verify A Signature.
	* @param publicKey publicKey of the sender.
	* @param message Hash of the Message to verify.
	* @param signature Signature send with the message.
	* @param callback (optional) a callback to call with the results. non blocking
	* @public
	* @function
	*/
	crypto.verifyText = function (publicKey, message, signature, callback) {
		step(function () {
			require.wrap(["crypto/waitForReadyDisplay", "crypto/privateKey", "crypto/publicKey"], this);
		}, h.sF(function theDeps(waitForReady, PrivateKey, PublicKey) {
			if (publicKey instanceof PrivateKey || publicKey instanceof PublicKey) {
				waitForReady(this);
			} else {
				throw new Error("we need a rsa key!");
			}
		}), h.sF(function ready() {
			publicKey.verifyPSS(message, signature, this);
		}), callback);
	};

	/**  removes leading 0. */
	crypto.r0 = function (number) {
		while (number.substr(0, 1) === "0") {
			number = number.substr(1);
		}

		return number;
	};

	/** Encrypt a session key
	* @param publicKey the public Key to encrypt the session Key with
	* @param sessionKey the session key to encrypt.
	* @param callback callback.
	* @param privateKey (optional) the private Key to decrypt the session Key if not already decrypted.
	* @public
	* @function
	*/
	crypto.encryptSessionKey = function (publicKey, sessionKey, callback, privateKey) {
		var SessionKey;
		step(function () {
			require.wrap(["crypto/waitForReadyDisplay", "crypto/sessionKey"], this);
		}, h.sF(function theDeps(waitForReady, sk) {
			SessionKey = sk;
			waitForReady(this);
		}), h.sF(function ready() {
			if (!(sessionKey instanceof SessionKey)) {
				sessionKey = new SessionKey(sessionKey);
			}

			sessionKey.decryptKey(privateKey, this);
		}), h.sF(function decr(decrypted) {
			if (!decrypted) {
				this.last(null, false);
			} else {
				sessionKey.getEncrypted(publicKey, this);
			}
		}), callback);
	};

	/** SHA256 of a string.
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