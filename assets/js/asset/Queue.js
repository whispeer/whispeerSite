define(["bluebird"], function (Promise) {
	"use strict";
	function Queue(maxWeight) {
		this._queue = [];
		this._maxWeight = maxWeight;
		this._run = false;
		this._runningWeight = 0;
	}

	Queue.prototype.enqueue = function (weight, task, thisArg) {
		var _this = this;
		var promise = new Promise(function (resolve, reject) {
			_this._queue.push({
				task: task,
				weight: weight,
				thisArg: thisArg,
				resolve: resolve,
				reject: reject
			});
			_this._runTasks();
		});
		return promise;
	};

	Queue.prototype._runTasks = function () {
		if (!this._run) {
			return;
		}

		var nextTask;

		while(this._queue.length > 0 && this._runningWeight < this._maxWeight) {
			nextTask = this._queue.shift();
			this._runTask(nextTask);
		}
	};

	Queue.prototype._runTask = function (task) {
		var _this = this;
		this._runningWeight += task.weight;
		task.task.call(task.thisArg).then(function (result) {
			task.resolve(result);
		}, function (error) {
			task.reject(error);
		}).finally(function () {
			_this._runningWeight -= task.weight;
			_this._runTasks();
		});
	};

	Queue.prototype.start = function () {
		this._run = true;
		this._runTasks();
	};

	return Queue;
});