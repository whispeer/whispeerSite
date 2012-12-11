define(['asset/logger', 'asset/helper', 'libs/step'], function (logger, h, step) {
	"use strict";
	var workerManager = function (path, numberOfWorkers, setupMethod) {
		var MyWorker;
		var workers;

		MyWorker = function (workerid) {
			var theWorker;

			theWorker = new Worker(path);

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
			createWorker: function (callback) {
				var fListener, mListener, newWorker;
				step(function () {
					workers.idCount += 1;
					newWorker = new MyWorker(workers.idCount);
					fListener = this;
					mListener = function (event) {
						fListener(null, event);
					};

					newWorker.addEventListener('error', mListener);
					newWorker.addEventListener('message', mListener);
				}, h.sF(function (event) {
					newWorker.removeEventListener('error', fListener);
					newWorker.removeEventListener('message', mListener);
					if (event.data === "ready") {
						if (typeof setupMethod === "function") {
							setupMethod(newWorker, this);
						} else {
							this();
						}
					}
				}), h.sF(function () {
					workers.workersById[workers.idCount] = newWorker;
					workers.workerList.push(newWorker);

					this(newWorker);
				}), callback);
			},

			getFreeWorker: function (cb) {
				step(function checkForFree() {
					var i;
					for (i = 0; i < workers.workerList.length; i += 1) {
						if (workers.workerList[i].busy === false) {
							this.last(null, workers.workerList[i]);
							return;
						}
					}

					if (workers.workerList.length < numberOfWorkers) {
						workers.createWorker(this);
						return;
					}

					workers.workerWaitQueue.push(this);
				}, cb);
			},

			exit: function (workerid) {
				var i, worker;
				for (i = 0; i < workers.workerList.length; i += 1) {
					worker = workers.workerList[i];
					if (worker.getId() === workerid) {
						workers.workerList.slice(i, 1);
					}

					delete workers.workersById[workerid];
				}
			},
			signalFree: function (workerid) {
				var worker = workers.workersById[workerid];
				if (typeof worker !== "undefined" && worker.busy === false) {
					var waiter = workers.workerWaitQueue.shift();
					if (typeof waiter === "function") {
						waiter(null, worker);
					}
				}
			}
		};
	};

	return workerManager;
});