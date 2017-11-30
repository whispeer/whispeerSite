"use strict";

const w : any = window

w.startup = new Date().getTime();
w.globalErrors = [];

import * as Bluebird from "bluebird"
import { withPrefix } from "../services/storage.service";
import socket from "../services/socket.service"

const sessionStorage = withPrefix("whispeer.session")
const tokenStorage = withPrefix("whispeer.token")

const getToken = () => {
	const parts = window.location.pathname.split("/");
	return parts[parts.length - 1]
}

const getLanguage = () => window.location.pathname.split("/")[1]

const extra = WHISPEER_BUSINESS ? "" : "/business"

const redirectTo = (route: string) => {
	window.location.href = `/${getLanguage()}/${route}${extra}`
}

const useToken = (token) =>
	socket.emit("token.use", {
		sid: sessionStorage.get("sid"),
		token
	}).then(() =>
		redirectTo("main")
	)

const token = getToken()

Bluebird.all([
	sessionStorage.awaitLoading(),
	socket.awaitConnection(),
]).then(() =>
	socket.emit("token.get", {
		sid: sessionStorage.get("sid"),
		token,
		ignoreBusiness: true
	})
).then(({ companyID, loggedin, isBusiness }) => {
	tokenStorage.set("companyID", companyID)

	if (isBusiness) {
		return redirectTo("main")
	}

	if (loggedin) {
		return useToken(token)
	}

	tokenStorage.set("token", token)
	redirectTo("register")
}).catch((e) => {
	if (e.extra.response.isBusiness) {
		return redirectTo("main")
	}
})
