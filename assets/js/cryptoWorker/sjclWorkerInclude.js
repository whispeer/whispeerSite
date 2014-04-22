define(["cryptoWorker/generalWorkerInclude", "cryptoWorker/minimalHelper"], function (WorkerManager, chelper) {
	"use strict";

	var entropyAvailable = true;

	function getEntropy() {
		try {
			var ab;

			// get cryptographically strong entropy depending on runtime environment
			if (window && Uint32Array) {
				ab = new Uint32Array(32);
				if (window.crypto && window.crypto.getRandomValues) {
					window.crypto.getRandomValues(ab);
				} else if (window.msCrypto && window.msCrypto.getRandomValues) {
					window.msCrypto.getRandomValues(ab);
				} else {
					return false;
				}

				// get cryptographically strong entropy in Webkit
				return ab;
			}
		} catch (e) {}

		return false;
	}

	var addEntropy = {
		setup: function (theWorker, callback) {
			var entropy = getEntropy();

			if (entropy) {
				theWorker.postMessage({randomNumber: entropy, entropy: 1024}, callback);
			} else {
				entropyAvailable = false;
			}
		}
	};

	var workers = new WorkerManager("crypto/sjclWorker", 2, addEntropy);

	var sjclWorker = {
		asym: {
			generateCryptKey: function (curve, callback) {
				if (typeof curve === "function") {
					callback = curve;
					curve = undefined;
				}

				workers.getFreeWorker(function (err, worker) {
					var data = {
						asym: true,
						generate: true,
						crypt: true
					};

					if (curve) {
						data.curve = curve;
					}

					worker.postMessage(data, callback);
				});
			},
			generateSignKey: function (callback, curve) {
				workers.getFreeWorker(function (err, worker) {
					var data = {
						asym: true,
						generate: true,
						crypt: false,
						curve: curve
					};

					worker.postMessage(data, callback);
				});
			},
			kem: function (publicKey, callback) {
				workers.getFreeWorker(function (err, worker) {
					var data = {
						asym: true,
						generate: false,
						action: "kem",

						curve: chelper.getCurveName(publicKey._curve),
						x: publicKey._point.x.toString(),
						y: publicKey._point.y.toString()
					};

					worker.postMessage(data, callback);
				});
			},
			unkem: function (privateKey, tag, callback) {
				workers.getFreeWorker(function (err, worker) {
					var data = {
						asym: true,
						generate: false,
						action: "unkem",

						curve: chelper.getCurveName(privateKey._curve),
						exponent: privateKey._exponent.toString(),
						tag: chelper.bits2hex(tag)
					};

					worker.postMessage(data, callback);
				});
			},
			sign: function (privateKey, toSign, callback) {
				workers.getFreeWorker(function (err, worker) {
					var data = {
						asym: true,
						generate: false,
						action: "sign",

						curve: chelper.getCurveName(privateKey._curve),
						exponent: privateKey._exponent.toString(),
						toSign: chelper.bits2hex(toSign)
					};

					worker.postMessage(data, callback);
				});
			},
			verify: function (publicKey, signature, hash, callback) {
				workers.getFreeWorker(function (err, worker) {
					var data = {
						asym: true,
						generate: false,
						action: "verify",

						curve: chelper.getCurveName(publicKey._curve),
						x: publicKey._point.x.toString(),
						y: publicKey._point.y.toString(),

						signature: chelper.bits2hex(signature),
						hash: chelper.bits2hex(hash)
					};

					worker.postMessage(data, callback);
				});
			}
		},
		sym: {
			encrypt: function (key, message, iv, callback) {
				workers.getFreeWorker(function (err, worker) {
					var data = {
						"key": key,
						"message": message,
						"iv": iv,

						"asym": false,
						"encrypt": true
					};

					worker.postMessage(data, callback);
				});
			},
			decrypt: function (key, message, callback) {
				workers.getFreeWorker(function (err, worker) {
					var data = {
						"key": key,
						"message": message,

						"asym": false,
						"encrypt": false
					};

					worker.postMessage(data, callback);
				});
			}
		}
	};

	return sjclWorker;
});