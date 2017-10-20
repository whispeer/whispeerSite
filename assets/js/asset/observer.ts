import * as Bluebird from "bluebird";
import h from "../helper/helper";

const afterHooks: Function[] = [];

export default class Observer {
	_listeners: any;
	_listenersOnce: any;

	static addAfterHook(listener: Function) {
		afterHooks.push(listener);
	}

	constructor () {
		this._listeners = {};
		this._listenersOnce = {};
	};

	listenOnce(fn: Function, type: string) {
		type = type || "any";

		if (typeof this._listenersOnce[type] === "undefined") {
				this._listenersOnce[type] = [];
		}
		this._listenersOnce[type].push(fn);
	}

	listenPromise(type: string) {
			var that = this;
			return new Bluebird(function (resolve) {
					that.listenOnce(resolve, type);
			});
	}

	listen(fn: Function, type: string) {
			type = type || "any";
			if (typeof this._listeners[type] === "undefined") {
					this._listeners[type] = [];
			}
			this._listeners[type].push(fn);
	}

	notify(data: any, type?: string, returnF?: Function) {
			type = type || "any";

			if (!returnF) {
					returnF = function () {};
			}

			var listeners = this._listeners[type] || [];
			var listenersOnce = this._listenersOnce[type] || [];

			var subscribers = (listeners).concat(listenersOnce);

			this._listenersOnce[type] = [];

			var result = h.callEach(subscribers, [data], returnF);

			if (type !== "any") {
					result = returnF(this.notify(data), result);
			}

			h.callEach(afterHooks);

			return result;
	}

	static extend(obj: any) {
		const internalObserver = new Observer();

		obj.notify = internalObserver.notify.bind(internalObserver);
		obj.listenOnce = internalObserver.listenOnce.bind(internalObserver);
		obj.listenPromise = internalObserver.listenPromise.bind(internalObserver);
		obj.listen = internalObserver.listen.bind(internalObserver);
	}
}

export const extend = function (obj: any) {
	Observer.extend(obj)
}
