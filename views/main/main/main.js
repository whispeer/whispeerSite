define(["jquery", "display", "config"], function ($, display, config) {
	"use strict";

	var mainMain = {
		/**
		* Main load function.
		* Defines all event handlers etc.
		*/
		load: function (done) {
			this.eventListener();

			done();
		},

		showWarning: function (text, id) {
			var element = $("<div>").addClass("alert").addClass("alert-error").text(text);
			element.append($("<a class='close' data-dismiss='alert' href='#'>&times;</a>"));
			$("#registerwarnings").prepend(element);

			if (typeof id === "undefined") {
				window.setTimeout(function () {
					element.remove();
				}, config.warningTime);
			} else {
				element.attr("id", "registerwarning-" + id);
			}
		},

		hideWarning: function (id) {
			$("#registerwarning-" + id).remove();
		},

		eventListener: function () {
			$('.strength input').keyup(this.passwordStrength);

			$("#register input").click(function () {
				require(["model/session"], function (session) {
					session.registerStarted();
				});
			});

			$('#rmail').change(function () {
				display.checkMail();
				display.mailSame();
			});

			$('#rnickname').change(function () {
				display.checkNickname();
			});

			$('#rmail2').change(display.mailSame);

			$('#register').submit(display.registerNow);

			$(".lock").click(function () {
				if ($(this).attr('encrypted') === "true") {
					$(this).attr('encrypted', "false");
					$(this).children(":first").attr('src', 'img/lock_open.png').attr('alt', 'Not Encrypted');
				} else {
					$(this).attr('encrypted', "true");
					$(this).children(":first").attr('src', 'img/lock_closed.png').attr('alt', 'Encrypted');
				}
			});
		},
		unload: function (done) {
			done()
		}
	};

	return mainMain;
});