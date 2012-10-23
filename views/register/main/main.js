"use strict";

ssn.display.register.main = {
	/**
	* Main load function.
	* Defines all event handlers etc.
	*/
	load: function (done) {
		this.eventListener();

		$("#mail").css("border-color", "").css("background-color", "").removeAttr("disabled");
		$("#password").css("border-color", "").css("background-color", "").removeAttr("disabled");
		$("#loginformsubmit").removeAttr("disabled");
		$("body").addClass("registerView");

		ssn.display.checkMail();
		ssn.display.checkNickname();
		ssn.display.mailSame();

		done();
	},

	showWarning: function (text, id) {
		var element = $("<div>").addClass("alert").addClass("alert-error").text(text);
		element.append($("<a class='close' data-dismiss='alert' href='#'>&times;</a>"));
		$("#registerwarnings").prepend(element);

		if (typeof id === "undefined") {
			window.setTimeout(function () {
				element.remove();
			}, ssn.config.warningTime);
		} else {
			element.attr("id", "registerwarning-" + id);
		}
	},

	hideWarning: function (id) {
		$("#registerwarning-" + id).remove();
	},

	eventListener: function () {
		jQuery('.strength input').keyup(this.passwordStrength);

		$("#register input").click(function () {
			ssn.session.registerStarted();
		});

		$('#rmail').change(function () {
			ssn.display.checkMail();
			ssn.display.mailSame();
		});

		$('#rnickname').change(function () {
			ssn.display.checkNickname();
		});

		$('#rmail2').change(ssn.display.mailSame);

		$('#register').submit(ssn.display.registerNow);

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
	unload: function () {
		ssn.logger.log("unload for register");
		$("body").removeClass("registerView");
	}
};