import { errorServiceInstance } from "./error.service";

class CssService {
	listeners: { (theClass: string, isBox: boolean): any; }[] = [];
	theClass: string = "loading";
	isBox: boolean = false;

	addListener(func: { (theClass: string, isBox: boolean): any; }) {
		// this if is probably no longer necessary when we convert to typescript
		if (typeof func === "function") {
			this.listeners.push(func);
		}
	}

	callListeners() {
		this.listeners.forEach((listener) => {
			try {
				listener(this.theClass, this.isBox);
			} catch (e) {
				errorServiceInstance.criticalError(e);
			}
		});
	}

	setClass(_theClass: string, _isBox?: boolean) {
		this.theClass = _theClass;
		this.isBox = _isBox || false;
		this.callListeners();
	}

	getClass() {
		// return loading if class is empty
		return this.theClass || "loading";
	}
}

export default new CssService();
