define(['jquery', 'libs/sjcl', 'crypto/jsbn', 'asset/logger', 'asset/config', 'crypto/rsa', 'crypto/privateKey', 'crypto/publicKey', 'crypto/jsbn2', 'libs/jquery.json.min'], function ($, sjcl, BigInteger, logger, config, RSA, PrivateKey, PublicKey) {
	"use strict";

	/**
	* a session Key
	* @class
	*/
	var SessionKey = function (key) {
		/** the rsa encrypted session key
		* @private
		*/
		var sessionKey = "";
		/** the decrypted session key
		* @private
		*/
		var decryptedSessionKey = "";
		/** Was the session key already decrypted
		* @private
		*/
		var decrypted = false;

		var that = this;

		if (typeof key !== "undefined") {
			sessionKey = key;
		} else {
			try {
				decryptedSessionKey = sjcl.codec.hex.fromBits(sjcl.random.randomWords(8, config.paranoia), 0);
				while (new BigInteger(decryptedSessionKey, 16).toString(16) !== decryptedSessionKey) {
					logger.log("Session Key invalid!");
					decryptedSessionKey = sjcl.codec.hex.fromBits(sjcl.random.randomWords(8, config.paranoia), 0);
				}
				decrypted = true;
			} catch (e) {
				logger.log(e);
				throw e;
			}
		}

		var skGetOriginal = function () {
			return sessionKey;
		};

		/**
		* @private
		*/
		var skDecryptKey = function (privateKey, callback) {
			if (typeof callback === "function") {
				setTimeout(function () {
					crypto.waitForReady(function () {
						callback(that.decryptKey(privateKey), true);
					});
				}, 1);
			} else {
				if (callback !== true) {
					//logger.log("decryptKey called without callback");
				}

				if (!decrypted) {
					var keyAsBigInt = new BigInteger(sessionKey, 16);

					if (privateKey instanceof PrivateKey) {
						logger.log("decryptKey Asym", logger.NOTICE);
						var result = privateKey.decryptOAEP(keyAsBigInt, "Socialize");
						if (result !== false) {
							decrypted = true;
							decryptedSessionKey = result.toString(16);
							while (decryptedSessionKey.length < 64) {
								decryptedSessionKey = "0" + decryptedSessionKey;
							}
							return true;
						}

						return false;
					}

					if (privateKey instanceof SessionKey) {
						logger.log("decryptKey Sym", logger.NOTICE);
						try {
							if (typeof sessionKey === "object") {
								sessionKey = $.toJSON(sessionKey);
							}

							decryptedSessionKey = privateKey.decryptText(sessionKey);

							if (decryptedSessionKey !== false) {
								decrypted = true;
							}

							while (decryptedSessionKey.length < 64) {
								decryptedSessionKey = "0" + decryptedSessionKey;
							}

							return true;
						} catch (e) {
							logger.log(e, logger.ERROR);
							return false;
						}
					}

					logger.log(privateKey);
					logger.log({});
					throw new exception.needPrivateKey("Session Key Decryption Failed.");
				}
				return true;
			}
		};

		var skIsSymKey = function () {
			var internal = sessionKey;
			if (typeof internal === "string") {
				var internal2;
				try {
					internal2 = $.parseJSON(sessionKey);
					if (typeof internal2 === "undefined" || internal2 === null) {
						return false;
					}
				} catch (e) {
					return false;
				}


				internal = internal2;
			}

			if (typeof internal === "object") {
				if (typeof internal.iv === "string" && typeof internal.ct === "string") {
					return true;
				}
			}

			return false;
		};

		/**
		* @private
		*/
		var skGetEncrypted = function (publicKey) {
			if (!decrypted) {
				return false;
			}

			if (publicKey instanceof PublicKey || publicKey instanceof PrivateKey) {
				var rsa = new RSA();
				var encryptedKey = rsa.encryptOAEP(new BigInteger(decryptedSessionKey, 16), publicKey.ee, publicKey.n, "Socialize").toString(16);
				return encryptedKey;
			}

			if (publicKey instanceof SessionKey) {
				return publicKey.encryptText(decryptedSessionKey);
			}

			return false;
		};

		/**
		* @private
		*/
		var skDecryptText = function (encryptedText, iv, callback) {
			if (decrypted) {
				if (typeof callback === "function") {
					//TODO: worker in closer.
					//crypto.decryptSJCLWorker(decryptedSessionKey, encryptedText, iv, callback);
				} else {
					if (typeof iv === "undefined") {
						return sjcl.decrypt(sjcl.codec.hex.toBits(decryptedSessionKey), encryptedText);
					}

					return sjcl.decrypt(sjcl.codec.hex.toBits(decryptedSessionKey), encryptedText, {"iv": iv});
				}
			}

			return false;
		};

		/**
		* @private
		*/
		var skEncryptText = function (plainText, iv, callback) {
			if (decrypted) {
				if (typeof callback === "function") {
					//TODO: worker in closure.
					//crypto.encryptSJCLWorker(decryptedSessionKey, plainText, iv, callback);

					return true;
				}

				var encryptedText;
				if (typeof iv === "undefined") {
					encryptedText = sjcl.encrypt(sjcl.codec.hex.toBits(decryptedSessionKey), plainText);
				} else {
					encryptedText = sjcl.encrypt(sjcl.codec.hex.toBits(decryptedSessionKey), plainText, {"iv": iv});
				}

				encryptedText = $.parseJSON(encryptedText);
				var result = {"iv": encryptedText.iv, "ct": encryptedText.ct};

				return $.toJSON(result);
			}

			if (typeof callback === "function") {
				callback(false);
			}

			return false;
		};

		/** Get the originally initialized key value */
		this.getOriginal = skGetOriginal;

		/** Is this key symmetrically encrypted?
		* @return true: symmetrically encrypted key; false: asymmetrically encrypted key
		*/
		this.isSymKey = skIsSymKey;
		/**
		* Decrypt the Key
		* @param privateKey the Private key to use for decryption
		* @throws ssn.exception.needPrivateKey Private Key is not an instance of ssn.crypto.privateKey
		* @return true: Decryption Successfull; False: Wrong Private Key
		*/
		this.decryptKey = skDecryptKey;
		/**
		* Get encrypted version of session Key
		* @param publicKey the public Key to encrypt with.
		*/
		this.getEncrypted = skGetEncrypted;
		/**
		* Encrypt Text with this session Key
		* @param plainText the plaintext to encrypt
		*/
		this.encryptText = skEncryptText;
		/**
		* Decrypt a text with this session Key
		* @param encryptedText the text to decrypt
		*/
		this.decryptText = skDecryptText;
	};

	return SessionKey;
});