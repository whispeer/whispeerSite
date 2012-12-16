"use strict";
// GPG4Browsers - An OpenPGP implementation in javascript
// Copyright (C) 2011 Recurity Labs GmbH
// 
// This library is free software; you can redistribute it and/or
// modify it under the terms of the GNU Lesser General Public
// License as published by the Free Software Foundation; either
// version 2.1 of the License, or (at your option) any later version.
// 
// This library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.
// 
// You should have received a copy of the GNU Lesser General Public
// License along with this library; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
//
// RSA implementation
define(['libs/sjcl', 'config', 'crypto/jsbn', 'crypto/jsbn2'], function (sjcl, config, BigInteger) {
	function SecureRandom() {
		function nextBytes(byteArray) {
			var n;
			for (n = 0; n < byteArray.length; n = n + 1) {
				byteArray[n] = sjcl.random.randomWords(1, config.paranoia)[0];
			}
		}
		this.nextBytes = nextBytes;
	}

	//length is in octets
	function secureRandomLength(length) {
		return sjcl.codec.hex.fromBits(sjcl.random.randomWords(Math.ceil(length / 4), config.paranoia)).substring(0, length * 2);
	}

	function sha256(text) {
		return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(text));
	}

	var RSA = function () {
		var hlen = 32;
		var slen = 8;

		function I2OSP(number, length) {
			if (typeof number === "number") {
				number = new BigInteger(number.toString(10), 10);
			}

			if (typeof length === "undefined") {
				return number.toString(16);
			}

			var value = number.toString(16);
			if (value.length > length * 2) {
				return false;
			}

			while (value.length < length * 2) {
				value = "0" + value;
			}

			return value;
		}

		function OS2IP(value) {
			return new BigInteger(value, 16);
		}

		function xor(v1, v2, length) {
			return I2OSP(OS2IP(v1).xor(OS2IP(v2)), length);
		}

		/**
		* generates a mask of len maskLen with seed mgfSeed
		* @param mgfSeed octet string
		* @param maskLen length of output octet string
		*/
		function MGF1(mgfSeed, maskLen) {
			var T = "";
			var C = "";

			var i = 0;
			for (i = 0; i <= Math.ceil(maskLen / hlen) - 1; i += 1) {
				C = I2OSP(i, 4);

				T = T + sha256(mgfSeed + C);
			}

			T = T.substring(0, maskLen * 2);

			return T;
		}

		/**
		 * This function uses jsbn Big Num library to decrypt RSA
		 * @param m
		 *            message
		 * @param d
		 *            RSA d as BigInteger
		 * @param p
		 *            RSA p as BigInteger
		 * @param q
		 *            RSA q as BigInteger
		 * @param u
		 *            RSA u as BigInteger
		 * @return
		 */
		function decrypt(m, d, n) {
			return m.modPow(d, n);
		}

		function decryptcrt(m, d, p, q, u) {
			var dp = d.mod(p.subtract(BigInteger.ONE));
			var dq = d.mod(q.subtract(BigInteger.ONE));

			var m1 = m.modPow(dp, p);
			var m2 = m.modPow(dq, q);

			var s = u.multiply(m1.subtract(m2)).mod(p).multiply(q).add(m2);

			return s;
		}

		function decryptOAEP(c, d, p, q, u, n, l) {
			//octet length of n
			var k = Math.ceil(I2OSP(n).length / 2);

			//octet length of message
			var cLen = Math.ceil(I2OSP(c).length / 2);

			if (k < 2 * hlen + 2) {
				//logger.log("k < 2 * hlen + 2");
				return false;
			}

			var EM = I2OSP(decryptcrt(c, d, p, q, u), k);

			//label not set?
			if (typeof l !== "string") {
				l = "";
			}

			//hash of label
			var lHash = sha256(l);

			var Y = EM.substr(0, 2);
			var maskedSeed = EM.substr(2, hlen * 2);
			var maskedDB = EM.substr(hlen * 2 + 2);

			var seedMask = MGF1(maskedDB, hlen);
			var seed = xor(maskedSeed, seedMask, hlen);

			var dbMask = MGF1(seed, k - hlen - 1);
			var DB = xor(maskedDB, dbMask, k - hlen - 1);

			var lHash2 = DB.substr(0, hlen * 2);

			if (lHash2 !== lHash) {
				//logger.log("hashes not equal: " + lHash2 + "-" + lHash);
				return false;
			}

			DB = DB.substr(hlen * 2);

			var i = 0;
			var M = "";
			for (i = 0; i < DB.length; i += 2) {
				var val = DB.substr(i, 2);
				if (val !== "00") {
					if (val === "01") {
						M = DB.substr(i + 2);
						break;
					} else {
						//logger.log("not 01: " + val);
						return false;
					}
				}
			}

			if (Y !== "00") {
				//logger.log("y not 00");
				return false;
			}

			return M;
		}

		/**
		 * encrypt message
		 * @param m message as BigInteger
		 * @param e public MPI part as BigInteger
		 * @param n public MPI part as BigInteger
		 * @return BigInteger
		 */
		function encrypt(m, e, n) {
			return m.modPowInt(e, n);
		}

		/**
		* Encrypt with OAEP standard
		* in different to the standard this returns an integer and not an octet string!
		* @param m message to encrypt
		* @param e, n public key attributes
		* @param l label
		*/
		function encryptOAEP(m, e, n, l) {
			//octet length of n
			var k = Math.ceil(I2OSP(n).length / 2);
			//octet length of message
			var mLen = Math.ceil(I2OSP(m).length / 2);

			//label not set?
			if (typeof l !== "string") {
				l = "";
			}

			//hash of label
			var lHash = sha256(l);

			//zero padding
			var PS = I2OSP(BigInteger.ZERO, k - mLen - 2 * hlen - 2);

			//concatenate
			var DB = lHash + PS + "01" + I2OSP(m, mLen);

			//random seed
			var seed = secureRandomLength(hlen);

			var dbMask = MGF1(seed, k - hlen - 1);

			var maskedDB = xor(DB, dbMask, k - hlen - 1);
			var seedMask = MGF1(maskedDB, hlen);

			var maskedSeed = xor(seed, seedMask, hlen);

			//put everything together
			var EM = "00" + maskedSeed + maskedDB;

			return encrypt(OS2IP(EM), e, n);
		}

		/* Sign and Verify */
		function sign(m, d, n) {
			return m.modPow(d, n);
		}

		function signcrt(m, d, p, q, u) {
			var dp = d.mod(p.subtract(BigInteger.ONE));
			var dq = d.mod(q.subtract(BigInteger.ONE));

			var m1 = m.modPow(dp, p);
			var m2 = m.modPow(dq, q);

			var s = u.multiply(m1.subtract(m2)).mod(p).multiply(q).add(m2);

			return s;
		}

		function pssEncode(M, emBits) {
			var emLen = Math.ceil(emBits / 8);

			var mHash = M;
			var salt = secureRandomLength(slen);

			var PS = I2OSP(BigInteger.ZERO, emLen - slen - hlen - 2);

			var DB = PS + "01" + salt;

			var M2 = "0000000000000000" + mHash + salt;
			var H = sha256(M2);

			var dbMask = MGF1(H, emLen - hlen - 1);
			var maskedDB = xor(DB, dbMask, emLen - hlen - 1);

			var diff = 8 * emLen - emBits;
			//set the leftmost 8emLen - emBits bits of the leftmost octet in maskedDB to zero
			//we use an and operation for this as and(0,x) = 0 ; and(1,x) = x;
			if (diff > 0) {
				var firstOctet = OS2IP(maskedDB.substr(0, 2));

				var count = 0;
				var andMask = "";
				while (count < 8) {
					if (count < diff) {
						andMask = andMask + "0";
					} else {
						andMask = andMask + "1";
					}
					count += 1;
				}

				var afterAndMask = I2OSP(new BigInteger(andMask, 2).and(firstOctet), 1);

				maskedDB = afterAndMask + maskedDB.substr(2);
			}

			var EM = maskedDB + H + "bc";

			return EM;
		}

		function signPSS(M, d, p, q, u, n) {
			//octet length of n
			var k = Math.ceil(I2OSP(n).length / 2);
			//bit length of n
			var modBits = n.toString(2).length;

			var EM = pssEncode(M, modBits - 1);
			M = OS2IP(EM);

			var signature = signcrt(M, d, p, q, u);

			return signature;
		}

		function verify(s, e, n) {
			return s.modPowInt(e, n);
		}

		function pssVerify(mHash, EM, emBits) {
			var emLen = Math.ceil(emBits / 8);

			if (emLen < hlen + slen + 2) {
				//logger.log("emLen wrong");
				return false;
			}

			if (EM.substr(EM.length - 2) !== "bc") {
				//logger.log("not bc");
				return false;
			}

			var maskedDB = EM.substr(0, 2 * emLen - 2 * hlen - 2);
			var H = EM.substr(2 * emLen - 2 * hlen - 2, 2 * hlen);

			var dbMask = MGF1(H, emLen - hlen - 1);

			var DB = xor(maskedDB, dbMask, emLen - hlen - 1);

			var salt = DB.substr(DB.length - 2 * slen);

			var M2 = "0000000000000000" + mHash + salt;
			var H2 = sha256(M2);

			return H2 === H;
		}

		function verifyPSS(h, s, e, n) {
			if (!(s instanceof BigInteger)) {
				s = new BigInteger(s, 16);
			}

			//octet length of n
			var k = Math.ceil(I2OSP(n).length / 2);
			//bit length of n
			var modBits = n.toString(2).length;

			var EM = I2OSP(verify(s, e, n), Math.ceil((modBits - 1) / 8));

			return pssVerify(h, EM, modBits - 1);
		}

		// "empty" RSA key constructor
		function KeyObject() {
		}

		KeyObject.prototype = {
			n: null,
			e: 0,
			ee: null,
			d: null,
			p: null,
			q: null,
			dmp1: null,
			dmq1: null,
			u: null
		};

		/**
		* Generate A Key Asynchrounously with workers.
		* B length of key
		* E public expt
		* callback function to call when key is ready
		*/
		function generateAsync(B, E, callback) {
			var start = new Date().getTime();
			var key = new KeyObject();
			var rng = new SecureRandom();
			var qs = (B >> 1);
			key.e = parseInt(E, 16);
			key.ee = new BigInteger(E, 16);

			var primeCalculator, primeCalculator2;
			if (window.location.href.indexOf("/tests") > -1) {
				primeCalculator = new Worker('../crypto/getNextBiggerPrime.js');
				primeCalculator2 = new Worker('../crypto/getNextBiggerPrime.js');
			} else {
				primeCalculator = new Worker('js/crypto/getNextBiggerPrime.js');
				primeCalculator2 = new Worker('js/crypto/getNextBiggerPrime.js');
			}

			var generate = function (length, threadNum) {
				try {
					//get a random number with the right length.
					var number = new BigInteger(length, rng);
					//send number to worker to calculate a prime number from it.
					//logger.log("Posting number to worker");
					if (threadNum === 2) {
						primeCalculator2.postMessage({'number': number.toString(16), 'length': length});
					} else {
						primeCalculator.postMessage({'number': number.toString(16), 'length': length});
					}
				} catch (e) {
					if (e instanceof sjcl.exception.notReady) {
						//logger.log("not yet ready - length: " + length);
						setTimeout(function () {generate(length); }, 500);
					} else {
						throw e;
					}
				}
			};

			var done = function () {
				console.log(key);
				if (key.q !== null && key.p !== null) {
					var p1 = key.p.subtract(BigInteger.ONE);
					var q1 = key.q.subtract(BigInteger.ONE);
					var phi = p1.multiply(q1);
					if (phi.gcd(key.ee).compareTo(BigInteger.ONE) === 0) {
						key.n = key.p.multiply(key.q);
						key.d = key.ee.modInverse(phi);
						key.dmp1 = key.d.mod(p1);
						key.dmq1 = key.d.mod(q1);
						key.u = key.q.modInverse(key.p);

						primeCalculator.terminate();
						primeCalculator2.terminate();
						callback(null, key);
					} else {
						key.p = null;
						key.q = null;

						generate(B - qs, 1);
						generate(qs, 2);
					}
				}
			};

			primeCalculator2.onmessage = function (event) {
				console.log(event);
				console.log("Second:" + (new Date().getTime() - start));
				if (event.data === "ready") {
					generate(qs, 2);
					return;
				}

				var number = new BigInteger(event.data, 16);

				if (number.subtract(BigInteger.ONE).gcd(key.ee).compareTo(BigInteger.ONE) === 0) {
					if (key.q === null) {
						key.q = number;
						done();
					} else {
						throw new Error("to many primes");
					}
				} else {
					generate(qs, 2);
				}
			};

			primeCalculator.onmessage = function (event) {
				console.log(event);
				console.log("First:" + (new Date().getTime() - start));
				if (event.data === "ready") {
					generate(B - qs, 1);
					return;
				}

				var number = new BigInteger(event.data, 16);

				if (number.subtract(BigInteger.ONE).gcd(key.ee).compareTo(BigInteger.ONE) === 0) {
					if (key.p === null) {
						key.p = number;
						done();
					} else {
						throw new Error("to many primes");
					}
				} else {
					generate(B - qs, 1);
				}
			};
		}

		// Generate a new random private key B bits long, using public expt E
		function generate(B, E) {
			var key = new KeyObject();
			var rng = new SecureRandom();
			var qs = (B >> 1);
			key.e = parseInt(E, 16);
			key.ee = new BigInteger(E, 16);
			for(;;) {
				for(;;) {
					key.p = new BigInteger(B - qs, 10, rng);
					if (key.p.subtract(BigInteger.ONE).gcd(key.ee).compareTo(BigInteger.ONE) === 0 && key.p.isProbablePrime(10)) {
						break;
					}
				}
				for(;;) {
					key.q = new BigInteger(qs, 10, rng);
					if (key.q.subtract(BigInteger.ONE).gcd(key.ee).compareTo(BigInteger.ONE) === 0 && key.q.isProbablePrime(10)) {
						break;
					}
				}
				if (key.p.compareTo(key.q) <= 0) {
					var t = key.p;
					key.p = key.q;
					key.q = t;
				}
				var p1 = key.p.subtract(BigInteger.ONE);
				var q1 = key.q.subtract(BigInteger.ONE);
				var phi = p1.multiply(q1);
				if (phi.gcd(key.ee).compareTo(BigInteger.ONE) === 0) {
					key.n = key.p.multiply(key.q);
					key.d = key.ee.modInverse(phi);
					key.dmp1 = key.d.mod(p1);
					key.dmq1 = key.d.mod(q1);
					key.u = key.q.modInverse(key.p);
					break;
				}
			}
			return key;
		}

		//this.encrypt = encrypt;
		this.encryptOAEP = encryptOAEP;

		//this.decrypt = decrypt;
		//this.decryptcrt = decryptcrt;
		this.decryptOAEP = decryptOAEP;

		this.verify = verify;
		this.verifyPSS = verifyPSS;

		this.sign = sign;
		this.signcrt = signcrt;
		this.signPSS = signPSS;

		this.generate = generate;
		this.generateAsync = generateAsync;
		this.KeyObject = KeyObject;
	};

	return RSA;
});