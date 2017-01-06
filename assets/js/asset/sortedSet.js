define ([], function () {
	"use strict";

	/* jshint validthis: true */

	var sortedSet = function (sortFunction) {
		var arr = [];

		arr.clear = function () {
			arr.length = 0;
		};

		arr.push = function () {
			Array.prototype.push.apply(this, arguments);
			this.resort();
		};

		arr.join = function (elements) {
			Array.prototype.push.apply(this, elements);
			this.resort();
		};

		arr.resort = function () {
			this.sort(sortFunction);
		};

		arr.last = function () {
			return arr[arr.length - 1];
		};

		return arr;
	};

	return sortedSet;
});
