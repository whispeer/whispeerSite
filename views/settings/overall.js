define(["jquery"], function ($) {
	"use strict";

	var settings = {
		load: function (done) {
			done();
			$("body").addClass("settingsView");
		}
	};

	return settings;
});