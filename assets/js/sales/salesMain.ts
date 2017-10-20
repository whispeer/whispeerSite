import 'whatwg-fetch';

require("../runners/serviceWorkerRunner")

const config = require('../config.js');

	const goMain = () => window.location.href = "/"

document.getElementById("trial").addEventListener("click", function () {
	const url = (config.https ? "https://" : "http://") +
		config.ws +
		":" + config.wsPort +
		"/businessTrial";

	const sessionID = localStorage.getItem("whispeer.session.sid")

	window.fetch(url, {
		method: 'POST',
		mode: 'cors',
		headers: new Headers({
			"Content-Type": "application/json",
		}),
		body: JSON.stringify({ sessionID })
	}).then(goMain, goMain);
})
