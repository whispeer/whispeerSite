/**
* SessionService
**/
define(["config"], function (config) {
	"use strict";

		if (config.serviceWorker.enabled && "serviceWorker" in navigator) {
			navigator.serviceWorker.register("/sw.js").then(function(registration) {
				console.log("ServiceWorker registration successful with scope: ",    registration.scope);
			}).catch(function(err) {
				console.log("ServiceWorker registration failed: ", err);
			});
		} else {
			navigator.serviceWorker.getRegistration("/").then(function(registration) {
				if (registration) {
					return registration.unregister();
				}
			}).then(function (unregistered) {
				if (unregistered) {
					console.info("unregistered service worker");
				}
			});
			console.log("Service worker enabled: " + config.serviceWorker.enabled);
		}
});
