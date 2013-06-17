define(["jquery"], function ($) {
	"use strict";

	var mainMessages = {
		load: function (done) {
			//$('.scroll-pane').jScrollPane();
			done();
		},
		unload: function (done) {
			done();
		},
		hashChange: function (done) {
			done();
		}
	};

	return mainMessages;
});