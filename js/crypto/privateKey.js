define(['libs/sjcl', 'asset/logger', 'jquery', 'crypto/publicKey', 'libs/step', 'asset/helper', 'libs/jquery.json.min'], function (sjcl, logger, $, PublicKey, step, h) {
	"use strict";
	/**
	* A private Key
	* @param data The (Encrypted) Data of this key
	* @param password (Optional) The Password to Decrypt the Encrypted Keydata.
	* @class
	*/
	var PrivateKey = function (data, password) {
		var publicKey = new PublicKey(data);
		var privateKey = this;

		var d = null;
		var p = null;
		var q = null;
		var u = null;

		/** publicKey functions */
		this.ee = function () {
			return publicKey.ee();
		};

		this.n = function () {
			return publicKey.n();
		};

		this.id = function () {
			return publicKey.id();
		};

		this.setID = function (theID) {
			return publicKey.setID(theID);
		};

		this.encryptOAEP = function (message, label, callback) {
			return publicKey.encryptOAEP(message, label, callback);
		};

		this.verifyPSS = function (message, signature, callback) {
			return publicKey.verifyPSS(message, signature, callback);
		};

		/** private key functions */


		this.decryptOAEP = function (message, l, callback) {
			step(function getLibs() {
				require.wrap(["crypto/rsa"], this);
			}, h.sF(function theLibs(RSA) {
				if (Modernizr.webworkers) {
					require.wrap("crypto/rsaWorkerInclude", this);
				} else {
					var rsa = new RSA();
					this.last(null, rsa.decryptOAEP(message, d, p, q, u, privateKey.n(), l));
				}
			}), h.sF(function theWorker(rsaWorker) {
				rsaWorker.decryptOAEP(message, d, p, q, u, privateKey.n(), l, this);
			}), callback);
		};

		/**
		* @private
		*/
		this.signPSS = function (message, callback) {
			step(function getLibs() {
				require.wrap(["crypto/rsa"], this);
			}, h.sF(function theLibs(RSA) {
				if (Modernizr.webworkers) {
					require.wrap("crypto/rsaWorkerInclude", this);
				} else {
					var rsa = new RSA();
					this.last(null, rsa.signPSS(message, d, p, q, u, privateKey.n()));
				}
			}), h.sF(function theWorker(rsaWorker) {
				rsaWorker.signPSS(message, d, p, q, u, privateKey.n(), this);
			}), callback);

			//return RSAObject.signPSS(message, d, p, q, u, privateKey.n());
		};

		/**
		* @private
		*/
		var pkReadFromRSA = function (theKey) {
			d = theKey.d;
			p = theKey.p;
			q = theKey.q;
			u = theKey.u;
		};

		/**
		* @private
		*/
		var pkGetEncrypted = function () {
			var privatePart = {
				d: d.toString(16),
				p: p.toString(16),
				q: q.toString(16),
				u: u.toString(16)
			};

			var endString =
				'{' +
				'"ee":"' + this.ee().toString(16) + '",' +
				'"n":"' + this.n().toString(16) + '",' +
				'"id":"' + this.id() + '",' +
				'"priv":' + sjcl.json.encrypt(password, sjcl.json.encode(privatePart)) +
				'}';

			return endString;
		};

		/**
		* @private
		*/
		var pkReadEncrypted = function (encryptedKey) {
			var jsonData = $.parseJSON(encryptedKey);

			if (jsonData === null) {
				return false;
			}

			var privatePartEnc = $.toJSON(jsonData.priv);

			var decryptedPrivate = sjcl.json.decrypt(password, privatePartEnc);

			var privatePart = $.parseJSON(decryptedPrivate);

			d = privatePart.d;
			p = privatePart.p;
			q = privatePart.q;
			u = privatePart.u;

			return true;
		};

		/**
		* @private
		*/
		var pkSetPassword = function (oldPassword, newPassword) {
			if (oldPassword === password) {
				password = newPassword;
				return true;
			}

			return false;
		};

		/**
		* Set a new password for this key.
		* @param oldPassword the old password.
		* @param newPassword the new password.
		* @function
		*/
		this.setPassword = pkSetPassword;
		/**
		* read from encrypted json representation.
		* @param encryptedKey the encrypted key.
		* @function
		*/
		this.readEncrypted = pkReadEncrypted;
		/**
			Get the encrypted key.
			@return: JSON String with ee, n and encrypted(d,p,q,u)
			@function
		*/
		this.getEncrypted = pkGetEncrypted;
		/**
			Get the encrypted key.
			@return: JSON String with ee, n and encrypted(d,p,q,u)
			@function
		*/
		this.getJSON = pkGetEncrypted;
		/**
		* Read from RSA Key Object.
		* @param theKey the key object to read from.
		* @function
		*/
		this.readFromRSA = pkReadFromRSA;

		if (data !== null) {
			try {
				if (!this.readEncrypted(data)) {
					this.readFromRSA(data);
				}
			} catch (e) {
				logger.log(e);
				throw e;
			}
		}
	};

	return PrivateKey;
});