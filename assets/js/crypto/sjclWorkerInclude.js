define(["workerQueue", "bluebird", "crypto/minimalHelper"], function (WorkerQueue, bluebird, chelper) {
	"use strict";

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

				return ab;
			}
		} catch (e) {}

		return false;
	}

	function addEntropy(theWorker, callback) {
		var entropy = getEntropy();

		if (entropy) {
			theWorker.runTask({randomNumber: entropy, entropy: 1024}).then(callback);
		} else {
			throw new Error("no entropy from browser ... browser too old");
		}
	}

	function dirname(path) {
		return path.match(/(.*)[\/\\]/)[1] || "";
	}

	var requirePath = "/assets/js/bower/requirejs/require.js";

	if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
		requirePath = "/www" + requirePath;
	}

	if (window.location.href.indexOf("file://") > -1) {
		requirePath = dirname(window.location.href) + requirePath;
	}

	//Promise, numberOfWorkers, workerPath, setupMethod, requireOverRide
	var workers = new WorkerQueue(bluebird, 4, "crypto/sjclWorker", addEntropy, requirePath);

	var sjclWorker = {
		hash: function (toHash) {
			return workers.schedule({
					isHash: true,
					toHash: toHash
			});
		},
		asym: {
			generateCryptKey: function (curve) {
				var data = {
					asym: true,
					generate: true,
					crypt: true
				};

				if (curve) {
					data.curve = curve;
				}

				return workers.schedule(data);
			},
			generateSignKey: function (curve) {
				var data = {
					asym: true,
					generate: true,
					crypt: false,
					curve: curve
				};

				return workers.schedule(data);
			},
			kem: function (publicKey) {
				var data = {
					asym: true,
					generate: false,
					action: "kem",

					curve: chelper.getCurveName(publicKey._curve),
					x: publicKey._point.x.toString(),
					y: publicKey._point.y.toString()
				};

				return workers.schedule(data);
			},
			unkem: function (privateKey, tag) {
				var data = {
					asym: true,
					generate: false,
					action: "unkem",

					curve: chelper.getCurveName(privateKey._curve),
					exponent: privateKey._exponent.toString(),
					tag: chelper.bits2hex(tag)
				};

				return workers.schedule(data);
			},
			sign: function (privateKey, toSign) {
				var data = {
					asym: true,
					generate: false,
					action: "sign",

					curve: chelper.getCurveName(privateKey._curve),
					exponent: privateKey._exponent.toString(),
					toSign: chelper.bits2hex(toSign)
				};

				return workers.schedule(data);
			},
			verify: function (publicKey, signature, hash) {
				var data = {
					asym: true,
					generate: false,
					action: "verify",

					curve: chelper.getCurveName(publicKey._curve),
					point: {
						x: publicKey._point.x.toString(),
						y: publicKey._point.y.toString()
					},

					signature: chelper.bits2hex(signature),
					hash: chelper.bits2hex(hash)
				};

				return workers.schedule(data);
			}
		},
		sym: {
			encrypt: function (key, message, progressListener) {
				var data = {
					"key": key,
					"message": message,

					"asym": false,
					"encrypt": true
				};

				return workers.schedule(data, progressListener);
			},
			decrypt: function (key, message) {
				var data = {
					"key": key,
					"message": message,

					"asym": false,
					"encrypt": false
				};

				return workers.schedule(data);
			}
		}
	};

	return sjclWorker;
});
