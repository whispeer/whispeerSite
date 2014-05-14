define(["whispeerHelper", "asset/enum"], function (h, Enum) {
	"use strict";

	var states = new Enum("INIT", "PENDING", "SUCCESS", "FAILED");

	var State = function () {
		this._state = states.INIT;
	};	

	State.prototype.success = function () {
		if (this._state === states.PENDING) {
			this._state = states.SUCCESS;
		}
	};
	State.prototype.failed = function () {
		if (this._state === states.PENDING) {
			this._state = states.FAILED;
		}
	};
	State.prototype.reset = function () {
		this._state = states.INIT;
	};

	State.prototype.pending = function () {
		if (this._state === states.INIT) {
			this._state = states.PENDING;
		}
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