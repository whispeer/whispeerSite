define(["step", "crypto/generalWorkerInclude", "crypto/minimalHelper"], function (step, WorkerManager, chelper) {
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
			/*generateCryptKey: function (curve, callback) {
				if (typeof curve === "function") {
					callback = curve;
					curve = undefined;
				}

				step(function getFree() {
					workers.getFreeWorker(this);
				}, function (err, worker) {
					if (err) {
						throw err;
					}

					var data = {
						asym: true,
						generate: true,
						crypt: true
					};

					if (curve) {
						data.curve = curve;
					}

					worker.postMessage(data, this);
				}, callback);
			},
			generateSignKey: function (callback, options) {
				options = options || {
					important: false,
					curve: 0x100
				};

				step(function getFree() {
					workers.getFreeWorker(this, !!options.important);
				}, function (err, worker) {
					if (err) {
						throw err;
					}

					var data = {
						asym: true,
						generate: true,
						crypt: false,
						curve: options.curve
					};

					worker.postMessage(data, this);
				}, callback);
			},
			kem: function (publicKey, callback) {
				step(function getFree() {
					workers.getFreeWorker(this);
				}, function (err, worker) {
					if (err) {
						throw err;
					}

					var data = {
						asym: true,
						generate: false,
						action: "kem",

						curve: chelper.getCurveName(publicKey._curve),
						x: publicKey._point.x.toString(),
						y: publicKey._point.y.toString()
					};

					worker.postMessage(data, this);
				}, function (err, result) {
					if (err) {
						throw err;
					}

					this(null, result);
				}, callback);
			},*/
			unkem: function (privateKey, tag, callback) {
				workers.getFreeWorker(function (err, worker) {
					if (err) {
						throw err;
					}

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
			/*sign: function (privateKey, toSign, callback) {
				step(function getFree() {
					workers.getFreeWorker(this);
				}, function (err, worker) {
					if (err) {
						throw err;
					}

					var data = {
						asym: true,
						generate: false,
						action: "sign",

						curve: chelper.getCurveName(privateKey._curve),
						exponent: privateKey._exponent.toString(),
						toSign: chelper.bits2hex(toSign)
					};

					worker.postMessage(data, this);
				}, function (err, result) {
					if (err) {
						throw err;
					}

					this(null, result);
				}, callback);
			},*/
			verify: function (publicKey, signature, hash, callback) {
				workers.getFreeWorker(function (err, worker) {
					if (err) {
						throw err;
					}

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
			/*encrypt: function (key, message, iv, callback) {
				step(function getFree() {
					workers.getFreeWorker(this);
				}, function (err, worker) {
					if (err) {
						throw err;
					}

					var data = {
						'key': key,
						'message': message,
						'iv': iv,

						'asym': false,
						'encrypt': true
					};

					worker.postMessage(data, this);
				}, function (err, result) {
					if (err) {
						throw err;
					}

					this(null, result);
				}, callback);
			},*/
			decrypt: function (key, message, callback) {
				workers.getFreeWorker(function (err, worker) {
					if (err) {
						throw err;
					}

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