define([], function () {
	"use strict";

	var listener = [], theClass = "loading";

	var service = function (errorService) {
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
						errorService.criticalError(e);
					}
				}
			},
			getClass: function getClassF() {
				if (theClass === "") {
					return "loading";
				}
				return theClass;
			}
		};

		return res;
	};

	service.$inject = ["ssn.errorService"];

	return service;
});