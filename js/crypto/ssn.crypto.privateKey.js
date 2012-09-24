"use strict";

if (typeof (ssn) === "undefined") {
	var ssn = {};
}

if (typeof (ssn.crypto) === "undefined") {
	ssn.crypto = {};
}

/**
* A private Key
* @param data The (Encrypted) Data of this key
* @param password (Optional) The Password to Decrypt the Encrypted Keydata.
* @class
*/
ssn.crypto.privateKey = function (data, password) {
	this.ee = null;
    this.n = null;
	this.id = null;

	var RSAObject = new RSA();

    var d = null;
    var p = null;
    var q = null;
    var u = null;

	/**
	* @private
	*/
	var pkDecrypt = function (message) {
		return RSAObject.decryptcrt(message, d, p, q, u);
	};

	var pkDecryptOAEP = function (message, l) {
		return RSAObject.decryptOAEP(message, d, p, q, u, this.n, l);
	};

	/**
	* @private
	*/
	var pkSign = function (message) {
		return RSAObject.signPSS(message, d, p, q, u, this.n)
	};

	/**
	* @private
	*/
	var pkReadFromRSA = function (theKey) {
		this.ee = theKey.ee;
		this.n = theKey.n;

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
			'"ee":"' + this.ee.toString(16) + '",' +
			'"n":"' + this.n.toString(16) + '",' +
			'"id":"' + this.id + '",' +
			'"priv":' + sjcl.json.encrypt(password, sjcl.json.encode(privatePart)) +
			'}';

		return endString;
	};

	/**
	* @private
	*/
	var pkReadEncrypted = function (encryptedKey) {
		var jsonData = jQuery.parseJSON(encryptedKey);

		if (jsonData === null) {
			return false;
		}

		this.ee = new BigInteger(jsonData.ee, 16);
		this.n = new BigInteger(jsonData.n, 16);
		this.id = jsonData.id;

		var privatePartEnc = $.toJSON(jsonData.priv);

		var decryptedPrivate = sjcl.json.decrypt(password, privatePartEnc);

		var privatePart = jQuery.parseJSON(decryptedPrivate);

		d = new BigInteger(privatePart.d, 16);
		p = new BigInteger(privatePart.p, 16);
		q = new BigInteger(privatePart.q, 16);
		u = new BigInteger(privatePart.u, 16);

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
	/**
	* Sign a  message with this key.
	* @param message the message to sign
	* @function
	*/
	this.sign = pkSign;

	this.decryptOAEP = pkDecryptOAEP;

	/**
	* decrypt a message.
	* @param message the message to decrypt.
	* @function
	*/
	this.decrypt = pkDecrypt;

	if (data !== null) {
		try {
			if (!this.readEncrypted(data)) {
				this.readFromRSA(data);
			}
		} catch (e) {
			ssn.logger.log(e);
			throw e;
		}
	}
};