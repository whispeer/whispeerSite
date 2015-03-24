define(["whispeerHelper", "asset/observer"], function (h, Observer) {
	"use strict";

	var Progress = function (options) {
		Observer.call(this);

		this._init = false;
		this._done = 0;
		this._progress = 0;

		this._options = options;
		this._parseOptions();

		this.data = {
			progress: 0
		};
	};

	Progress.prototype._parseOptions = function () {
		if (this._options) {
			this._total = this._options.total;
			if (this._options.depends) {
				this._listenDepends(this._options.depends);
			}
		}
	};

	Progress.prototype._listenDepends = function (depends) {
		this._depends = depends;	

		depends.forEach(function (depend) {
			depend.listen(this._recalculate.bind(this), "progress");
		});
	};

	Progress.prototype.addDepend = function (depend) {
		if (!this._depends && this._total) {
			throw new Error("trying to mix depending progress and manual progress");
		}

		this._depends = this._depends || [];

		this._depends.push(depend);
		depend.listen(this._recalculate.bind(this), "progress");

		this._recalculate();
	};

	Progress.prototype.progressDelta = function (delta) {
		if (this._depends) {
			throw new Error("trying to mix depending progress and manual progress");
		}

		this._done += delta;
		this._recalculate();
	};

	Progress.prototype.progress = function (done) {
		if (this._depends) {
			throw new Error("trying to mix depending progress and manual progress");
		}

		this._done = done;
		this._recalculate();
	};

	Progress.prototype.setTotal = function (total) {
		if (this._depends) {
			throw new Error("trying to mix depending progress and manual progress");
		}

		this._total = total;
		this._recalculate();
	};

	Progress.prototype.reset = function () {
		this._done = 0;
		this._recalculate();
	};

	Progress.prototype._joinDepends = function () {
		var done = 0, total = 0;
		this._depends.forEach(function (depend) {
			done += depend.getDone();
			total += depend.getTotal() || 0;
		});

		this._done = done;
		this._total = total;
	};

	Progress.prototype.getDone = function () {
		return this._done;
	};

	Progress.prototype.getTotal = function () {
		return this._total;
	};

	Progress.prototype.getProgress = function () {
		return this._progress;
	};

	Progress.prototype._recalculate = function () {
		if (this._depends) {
			this._joinDepends();
		}

		if (!this._total) {
			return;
		}

		this._progress = this._done / this._total;
		this._progress = Math.min(this._progress, 1);

		this.data.progress = this._progress;

		this.notify(this._progress, "progress");
	};

	return Progress;
});