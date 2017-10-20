import * as StorageService from "./storage.service";
import Storage from "./Storage";

import { isBlockedReturnUrl } from "./location.manager";

export default class LocationService {
	loginStorage: Storage = StorageService.withPrefix("whispeer.login");

	constructor(public location: any) {}

	loadInitialURL() {
		var returnURL: string = this.loginStorage.get("returnUrl");
		if (returnURL && !isBlockedReturnUrl(returnURL)) {
			this.location.go(returnURL);
			this.loginStorage.remove("returnUrl");
		}

		if (isBlockedReturnUrl(window.top.location.pathname)) {
			this.location.go("/main");
		}
	}
}
