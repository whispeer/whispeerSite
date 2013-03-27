define(['libs/step', 'crypto/generalWorkerInclude', 'crypto/waitForReady', 'asset/helper', 'libs/sjcl'], function (step, WorkerManager, waitForReady, h, sjcl) {
	"use strict";

	var addEntropy = {
		setup: function (theWorker, callback) {
			step(function waitReady() {
			/*
				waitForReady(this);
			}, h.sF(function ready() {
				theWorker.postMessage({randomNumber: sjcl.codec.hex.fromBits(sjcl.random.randomWords(16)), entropy: 1024}, this);
			*/
				this();
			}, callback);
		},
		needData: function (event, worker) {
			//TODO
		}
	};

	var workers;
	if (window.location.href.indexOf("/tests") > -1) {
		workers = new WorkerManager('../crypto/sjclWorker.js', 2, addEntropy);
	} else {
		workers = new WorkerManager('js/crypto/sjclWorker.js', 2, addEntropy);
	}

	var sjclWorker = {
		asym: {
			generateCryptKey: function (curve, callback) {
				if (typeof curve === "function") {
					callback = curve;
					curve = undefined;
				}
			
				step(function getFree() {
					workers.getFreeWorker(this, !!important);
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
			kem: function (publicKey, callback, important) {
				step(function getFree() {
					workers.getFreeWorker(this, !!important);
				}, function (err, worker) {
					if (err) {
						throw err;
					}

					var data = {
						asym: true,
						generate: false,
						action: "kem",
						
						curve: chelper.getCurveName(publicKey._curve),
						x: publicKey._point.x.toString();
						y: publicKey._point.y.toString();
					}

					worker.postMessage(data, this);
				}, function (err, result) {
					if (err) {
						throw err;
					}

					this(null, result);
				}, callback);
			},
			unkem: function (privateKey, tag, callback, important) {
				step(function getFree() {
					workers.getFreeWorker(this, !!important);
				}, function (err, worker) {
					if (err) {
						throw err;
					}

					var data = {
						asym: true,
						generate: false,
						action: "unkem",
						
						curve: chelper.getCurveName(privateKey._curve),
						exponent: privateKey._exponent.toString();
						tag: chelper.bits2hex(tag);
					}

					worker.postMessage(data, this);
				}, function (err, result) {
					if (err) {
						throw err;
					}

					this(null, result);
				}, callback);
			},
			sign: function (privateKey, toSign, callback, important) {
				step(function getFree() {
					workers.getFreeWorker(this, !!important);
				}, function (err, worker) {
					if (err) {
						throw err;
					}

					var data = {
						asym: true,
						generate: false,
						action: "sign",
						
						curve: chelper.getCurveName(privateKey._curve),
						exponent: privateKey._exponent.toString();
						toSign: chelper.bits2hex(toSign);
					}

					worker.postMessage(data, this);
				}, function (err, result) {
					if (err) {
						throw err;
					}

					this(null, result);
				}, callback);
			},
			verify: function (publicKey, signature, hash, callback, important) {
				step(function getFree() {
					workers.getFreeWorker(this, !!important);
				}, function (err, worker) {
					if (err) {
						throw err;
					}

					var data = {
						asym: true,
						generate: false,
						action: "verify",
						
						curve: chelper.getCurveName(privateKey._curve),
						exponent: privateKey._exponent.toString();
						signature: chelper.bits2hex(signature);
						hash: chelper.bits2hex(hash);
					}

					worker.postMessage(data, this);
				}, function (err, result) {
					if (err) {
						throw err;
					}

					this(null, result);
				}, callback);
			}
		},
		sym: {
			encrypt: function (key, message, iv, callback, important) {
				step(function getFree() {
					workers.getFreeWorker(this, !!important);
				}, function (err, worker) {
					if (err) {
						throw err;
					}

					var data = {
						'key': key,
						'message': message,
						'iv': iv

						'asym': false,
						'encrypt': true,
					};

					worker.postMessage(data, this);
				}, function (err, result) {
					if (err) {
						throw err;
					}

					this(null, result);
				}, callback);
			},
			decrypt: function (key, message, iv, callback, important) {
				step(function getFree() {
					workers.getFreeWorker(this, !!important);
				}, function (err, worker) {
					if (err) {
						throw err;
					}

					var data = {
						'key': key,
						'message': message,
						'iv': iv

						'asym': false,
						'encrypt': false,
					};

					worker.postMessage(data, this);
				}, callback);
			}
		}
	};

	return sjclWorker;
});