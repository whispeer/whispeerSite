import * as Raven from "raven-js"
import 'whatwg-fetch';

import State from '../asset/state';

class ErrorService {
	constructor() {}

	criticalError = (e : any) =>
		this.logError(e)

	logError = (e : Error) => {
		if (e) {
			console.error(e);

			Raven.captureException(e);
		}
	}

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
