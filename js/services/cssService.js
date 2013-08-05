define([], function () {
	"use strict";

	var listener = [], theClass = "registerView";

	var service = function () {
		var res = {
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

		return res;
	};

	service.$inject = [];

	return service;
});