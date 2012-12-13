define(['libs/step', 'crypto/generalWorkerInclude', 'crypto/waitForReady', 'asset/helper', 'libs/sjcl'], function (step, WorkerManager, waitForReady, h, sjcl) {
	"use strict";

	var addEntropy = function (theWorker, callback) {
		step(function waitReady() {
			waitForReady(this);
		}, h.sF(function ready() {
			theWorker.postMessage({randomNumber: sjcl.codec.hex.fromBits(sjcl.random.randomWords(16)), entropy: 1024}, this);
		}), h.sF(function setupDone(event) {
			this();
		}), callback);
	};

	var workers;
	if (window.location.href.indexOf("/tests") > -1) {
		workers = new WorkerManager('../crypto/sjclWorker.js', 4, addEntropy);
	} else {
		workers = new WorkerManager('js/crypto/sjclWorker.js', 4, addEntropy);
	}

	var sjclWorker = {
		encryptSJCLWorker: function (key, message, iv, callback) {
			step(function getFree() {
				workers.getFreeWorker(this);
			}, function (err, worker) {
				if (err) {
					throw err;
				}

				var data = {'key': key, 'message': message, 'encrypt': true, 'iv': iv};

				worker.postMessage(data, this);
			}, function (err, event) {
				if (err) {
					throw err;
				}

				if (event.data.result) {
					this(null, event.data.result);
				} else {
					throw new Error("no clue!");
				}
			}, callback);
		},
		decryptSJCLWorker: function (key, message, iv, callback) {
			step(function getFree() {
				workers.getFreeWorker(this);
			}, function (err, worker) {
				if (err) {
					throw err;
				}

				var data = {'key': key, 'message': message, 'encrypt': false, 'iv': iv};

				worker.postMessage(data, this);
			}, callback);
		}
	};

	return sjclWorker;
});