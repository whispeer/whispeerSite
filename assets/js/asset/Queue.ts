"use strict"
import * as Bluebird from "bluebird"

export default class Queue {

	private queue = []
	private run = false
	private runningWeight = 0

	constructor(private maxWeight) { }

	enqueue(weight, task) {
		const promise = new Bluebird((resolve, reject) => {
			this.queue.push({
				task: task,
				weight: weight,
				resolve: resolve,
				reject: reject
			})
			this.runTasks()
		})
		return promise
	}

	private runTasks() {
		if (!this.run) {
			return
		}

		let nextTask

		while(this.queue.length > 0 && this.runningWeight < this.maxWeight) {
			nextTask = this.queue.shift()
			this.runTask(nextTask)
		}
	}

	private runTask(task) {
		this.runningWeight += task.weight
		task.task().then(
			result => { task.resolve(result) },
			error => { task.reject(error) }
		).finally(() => {
			this.runningWeight -= task.weight
			this.runTasks()
		})
	}

	start() {
		this.run = true
		this.runTasks()
	}
}
