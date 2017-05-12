import Observer from "../asset/observer";
import Storage from "./Storage";
import { withPrefix } from "./storage.service";
import keyStore from "./keyStore.service";

import { landingPage } from "./location.manager";

export class SessionService extends Observer {
	sid: string = "";
	loggedin: boolean = false;
	userid: any;
	sessionStorage: Storage = withPrefix("whispeer.session");

	keyStore: any; // This has to change as soon as we port crypto/keyStore

	saveSession = () => {
		this.sessionStorage.set("sid", this.sid);
		this.sessionStorage.set("userid", this.userid);
		this.sessionStorage.set("loggedin", true);
	}

	setLoginData = (_sid: string, _userid: any) => {
		this.sid = _sid;
		this.userid = _userid;
		this.loggedin = true;

		setTimeout(() => {
			this.notify("", "ssn.login");
		});
	}

	setPassword = (password: string) => {
		keyStore.security.setPassword(password);
		this.sessionStorage.set("password", password);
	}

	loadLogin = () => {
		return this.sessionStorage.awaitLoading().then(() => {
			return this.sessionStorage.get("loggedin") === "true" && this.sessionStorage.get("password");
		}).then((loggedin: boolean) => {
			if (!loggedin) {
				return this.sessionStorage.clear().thenReturn(false);
			}

			this.setPassword(this.sessionStorage.get("password"));
			this.setLoginData(this.sessionStorage.get("sid"), this.sessionStorage.get("userid"));

			return true;
		})
	}

	getSID = () => {
		return this.sid;
	}

	getUserID = () => {
		// parseFloat is slightly faster than parseInt
		return parseFloat(this.userid);
	}

	logout = () => {
		if (this.loggedin) {
			this.sessionStorage.clear().then(() => {
				landingPage();

				if (window.indexedDB) {
					window.indexedDB.deleteDatabase("whispeerCache");
				}
			});
		}
	}

	isLoggedin = () => {
		return this.loggedin;
	}
}

export default new SessionService();
