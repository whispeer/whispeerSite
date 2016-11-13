define(["bluebird"], function (Bluebird) {
	"use strict";
	return function ($injector, cb) {
		return Bluebird.try(function() {
			return;
		}).then(function() {
			return true;
		}).nodeify(cb);
	};
});
