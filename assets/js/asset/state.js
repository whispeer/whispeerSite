define(["whispeerHelper", "asset/enum"], function (h, Enum) {
	"use strict";

	var states = new Enum("INIT", "PENDING", "SUCCESS", "FAILED");

	var State = function () {
		this._state = states.INIT;
		this.data = {
			init: true,
			pending: false,
			success: false,
			failed: false
		};
	};	

	State.prototype._turnOneDataTrue = function () {
		states.symbols().forEach(function (symbol) {
			var name = symbol.name.toLowerCase();
			if (this._state === symbol) {
				this.data[name] = true;
			} else {
				this.data[name] = false;
			}
		}, this);
	};

	State.prototype.success = function () {
		if (this._state === states.PENDING) {
			this._state = states.SUCCESS;
			this._turnOneDataTrue();
		}
	};
	State.prototype.failed = function () {
		if (this._state === states.PENDING) {
			this._state = states.FAILED;
			this._turnOneDataTrue();
		}
	};
	State.prototype.reset = function () {
		this._state = states.INIT;
		this._turnOneDataTrue();
	};

	State.prototype.pending = function () {
		this._state = states.PENDING;
		this._turnOneDataTrue();
	};

	State.prototype.isPending = function () {
		return this._state === states.PENDING;
	};
	State.prototype.isSuccess = function () {
		return this._state === states.SUCCESS;
	};
	State.prototype.isFailed = function () {
		return this._state === states.FAILED;
	};
	State.prototype.isInit = function () {
		return this._state === states.INIT;
	};

	State.prototype.getState = function () {
		return this._state;
	};

	State.prototype.getPossibleStates = function () {
		return states;
	};

	return State;
});