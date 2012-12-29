define(['libs/step', 'crypto/generalWorkerInclude', 'crypto/waitForReadyDisplay', 'asset/helper', 'libs/sjcl'], function (step, WorkerManager, waitForReady, h, sjcl) {
	"use strict";

	var addEntropy = {
		setup: function (theWorker, callback) {
			step(function waitReady() {
				this();
			}, callback);
		},
		needData: function (event, worker) {
			if (event.data.needed === "entropy") {
				waitForReady(function () {
					worker.postMessage({randomNumber: sjcl.codec.hex.fromBits(sjcl.random.randomWords(16)), entropy: 1024}, this);
				});
			} else if (event.data.done === "entropy") {
				console.log("entropy done!");
			}
		}
	};

	var workers;
	if (window.location.href.indexOf("/tests") > -1) {
		workers = new WorkerManager('../crypto/rsaWorker.js', 2, addEntropy);
	} else {
		workers = new WorkerManager('js/crypto/rsaWorker.js', 2, addEntropy);
	}

	var rsaWorker = {
		signPSS: function (message, d, p, q, u, n, callback, important) {
			d = d.toString(16);
			p = p.toString(16);
			q = q.toString(16);
			u = u.toString(16);
			n = n.toString(16);

			step(function getFree() {
				workers.getFreeWorker(this, !!important);
			}, function (err, worker) {
				if (err) {
					throw err;
				}

				var data = {m: message, d: d, p: p, q: q, u: u, n: n, sign: true};

				worker.postMessage(data, this);
			}, callback);
		},
		verifyPSS: function (hash, signature, ee, n, callback, important) {
			console.log(hash);
			ee = ee.toString(16);
			n = n.toString(16);

			step(function getFree() {
				workers.getFreeWorker(this);
			}, function (err, worker) {
				if (err) {
					throw err;
				}

				var data = {h: hash, s: signature, ee: ee, n: n, verify: true};

				worker.postMessage(data, this, !!important);
			}, callback);
		},
		encryptOAEP: function (message, ee, n, label, callback, important) {
			message = message.toString(16);
			ee = ee.toString(16);
			n = n.toString(16);

			step(function getFree() {
				workers.getFreeWorker(this, !!important);
			}, function (err, worker) {
				if (err) {
					throw err;
				}

				var data = {m: message, ee: ee, n: n, l: label, encrypt: true};

				worker.postMessage(data, this);
			}, callback);
		},
		decryptOAEP: function (code, d, p, q, u, n, label, callback, important) {
			code = code.toString(16);
			d = d.toString(16);
			p = p.toString(16);
			q = q.toString(16);
			u = u.toString(16);
			n = n.toString(16);

			step(function getFree() {
				workers.getFreeWorker(this, !!important);
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