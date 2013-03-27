define(["jquery", "display", "config", "asset/logger", "libs/step", "asset/helper"], function ($, display, config, logger, step, h) {
	"use strict";

	var isRegisterStarted = false;
	var keyGenDone = false;
	var keyGenPrivateKey = null;
	var keyGenListener = [];

	var checkMail = function () {
		step(function () {
			var mail = $("#rmail").val();

			if (mail !== "") {
				h.ajax({
					url: "api/session/checkMail.php?mail=" + mail
				}, this);
			} else {
				this.ne(false);
			}
		}, h.sF(function (mailData) {
			mailData = $.parseJSON(mailData);
			if (mailData.mailUsed === 0 && mailData.mailValid === 1) {
				this.ne(true);
			} else {
				this.ne(false);
			}
		}), function (e, result) {
			if (result) {
				$("#rmailIcon").removeClass("fail").addClass("check").html('<img src="img/accept.png" alt="Ok!">');
			} else {
				$("#rmailIcon").removeClass("check").addClass("fail").html('<img src="img/fail.png" alt="Ok!">');
			}
		});
	};

	var checkNickname = function () {
		step(function () {
			var nick = $("#rnickname").val();

			if (nick !== "") {
				h.ajax({
					url: "api/session/checkNickname.php?nickname=" + nick
				}, this);
			} else {
				this.ne(false);
			}
		}, h.sF(function (nicknameData) {
			nicknameData = $.parseJSON(nicknameData);
			if (nicknameData.nicknameUsed === 0 && nicknameData.nicknameValid === 1) {
				this.ne(true);
			} else {
				this.ne(false);
			}
		}), function (e, result) {
			if (result) {
				$("#rnicknameIcon").removeClass("fail").addClass("check").html('<img src="img/accept.png" alt="Ok!">');
			} else {
				$("#rnicknameIcon").removeClass("check").addClass("fail").html('<img src="img/fail.png" alt="Ok!">');
			}
		});
	};

	var mailSame = function () {
		if ($("#rmail").val() === $("#rmail2").val() && $("#rmail").val() !== "") {
			$("#rmail2Icon").removeClass("fail").addClass("check").html('<img src="img/accept.png" alt="Ok!">');
		} else {
			$("#rmail2Icon").removeClass("check").addClass("fail").html('<img src="img/fail.png" alt="Ok!">');
		}
	};

	var pwSame = function () {
		if ($("#rpassword").val() === $("#rpassword2").val() && $("#rpassword").val() !== "") {
			$("#rpassword2Icon").removeClass("fail").addClass("check").html('<img src="img/accept.png" alt="Ok!">');
		} else {
			$("#rpassword2Icon").removeClass("check").addClass("fail").html('<img src="img/fail.png" alt="Ok!">');
		}
	};

	var registerNow = function () {
		step(function () {
			if (!keyGenDone) {
				registerMain.addKeyListener(this);
			} else {
				this.ne();
			}
		}, h.sF(function () {
			require.wrap("model/session", this);
		}), h.sF(function (session) {
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
			profil.firstname = {};
			profil.lastname = {};

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

		$("#registerform").find(":input").attr("disabled", true);

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
			isRegisterStarted = false;
			keyGenDone = false;
			keyGenPrivateKey = null;
			keyGenListener = [];

			this.eventListener();

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
			pwSame();

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
			$('#rpassword').keyup(function(){
				var password = jQuery(this).val();
				var strength = 0;
				
				// Adapted from http://www.codeproject.com/KB/scripting/passwordstrength.aspx
				if (password.length > 4) strength++; // Greater than 4 chars long
				if ( ( password.match(/[a-z]/) ) && ( password.match(/[A-Z]/) ) ) strength++; // Mix of upper and lower chars
				if (password.match(/\d+/)) strength++; // Contains a number
				if (password.match(/.[!,@,#,$,%,^,&,*,?,_,~,-,(,)]/) ) strength++; // Contains a special char
				if (password.length > 10) strength++; // Longer than 10 chars
				
				$('#rpasswordIcon').attr('data-strength', strength);	
			});

			$('#rmail').change(function () {
				checkMail();
				mailSame();
			});
			$('#rmail2').change(mailSame);

			$('#rnickname').change(checkNickname);

			$("#rpassword").change(pwSame);
			$("#rpassword2").change(pwSame);

			$(".lock").click(function () {
				if ($(this).attr('encrypted') === "true") {
					$(this).attr('encrypted', "false");
					$(this).children(":first").attr('src', 'img/lock_open.png').attr('alt', 'Not Encrypted');
				} else {
					$(this).attr('encrypted', "true");
					$(this).children(":first").attr('src', 'img/lock_closed.png').attr('alt', 'Encrypted');
				}
			});

			$("#registerform input").click(registerStarted);
			$('#registerform').submit(registerNow);

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