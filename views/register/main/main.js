define(["jquery", "display", "config", "asset/logger", "libs/step", "crypto/crypto", "asset/helper"], function ($, display, config, logger, step, crypto, h) {
	"use strict";

	var isRegisterStarted = false;
	var keyGenDone = false;
	var keyGenPrivateKey = null;
	var keyGenListener = [];

	var checkMail = function () {
	
	};

	var checkNickname = function () {
	
	};

	var mailSame = function () {
	
	};

	var registerMain = {
		/**
		* Main load function.
		* Defines all event handlers etc.
		*/
		load: function (done) {
			this.eventListener();

			$("nav").hide();
			$("#mail").css("border-color", "").css("background-color", "").removeAttr("disabled");
			$("#password").css("border-color", "").css("background-color", "").removeAttr("disabled");
			$("#loginformsubmit").removeAttr("disabled");
			$("#loginform").fadeIn(1000, "linear");
			$("#callRegister").show();

			$("#callRegister").click(function () {
				// hide login and show register
				$("#loginform").fadeOut(200, "linear", function () {
					$("#registerform").fadeIn(500, "linear");
					$("#callRegister").hide();
					$("#callLogin").show();
				});
				return false;
			});

			$("#callLogin").click(function () {
				// hide login and show register
				$("#registerform").fadeOut(200, "linear", function () {
					$("#loginform").fadeIn(500, "linear");
					$("#callLogin").hide();
					$("#callRegister").show();
				});
				return false;
			});

			checkMail();
			checkNickname();
			mailSame();

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

		registerStarted: function () {
			if (!isRegisterStarted) {
				isRegisterStarted = true;

				logger.log("Register started");
				step(function () {
					crypto.generateKey("", step);
				}, h.sF(function (privateKey) {
					keyGenDone = true;
					keyGenPrivateKey = privateKey;

					var i;
					for (i = 0; i < keyGenListener.length; i += 1) {
						try {
							keyGenListener[i]();
						} catch (e) {
							logger.log(e);
						}
					}

					keyGenListener = [];
				}));
			}
		},

		addKeyListener: function (listener) {
			if (keyGenDone) {
				try {
					listener();
				} catch (e) {
					logger.log(e);
				}
			} else {
				if (typeof listener === "function") {
					keyGenListener.push(listener);
				} else {
					logger.log("not a listener!" + typeof listener);
				}
			}
		},

		eventListener: function () {
			$('.strength input').keyup(this.passwordStrength);

			$("#registerform input").click(function () {
				registerMain.registerStarted();
			});

			$('#rmail').change(function () {
				checkMail();
				mailSame();
			});

			$('#rnickname').change(checkNickname);

			$('#rmail2').change(mailSame);

			$('#registerform').submit(registerMain.registerNow);

			$(".lock").click(function () {
				if ($(this).attr('encrypted') === "true") {
					$(this).attr('encrypted', "false");
					$(this).children(":first").attr('src', 'img/lock_open.png').attr('alt', 'Not Encrypted');
				} else {
					$(this).attr('encrypted', "true");
					$(this).children(":first").attr('src', 'img/lock_closed.png').attr('alt', 'Encrypted');
				}
			});

			$('#loginform').submit(function () {
				try {
					require(["model/session"], function theSession(session) {
						session.login($('#mail').val(), $('#password').val());
						$('#password').val("");
					});
				} catch (e) {
					logger.log(e);
				}

				return false;
			});
		},
		unload: function (done) {
			logger.log("unload for register");
			$("nav").show();
			done();
		}
	};

	return registerMain;
});