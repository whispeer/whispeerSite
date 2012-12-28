define(['asset/logger', 'asset/helper', 'libs/step'], function (logger, h, step) {
	"use strict";
	var workerManager = function (path, numberOfWorkers, setupMethod) {
		var workerWaitQueue = [];
		var workerWaitQueueImportant = [];
		var workerList = [];
		var workersById = {};
		var idCount = 0;

		var MyWorker;

		var createWorker = function (callback) {
			var fListener, mListener, newWorker;
			step(function () {
				idCount += 1;
				newWorker = new MyWorker(idCount);
				newWorker.busy = true;

				workersById[idCount] = newWorker;
				workerList.push(newWorker);

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
					if (typeof setupMethod === "object") {
						if (typeof setupMethod.setup === "function") {
							setupMethod.setup(newWorker, this);
						} else {
							this();
						}
					} else {
						this();
					}
				}
			}), h.sF(function () {
				newWorker.busy = false;
				newWorker.setupDone();
				this(null, newWorker);
			}), callback);
		};

		var exit = function (workerid) {
			var i, worker;
			for (i = 0; i < workerList.length; i += 1) {
				worker = workerList[i];
				if (worker.getId() === workerid) {
					workerList.slice(i, 1);
				}

				delete workersById[workerid];
			}
		};

		var signalFree = function (workerid) {
			var worker = workersById[workerid];
			if (typeof worker !== "undefined" && worker.busy === false) {
				var waiter = workerWaitQueueImportant.shift();
				if (typeof waiter === "function") {
					waiter(null, worker);
				} else {
					waiter = workerWaitQueue.shift();
					if (typeof waiter === "function") {
						waiter(null, worker);
					}
				}
			}
		};

		MyWorker = function (workerid) {
			var that = this;
			var setup = true;

			var theWorker = new Worker(path);

			this.busy = false;
			var listener;

			this.setupDone = function () {
				setup = false;
			};

			this.addEventListener = function () {
				theWorker.addEventListener.apply(theWorker, arguments);
			};

			this.removeEventListener = function () {
				theWorker.removeEventListener.apply(theWorker, arguments);
			};

			this.postMessage = function (message, theListener) {
				that.busy = true;
				listener = theListener;

				theWorker.postMessage(message);
			};

			this.exit = function () {
				exit(workerid);
				theWorker.terminate();
			};

			this.getId = function () {
				return workerid;
			};

			theWorker.onerror = function (event) {
				logger.log(event);

				if (typeof listener === "function") {
					listener(new Error(event.message + " (" + event.filename + ":" + event.lineno + ")"));
				}

				that.exit();
			};

			theWorker.onmessage = function (event) {
				if (event.type === "log") {
					console.log(event);
					return;
				}

				if (event.type === "needData") {
					setupMethod.needData(event, theWorker);
					return;
				}

				var saveListener = listener;

				that.busy = false;
				listener = undefined;
				if (!setup) {
					signalFree(workerid);
				}

				if (typeof saveListener === "function") {
					saveListener(null, event.data);
				}
			};
		};

		this.getFreeWorker = function (cb, important) {
			step(function checkForFree() {
				var i;
				for (i = 0; i < workerList.length; i += 1) {
					if (workerList[i].busy === false) {
						console.log("free worker found");
						this.last(null, workerList[i]);
						return;
					}
				}

				if (workerList.length < numberOfWorkers) {
					console.log("creating worker");
					createWorker(this);
					return;
				}

				console.log("pushing to wait queue");
				if (important) {
					workerWaitQueueImportant.push(this);
				} else {
					workerWaitQueue.push(this);
				}
			}, cb);
		};
	};

	return workerManager;
});