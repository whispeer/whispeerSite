"use strict";

import Observer from "./observer"
import h from "../helper/helper"

class Progress extends Observer {
	private done: number = 0
	private donePercentage: number = 0
	private options: { total?: number, depends?: Progress[] }
	private total: number
	private depends: Progress[]

	data = { progress: 0 }

	constructor (options?: { total?: number, depends?: Progress[] }) {
		super()

		this.options = options;
		this._parseOptions();
	}

	private _parseOptions = () => {
		if (this.options) {
			this.total = this.options.total;
			if (this.options.depends) {
				this._listenDepends(this.options.depends);
			}
		}
	};

	private _listenDepends = (depends) => {
		this.depends = depends;

		depends.forEach((depend) => {
			depend.listen(this.recalculate.bind(this), "progress");
		});
	};

	removeDepend = (depend) => {
		if (!this.depends && this.total) {
			throw new Error("trying to mix depending progress and manual progress");
		}

		h.removeArray(this.depends, depend)

		this.recalculate();
	}

	addDepend = (depend) => {
		if (!this.depends && this.total) {
			throw new Error("trying to mix depending progress and manual progress");
		}

		this.depends = this.depends || [];

		this.depends.push(depend);
		depend.listen(this.recalculate.bind(this), "progress");

		this.recalculate();
	};

	progressDelta = (delta) => {
		if (this.depends) {
			throw new Error("trying to mix depending progress and manual progress");
		}

		this.done += delta;
		this.recalculate();
	};

	progress = (done) => {
		if (this.depends) {
			throw new Error("trying to mix depending progress and manual progress");
		}

		this.done = done;
		this.recalculate();
	};

	setTotal = (total) => {
		if (this.depends) {
			throw new Error("trying to mix depending progress and manual progress");
		}

		this.total = total;
		this.recalculate();
	};

	reset = () => {
		this.done = 0;
		this.recalculate();
	};

	private joinDepends = () => {
		var done = 0, total = 0;
		this.depends.forEach((depend) => {
			done += depend.getDone();
			total += depend.getTotal() || 0;
		});

		this.done = done;
		this.total = total;
	};

	getDone = () => {
		return this.done;
	};

	getTotal = () => {
		return this.total;
	};

	getProgress = () => {
		return this.donePercentage;
	};

	private recalculate = () => {
		if (this.depends) {
			this.joinDepends();
		}

		if (!this.total) {
			return;
		}

		this.donePercentage = this.done / this.total;
		this.donePercentage = Math.min(this.donePercentage, 1);

		this.data.progress = this.donePercentage;

		this.notify(this.donePercentage, "progress");
	};
}

export default Progress
