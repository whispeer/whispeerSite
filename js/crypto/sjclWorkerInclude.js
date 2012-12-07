define(['asset/logger', 'libs/step'], function (logger, step) {
	"use strict";
	var numberOfWorkers = 4;

	var MyWorker;
	var workers;

	MyWorker = function (workerid) {
		var theWorker;

		if (window.location.href.indexOf("/tests") > -1) {
			theWorker = new Worker('../crypto/sjclWorker.js');
		} else {
			theWorker = new Worker('js/crypto/sjclWorker.js');
		}

		this.busy = false;
		var listener;

		this.postMessage = function (message, listener) {
			this.busy = true;
			this.listener = listener;

			theWorker.postMessage(message);
		};

		this.exit = function () {
			workers.exit(workerid);
			theWorker.terminate();
		};

		theWorker.onerror = function (event) {
			logger.log(event);

			if (typeof listener === "function") {
				listener(new Error(event.message + " (" + event.filename + ":" + event.lineno + ")"));
			}

			this.exit();
		};

		theWorker.onmessage = function (event) {
			if (typeof listener === "function") {
				listener(null, event.data.result);
			}

			this.busy = false;
			this.listener = null;
			workers.signalFree(workerid);
		};
	};


	workers = {
		workerWaitQueue: [],
		workerList: [],
		workersById: {},
		idCount: 0,
		createWorker: function () {
			this.idCount += 1;
			var newWorker = new MyWorker(this.idCount);
			this.workersById[this.idCount] = newWorker;
			this.workerList.push(newWorker);

			return newWorker;
		},
		getFreeWorker: function (cb) {
			try {
				var i;
				for (i = 0; i < this.workerList.length; i += 1) {
					if (this.workerList[i].busy === false) {
						cb(null, this.workerList[i]);
						return;
					}
				}

				if (this.workerList.length < numberOfWorkers) {
					cb(null, this.createWorker());
					return;
				}

				this.workerWaitQueue.push(cb);
			} catch (e) {
				cb(e);
			}
		},
		exit: function (workerid) {
			var i, worker;
			for (i = 0; i < this.workerList.length; i += 1) {
				worker = this.workerList[i];
				if (worker.getId() === workerid) {
					this.workerList.slice(i, 1);
				}

				delete this.workersById[workerid];
			}
		},
		signalFree: function (workerid) {
			var worker = this.workersById[workerid];
			if (typeof worker !== "undefined" && worker.busy === false) {
				var waiter = this.workerWaitQueue.shift();
				if (typeof waiter === "function") {
					waiter(null, worker);
				}
			}
		}
	};

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