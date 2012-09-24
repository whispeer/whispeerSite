"use strict";

if (typeof (ssn) === "undefined") {
	var ssn = {};
}

if (typeof (ssn.crypto) === "undefined") {
	ssn.crypto = {};
}

/**
* @class
*/
ssn.crypto.publicKey = function (data) {
	/**
	* The ee parameter of this key.
	*/
	this.ee = null;
	/**
	* The n parameter of this key.
	*/
	this.n = null;
	/**
	* The ID of this key.
	*/
	this.id = null;

	/**
	* @private
	*/
	var pkGetJSON = function () {
		var endString =
			'{' +
			'"ee":"' + this.ee.toString(16) + '",' +
			'"n":"' + this.n.toString(16) + '",' +
			'"id":"' + this.id + '"' +
			'}';

		return endString;
	};

	/**
	* @private
	*/
	var pkReadFromJSON = function (data) {
		var jsonData;
		if (typeof data !== "object") {
			jsonData = jQuery.parseJSON(data);
		} else {
			jsonData = data;
		}

		if (jsonData === null || typeof jsonData.ee !== "string" || typeof jsonData.n !== "string") {
			return false;
		}

		this.ee = new BigInteger(jsonData.ee, 16);
		this.n = new BigInteger(jsonData.n, 16);
		this.id = jsonData.id;

		return true;
	};

	/**
	* @private
	*/
	var pkReadFromRSA = function (theKey) {
		this.ee = theKey.ee;
		this.n = theKey.n;
	};

	/**
	* read from rsa key object.
	* @function
	*/
	this.readFromRSA = pkReadFromRSA;
	/**
	* get json representation.
	* @function
	*/
	this.getJSON = pkGetJSON;
	/**
	* read from json representation.
	* @function
	*/
	this.readFromJSON = pkReadFromJSON;

	if (data !== null) {
		try {
			if (!this.readFromJSON(data)) {
				this.readFromRSA(data);
			}
		} catch (e) {
			ssn.logger.log(e);
		}
	}
};
