define([], function () {
	"use strict";

	var listener = [], theClass = "registerView";

	var service = {
		addListener: function addListenerF(func) {
			if (typeof func === "function") {
				listener.push(func);
			}
		},
		setClass: function setClassF(myClass) {
			theClass = myClass;

			var i;
			for (i = 0; i < listener.length; i += 1) {
				try {
					listener[i](theClass);
				} catch (e) {
					console.log(e);
				}
			}
		},
		getClass: function getClassF() {
			return theClass;
		}
	};

	service.$inject = [];

	return service;
});