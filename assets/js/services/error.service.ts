const config = require('../config.js');
import State from '../asset/state';

import 'whatwg-fetch';

interface Error {
	stack: String
}

class ErrorService {
	constructor() {
		this.criticalError = this.criticalError.bind(this);
		this.logError = this.logError.bind(this);

		window.addEventListener("unhandledrejection", (e : any) => {
			var reason = e.detail.reason;

			this.criticalError(reason);
		});
	}

	criticalError (e : any) {
		this.logError(e);
	};

	logError (e : Error) {
		if (e) {
			console.error(e);

			const url = (config.https ? "https://" : "http://") +
				config.ws +
				":" + config.wsPort +
				"/reportError";

			window.fetch(url, {
				method: 'POST',
				mode: 'cors',
				headers: new Headers({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ error: e.toString(), stack: e.stack })
			}).catch(() => {});
		}
	};

	failOnErrorPromise (state : State, promise : any) {
		return promise.then(() => {
			state.success();
		}).catch((e : Error) => {
			state.failed();
			this.criticalError(e);
		});
	};

	failOnError (state : State) {
		return (e : Error) => {
			if (e) {
				state.failed();
				this.criticalError(e);
			} else {
				state.success();
			}
		};
	}
}

export const errorServiceInstance = new ErrorService();

export default errorServiceInstance;
