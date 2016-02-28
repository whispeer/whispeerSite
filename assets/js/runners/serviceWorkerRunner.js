/**
* SessionService
**/
define(["config"], function (config) {
	"use strict";

		if (config.serviceWorker && "serviceWorker" in navigator) {
			navigator.serviceWorker.register("/sw.js").then(function(registration) {
				console.log("ServiceWorker registration successful with scope: ",    registration.scope);
			}).catch(function(err) {
				console.log("ServiceWorker registration failed: ", err);
			});
		} else {
			console.log("Service worker disabled: " + config.serviceWorker);
		}
});
