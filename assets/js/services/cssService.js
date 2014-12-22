define([], function () {
	"use strict";

	var listeners = [], theClass = "loading", isBox = false;

	var service = function (errorService) {
		var res = {
			addListener: function addListenerF(func) {
				if (typeof func === "function") {
					listeners.push(func);
				}
			},
			callListeners: function () {
				listeners.forEach(function (listener) {
					try {
						listener(theClass, isBox);
					} catch (e) {
						errorService.criticalError(e);
					}
				});
			},
			setClass: function setClassF(_theClass, _isBox) {
				theClass = _theClass;
				isBox = _isBox || false;
				res.callListeners();
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