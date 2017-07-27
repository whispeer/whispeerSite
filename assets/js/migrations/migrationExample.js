"use strict";
const Bluebird = require("bluebird");

module.exports = function ($injector, cb) {
	return Bluebird.try(function() {
		return;
	}).then(function() {
		return true;
	}).nodeify(cb);
};
