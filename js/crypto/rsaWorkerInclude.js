define(['asset/logger', 'libs/step', 'crypto/generalWorkerInclude', 'crypto/waitForReady'], function (logger, step, workerManager, waitForReady) {
	"use strict";
	
	var addEntropy = function (theWorker, callback) {
		step(function waitReady() {
			waitForReady(this)
		}, h.sF(function ready() {
			theWorker.postMessage({randomNumber: sjcl.codec.hex.fromBits(sjcl.random.randomWords(16)), entropy: 1024});
		}));
	}
	
	var workers;
	if (window.location.href.indexOf("/tests") > -1) {
		workers = new workerManager('../crypto/rsaWorker.js', 4, addEntropy);
	} else {
		workers = new workerManager('js/crypto/rsaWorker.js', 4, addEntropy);
	}
	

	var rsaWorker = {
		signPSS: function (message, d, p, q, u, n, callback) {
			step(function getFree() {
				workers.getFreeWorker(this);
			}, function (err, worker) {
				if (err) {
					throw err;
				}

				var data = {m: message, d: d, p: p, q: q, u: u, n: n, sign: true};

				worker.postMessage(data, this);
			}, callback);
		},
		verifyPSS: function (hash, signature, ee, n, callback) {
			step(function getFree() {
				workers.getFreeWorker(this);
			}, function (err, worker) {
				if (err) {
					throw err;
				}

				var data = {h: hash, s: signature, ee: ee, n: n, verify: true};

				worker.postMessage(data, this);
			}, callback);
		},
		encryptOAEP: function (message, ee, n, label, callback) {
			step(function getFree() {
				workers.getFreeWorker(this);
			}, function (err, worker) {
				if (err) {
					throw err;
				}

				var data = {m: message, ee: ee, n: n, l: label, encrypt: true};

				worker.postMessage(data, this);
			}, callback);
		},
		decryptOAEP: function (code, d, p, q, u, n, label, callback) {
			step(function getFree() {
				workers.getFreeWorker(this);
			}, function (err, worker) {
				if (err) {
					throw err;
				}

				var data = {c: code, d: d, p: p, q: q, u: u, n: n, l: label, decrypt: true};

				worker.postMessage(data, this);
			}, callback);
		}
	};

	return rsaWorker;
});