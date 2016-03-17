/**
* SessionService
**/
define(["config"], function (config) {
	"use strict";

		if ("serviceWorker" in navigator) {
			if (config.serviceWorker.enabled) {
				navigator.serviceWorker.register("/sw.js").then(function(registration) {
					console.info("ServiceWorker registration successful with scope: ",    registration.scope);
				}).catch(function(err) {
					console.info("ServiceWorker registration failed: ", err);
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
			}
		} else {
			console.info("Browser does not support service worker");
		}
});
