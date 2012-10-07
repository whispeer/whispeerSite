"use strict";

ssn.display.main = {
	/**
	* Main load function.
	* Defines all event handlers etc.
	*/
	load: function () {
		this.eventListener();
		
		$("body").addClass("registerView");
		$("#sidebar-left, #sidebar-right, #nav-icons, #nav-search").show();
		$("#loginform").hide();
		
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
		$("body").removeClass("mainView");
	}
};