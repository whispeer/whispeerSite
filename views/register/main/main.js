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

	var registerNow = function () {
		step(function () {
			require.wrap("model/session", this);
		}, h.sF(function (session) {
			var mail = $("#rmail").val();
			var mail2 = $("#rmail2").val();
			var nickname = $("#rnickname").val();
			var password = $("#rpassword").val();
			var password2 = $("#rpassword2").val();

			//check data
			var error = false;
			var errors = [];

			if (mail !== mail2) {
				error = true;
				errors.push(session.register.MAILNOTEQUAL);
			}

			if (password !== password2) {
				error = true;
				errors.push(session.register.PWNOTEQUAL);
			}

			if (error) {
				this.last.ne(errors);
			}

			//set profile data
			var profil = {};
			profil.firstname.v = $("#firstname").val();
			profil.firstname.e = $("#firstnamelock").attr("encrypted");
			profil.lastname.v = $("#lastname").val();
			profil.lastname.e = $("#lastnamelock").attr("encrypted");

			//set key password
			keyGenPrivateKey.setPassword("", password);
			session.registerAjax(mail, nickname, keyGenPrivateKey, password, profil, this);
		}), function (err, regErrors) {
			logger.log(arguments);
		});
		return false;
	};

	var registerStarted = function () {
		if (!isRegisterStarted) {
			isRegisterStarted = true;

			logger.log("Register started");
			step(function () {
				crypto.generateKey("", this);
			}, h.sF(function (privateKey) {
				logger.log("Key Generation done");
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

			$("#registerform input").click(registerStarted);

			$('#rmail').change(function () {
				checkMail();
				mailSame();
			});

			$('#rnickname').change(checkNickname);

			$('#rmail2').change(mailSame);

			$('#registerform').submit(registerNow);

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