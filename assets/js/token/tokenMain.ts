"use strict";

const w : any = window

w.startup = new Date().getTime();
w.globalErrors = [];

import * as Bluebird from "bluebird"
import { withPrefix } from "../services/storage.service";
import socket from "../services/socket.service"

const sessionStorage = withPrefix("whispeer.session")

const getToken = () => {
	const parts = window.location.pathname.split("/");
	return parts[parts.length - 1]
}

const token = getToken()

Bluebird.all([
	sessionStorage.awaitLoading(),
	socket.awaitConnection(),
]).then(() =>
	socket.emit("token.get", {
		sid: sessionStorage.get("sid"),
		token
	})
).then((response) => {
	debugger
})
