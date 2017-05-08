import Enum, { InternalSymbol } from "./enum";

var states : any = new Enum(["INIT", "PENDING", "SUCCESS", "FAILED"]);

export default class State {
	_state = states.INIT;
	data = {
		init: true,
		pending: false,
		success: false,
		failed: false
	};

	_turnOneDataTrue () {
		states.symbols().forEach(function (symbol : InternalSymbol) {
			var name : string = symbol.name.toLowerCase();
			if (this._state === symbol) {
				this.data[name] = true;
			} else {
				this.data[name] = false;
			}
		}, this);
	};

	success () {
		if (this._state === states.PENDING) {
			this._state = states.SUCCESS;
			this._turnOneDataTrue();
		}
	};

	failed () {
		if (this._state === states.PENDING) {
			this._state = states.FAILED;
			this._turnOneDataTrue();
		}
	};

	reset () {
		this._state = states.INIT;
		this._turnOneDataTrue();
	};

	pending () {
		this._state = states.PENDING;
		this._turnOneDataTrue();
	};

	isPending () : boolean {
		return this._state === states.PENDING;
	};

	isSuccess () : boolean {
		return this._state === states.SUCCESS;
	};

	isFailed () : boolean {
		return this._state === states.FAILED;
	};

	isInit () : boolean {
		return this._state === states.INIT;
	};

	getState () {
		return this._state;
	};

	getPossibleStates () {
		return states;
	};

}
