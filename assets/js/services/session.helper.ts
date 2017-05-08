import socketService from "./socket.service"
import * as Bluebird from "bluebird";

export default {
	logout: (): Bluebird<any> => {
		return Bluebird.try(function sendLogout() {
			return socketService.emit("session.logout", {logout: true});
		});
	}
}
