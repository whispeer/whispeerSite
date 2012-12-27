define(['jquery', 'libs/sjcl', 'crypto/jsbn', 'asset/logger', 'config', 'asset/helper', 'libs/step', 'libs/jquery.json.min'], function ($, sjcl, BigInteger, logger, config, h, step) {
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

		/** Get the originally initialized key value */
		this.getOriginal = function () {
			return sessionKey;
		};

		/**
		* @private
		*/
		var skDecryptKey = function (privateKey, callback) {
			if (typeof callback === "function") {
				var keyAsBigInt;

				step(function loadDeps() {
					if (decrypted) {
						this.last(null, true);
					} else {
						require.wrap(["crypto/privateKey", "asset/exceptions"], this);
					}
				}, h.sF(function (PrivateKey, exceptions) {
					if (privateKey instanceof PrivateKey) {
						keyAsBigInt = new BigInteger(sessionKey, 16);
						logger.log("decryptKey Asym", logger.NOTICE);
						step(function decrypt() {
							privateKey.decryptOAEP(keyAsBigInt, "Socialize", this);
						}, h.sF(function decryptedF(result) {
							if (result !== false) {
								decryptedSessionKey = result.toString(16);
								decrypted = true;

								while (decryptedSessionKey.length < 64) {
									decryptedSessionKey = "0" + decryptedSessionKey;
								}
							}

							this(null, decrypted);
						}), callback);
					} else if (privateKey instanceof SessionKey) {
						logger.log("decryptKey Sym", logger.NOTICE);
						step(function () {
							if (typeof sessionKey !== "object") {
								sessionKey = $.toJSON(sessionKey);
							}

							decryptedSessionKey = privateKey.decryptText(sessionKey, this);
						}, h.sF(function decryptedF(decryptedKey) {
							if (decryptedKey !== false) {
								decryptedSessionKey = decryptedKey;
								decrypted = true;

								while (decryptedSessionKey.length < 64) {
									decryptedSessionKey = "0" + decryptedSessionKey;
								}
							}

							this(null, decrypted);
						}), callback);
					} else {
						throw new exceptions.needPrivateKey("Session Key Decryption Failed.");
					}
				}), callback);
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
		var skGetEncrypted = function (key, callback) {
			step(function () {
				if (decrypted) {
					require.wrap(["crypto/publicKey", "crypto/privateKey"], this);
				} else {
					this.last(null, false);
				}
			}, h.sF(function (PublicKey, PrivateKey) {
				if (key instanceof PublicKey || key instanceof PrivateKey) {
					key.encryptOAEP(new BigInteger(decryptedSessionKey, 16), "Socialize", this);
				} else if (key instanceof SessionKey) {
					key.encryptText(decryptedSessionKey, this);
				} else {
					this(null, false);
				}
			}), h.sF(function (result) {
				if (result instanceof BigInteger) {
					result = result.toString(16);
				}

				this(null, result);
			}), callback);
		};

		/**
		* @private
		*/
		var skDecryptText = function (encryptedText, iv, callback) {
			if (typeof iv === "function") {
				callback = iv;
				iv = undefined;
			}

			step(function go() {
				if (decrypted && typeof callback === "function") {
					if (Modernizr.webworkers) {
						require.wrap("crypto/sjclWorkerInclude", this);
					} else {
						var result;
						try {
							if (typeof encryptedText !== "string") {
								$.toJSON(encryptedText);
							}

							if (typeof iv === "undefined") {
								result = sjcl.decrypt(sjcl.codec.hex.toBits(decryptedSessionKey), encryptedText);
							} else {
								result = sjcl.decrypt(sjcl.codec.hex.toBits(decryptedSessionKey), encryptedText, {"iv": iv});
							}
						} catch (e) {
							result = false;
						}

						this.last(null, result);
					}
				} else {
					this.last(null, false);
				}
			}, h.sF(function (sjclWorker) {
				sjclWorker.decryptSJCLWorker(decryptedSessionKey, encryptedText, iv, this);
			}), callback);
		};

		/**
		* @private
		*/
		var skEncryptText = function (plainText, iv, callback) {
			if (typeof iv === "function") {
				callback = iv;
				iv = undefined;
			}

			step(function go() {
				if (decrypted && typeof callback === "function") {
					if (Modernizr.webworkers) {
						require.wrap("crypto/sjclWorkerInclude", this);
					} else {
						var result;
						try {
							if (typeof iv === "undefined") {
								result = sjcl.encrypt(sjcl.codec.hex.toBits(decryptedSessionKey), plainText);
							} else {
								result = sjcl.encrypt(sjcl.codec.hex.toBits(decryptedSessionKey), plainText, {"iv": iv});
							}
						} catch (e) {
							result = false;
						}

						result = $.parseJSON(result);
						result = {"iv": result.iv, "ct": result.ct};
						result = $.toJSON(result);
						this.last(null, result);
					}
				} else {
					this.last(null, false);
				}
			}, h.sF(function (sjclWorker) {
				sjclWorker.encryptSJCLWorker(decryptedSessionKey, plainText, iv, this);
			}), h.sF(function (result) {
				result = $.parseJSON(result);
				result = {"iv": result.iv, "ct": result.ct};
				result = $.toJSON(result);
				this(null, result);
			}), callback);
		};

		this.decrypted = function () {
			return decrypted;
		};

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