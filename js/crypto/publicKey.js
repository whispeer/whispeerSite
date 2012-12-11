define(['jquery', 'crypto/jsbn', 'asset/logger', 'libs/step', 'asset/helper', 'libs/jquery.json.min', 'crypto/jsbn2'], function ($, BigInteger, logger, step, h) {
	"use strict";

	/**
	* @class
	*/
	var PublicKey = function (data) {
		/**
		* The ee parameter of this key.
		*/
		var ee = null;
		/**
		* The n parameter of this key.
		*/
		var n = null;
		/**
		* The ID of this key.
		*/
		var id = null;

		this.id = function () {
			return id;
		};

		this.ee = function () {
			return ee;
		};

		this.n = function () {
			return n;
		};

		this.setID = function (theID) {
			if (!id) {
				id = theID;
				return true;
			}

			return false;
		};

		this.encryptOAEP = function (message, label, callback) {
			step(function getLibs() {
				require.wrap(["crypto/rsa"], this);
			}, h.sF(function theLibs(RSA) {
				if (Modernizr.webworkers) {
					require.wrap("crypto/rsaWorkerInclude", this);
				} else {
					var rsa = new RSA();
					this.last(null, rsa.encryptOAEP(message, ee, n, label));
				}
			}), h.sF(function theWorker(rsaWorker) {
				rsaWorker.encryptOAEP(message, ee, n, label, this);
			}), callback);
		};

		this.verifyPSS = function (message, signature, callback) {
			var realHash;
			step(function getLibs() {
				require.wrap(["libs/sjcl", "crypto/rsa"], this);
			}, h.sF(function theLibs(sjcl, RSA) {
				realHash = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(message));
				if (Modernizr.webworkers) {
					require.wrap("crypto/rsaWorkerInclude", this);
				} else {
					var rsa = new RSA();
					this.last(null, rsa.verifyPSS(realHash, signature, ee, n));
				}
			}), h.sF(function theWorker(rsaWorker) {
				rsaWorker.verifyPSS(realHash, signature, ee, n, this);
			}), callback);
		};

		/**
		* @private
		*/
		var pkGetJSON = function () {
			var endString =
				'{' +
				'"ee":"' + ee.toString(16) + '",' +
				'"n":"' + n.toString(16) + '",' +
				'"id":"' + id + '"' +
				'}';

			return endString;
		};

		/**
		* @private
		*/
		var pkReadFromJSON = function (data) {
			var jsonData;
			if (typeof data !== "object") {
				jsonData = $.parseJSON(data);
			} else {
				jsonData = data;
			}

			if (jsonData === null || typeof jsonData.ee !== "string" || typeof jsonData.n !== "string") {
				return false;
			}

			ee = new BigInteger(jsonData.ee, 16);
			n = new BigInteger(jsonData.n, 16);
			id = jsonData.id;

			return true;
		};

		/**
		* @private
		*/
		var pkReadFromRSA = function (theKey) {
			ee = theKey.ee;
			n = theKey.n;
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

		if (data !== null) {
			try {
				if (!pkReadFromJSON(data)) {
					pkReadFromRSA(data);
				}
			} catch (e) {
				logger.log(e);
			}
		}
	};

	return PublicKey;
});