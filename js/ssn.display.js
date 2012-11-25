"use strict";
if (typeof (ssn) === "undefined") {
	var ssn = {};
}

ssn.display = {
	loadedView: "",
	hashes: {},
	hashHandles: {"logout": ssn.session.logout},

	/** our script loading callback array. also safes when a script was already load before */
	scriptC: [],

	/** loading function is called on page load */
	load: function () {
		//Fix modals for Opera and IE.
		if (navigator.appName === "Opera" || navigator.appName === "Microsoft Internet Explorer") {
			$('#loadingMain').removeClass('fade');
		}

		$("#subMenu").css("height", $("#menu").height())

		$(window).bind('hashchange', function () {
			ssn.display.buildHashes();

			var view = ssn.display.getHash("view");
			var subview = ssn.display.getHash("subview");

			if (typeof view === "undefined" || view === "") {
				if (ssn.session.logedin) {
					view = "main";
				} else {
					view = "register";
				}
			}

			if (ssn.loaded) {
				ssn.display.loadView(view, subview);
			}
		});

		$('#loginform').submit(function () {
			try {
				ssn.session.login($('#mail').val(), $('#password').val());
				$('#password').val("");
			} catch (e) {
				ssn.logger.log(e);
			}

			return false;
		});

		$("#searchQuery").keyup(function () {
			if ($(this).val().length > 3) {
				ssn.userManager.search($(this).val(), function (users) {
					$("#searchSuggestions").html("");

					var i = 0;
					for (i = 0; i < users.length; i += 1) {
						var user = users[i];

						var li = $("<li>");
						var a = $("<a>");

						a.text(user.getName());

						a.attr("href", "#view=profile&userid=" + user.getUserID());

						li.append(a);
						$("#searchSuggestions").append(li);
					}

					$("#searchDrop").show();
				});
			}
		});

		$("#searchQuery").click(function (e) {
			if ($(this).val().length > 3) {
				$("#searchDrop").show();
				e.stopPropagation();
			}
		});

		$("body").click(function () {
			$("#searchDrop").hide();
		});
	},

	/** builds the variables from the hash string e.g. makes ["a" => "b", "d" => "f"] from #a=b&d=f  */
	buildHashes: function () {
		this.hashes = [];

		var hash = $(location).attr("hash").substr(1);

		if (typeof this.hashHandles[hash] === "function") {
			this.hashHandles[hash]();
		}

		var vals = hash.split("&");
		var i;
		var res;
		for (i = 0; i < vals.length; i += 1) {
			res = vals[i].split("=");
			if (typeof res[1] !== "undefined" && typeof res[0] !== "undefined") {
				if (res[0] !== "") {
					this.hashes[res[0]] = res[1];
				}
			}
		}
	},

	/** get the value for a key from the hash object */
	getHash: function (key) {
		return this.hashes[key];
	},

	/** set the value for a key in the hash object */
	setHash: function (key, value) {
		this.hashes[key] = value;

		var k;
		var url = "";
		for (k in this.hashes) {
			if (this.hashes.hasOwnProperty(k)) {
				if (typeof this.hashes[k] !== "undefined") {
					url = url + "&" + k + "=" + this.hashes[k];
				}
			}
		}

		url = url.substr(1);

		window.location.hash = url;
	},

	/** called when the register button is clicked
	* TODO: Move to ssn.display.register.js
	*/
	registerNow: function () {
		try {
			var error = false;

			$('#rmail').css("border-color", "");
			$('#rmail2').css("border-color", "");
			$('#rnickname').css("border-color", "");
			$('#rpassword').css("border-color", "");
			$('#rpassword2').css("border-color", "");

			if ($('#rmail').val() !== $('#rmail2').val()) {
				error = true;
				$('#rmail').css("border-color", "red");
				$('#rmail2').css("border-color", "red");
			}

			if ($('#rmail').val() === "" && $('#rnickname').val() === "") {
				error = true;
				$('#rmail').css("border-color", "red");
				$('#rnickname').css("border-color", "red");
			}

			if (ssn.session.passwordStrength($('#rpassword').val()) < 3) {
				error = true;
				$('#rpassword').css("border-color", "red");
			}

			if ($('#rpassword').val() !== $('#rpassword2').val()) {
				error = true;
				$('#rpassword').css("border-color", "red");
				$('#rpassword2').css("border-color", "red");
			}

			if (!error) {
				var profil = {
					firstName: {
						e: $('#firstnamelock').attr('encrypted'),
						v: $('#firstname').val()
					},

					lastName: {
						e: $('#lastnamelock').attr('encrypted'),
						v: $('#lastname').val()
					}
				};

				ssn.session.register($('#rmail').val(), $('#rnickname').val(), $('#rpassword').val(), profil);
			}
		} catch (e) {
			ssn.logger.log(e);
		}

		return false;
	},

	/** change the count for a certain badge
	* @param type badge type (e.g. message or friends)
	* @param count new count
	* @author Nilos
	* @created 22-06-2012
	*/
	badge: function (type, count) {
		var item = $("#" + type + "Badge");
		if (count > 0) {
			item.text(count);
			item.show();
		} else {
			item.hide();
		}
	},

	//TODO: display fields which are wrong / should be changed
	/** gets the errors during register and displays those errors
	* @param data data returned from server on register
	* @author Nilos
	* @created ?
	*/
	registerError: function (data) {

	},

	/** show a warning if no id is given warning is automatically removed.
	* @param text message for the warning
	* @param id id for the warning to remove it later
	* @author Nilos
	* @created ?
	*/
	showWarning: function (text, id) {
		if (typeof id !== "undefined") {
			if ($("#warning-" + id).length > 0) {
				return;
			}
		}

		var element = $("<div>").addClass("alert").addClass("alert-error").text(text);
		element.append($("<a class='close' data-dismiss='alert' href='#'>&times;</a>"));
		$("#warnings").prepend(element);

		if (typeof id === "undefined") {
			window.setTimeout(function () {
				element.remove();
			}, ssn.config.warningTime);
		} else {
			element.attr("id", "warning-" + id);
		}
	},

	/** hide a warning
	* @param id which warning?
	* @author Nilos
	*/
	hideWarning: function (id) {
		$("#warning-" + id).remove();
	},

	/** show a warning that we are not ready for encryption yet */
	showNotReadyWarning: function () {
		ssn.display.showWarning(ssn.translation.getValue("moveMouse"), "notReady");
	},

	/** hide a warning that we are not ready for encryption yet */
	hideNotReadyWarning: function () {
		ssn.display.hideWarning("notReady");
		ssn.display.showWarning("Es wurden genug Zufallszahlen gesammelt!");
	},

	//TODO: Display a loading icon
	/** login has started */
	loginStarted: function () {
		$("#mail").attr("disabled", "disabled");
		$("#password").attr("disabled", "disabled");
		$("#loginformsubmit").attr("disabled", "disabled");
	},


	/** called when login failed */
	loginError: function () {
		$("#mail").addClass("loginError").removeAttr("disabled");
		$("#password").addClass("loginError").removeAttr("disabled");
		$("#loginformsubmit").removeAttr("disabled");

		$("#password").focus();

		window.setTimeout(function () {
			$("#mail").removeClass("loginError").addClass("loginError2");
			$("#password").removeClass("loginError").addClass("loginError2");
		}, 700);
	},

	/** called when login was successfull */
	loginSuccess: function () {
		$("#mail").css("border-color", "green").css("background-color", "green");
		$("#password").css("border-color", "green").css("background-color", "green");
	},

	viewScript: function () {
		return ssn.display[ssn.display.loadedView];
		//TODO
	},

	subviewScript: function () {
		if (typeof ssn.display[ssn.display.loadedView] !== "undefined") {
			return ssn.display[ssn.display.loadedView][ssn.display.subview];
		}

		return undefined;
		//TODO
	},

	/** is called by external scripts onload
	* @param script script which was loaded.
	*/
	scriptLoaded: function (script) {
		var toCall = ssn.display.scriptC[script];
		ssn.display.scriptC[script] = true;

		var i;
		for (i = 0; i < toCall.length; i += 1) {
			try {
				toCall[i]();
			} catch (e) {
				ssn.logger.log(e);
			}
		}
	},

	/** load a script
	* @param script script path to load.
	* @param callback callback to call onload
	*/
	loadScript: function (script, callback) {
		if (typeof ssn.display.scriptC[script] === "undefined") {
			ssn.display.scriptC[script] = [];
		}

		if (ssn.display.scriptC[script] === true) {
			callback();
		} else {
			ssn.display.scriptC[script].push(callback);
		}

		if (ssn.display.scriptC[script].length === 1) {
			var s = document.createElement("script");
			s.setAttribute("src", script);
			document.body.appendChild(s);
		}
	},

	/** load a subview
	* @param subview name of subview to load.
	* @author Nilos
	* @created 21-10-2012
	*/
	loadSubView: function (page, subview) {
		ssn.logger.log("load subview " + subview);

		$("#main").hide();
		$("#loading").show();

		var stage = 0;

		var done = function () {
			stage += 1;

			if (stage === 2) {
				ssn.display.viewLoaded(page, subview);
			}
		};

		ssn.display.subview = subview;

		$("#subMenu").children().each(function () {
			var ele = $(this.firstChild);
			if (ele.attr("subview") === subview) {
				ele.addClass("current");
			} else {
				ele.removeClass("current");
			}
		});

		$.ajax({
			type : "GET",
			dataType: 'html',
			url : "views/" + page + "/" + subview + "/" + subview + ".view",
			error : function (obj, error) {
				ssn.display.ajaxError(obj, error);
			},
			success : function (data) {
				try {
					$("#main").html(data);

					done();
				} catch (e) {
					ssn.logger.log(e);
				}
			}
		});

		$.ajax({
			url: "views/" + page + "/" + subview + "/" + subview + ".js",
			dataType: "script",
			success: done,
			error : done
		});
	},

	/** load a view. Loads html and display file.
	* @TODO: fix eval loading
	* @param page name of the view to load.
	* @author Nilos
	* @created ?
	*/
	loadView: function (page, subview) {
		if (typeof subview === "undefined") {
			subview = "main";
		}

		if (typeof ssn.display[page] === "undefined") {
			ssn.display[page] = {};
		}

		if (typeof ssn.display[page][subview] === "undefined") {
			ssn.display[page][subview] = {};
		}

		if (ssn.display.loadedView !== page) {
			ssn.logger.log("load View " + page + " - " + subview);
		
			try {
				ssn.display[ssn.display.loadedView].unload();
			} catch (e) {
				ssn.logger.log(e, ssn.logger.ALL);
			}

			try {
				ssn.display[ssn.display.loadedView][ssn.display.subview].unload();
			} catch (e2) {
				ssn.logger.log(e2, ssn.logger.ALL);
			}

			$("#main").hide();
			$("#loading").show();
			$("#subMenu").hide();

			$("#mainMenu").children().each(function () {
				var ele = $(this.firstChild);
				if (ele.attr("view") === page) {
					ele.addClass("current");
				} else {
					ele.removeClass("current");
				}
			});

			ssn.display.setHash("view", page);
			ssn.display.loadedView = page;

			var stage = 0;
			var done = function () {
				stage += 1;

				if (stage === 2) {
					var done = function () {
						$("#subMenu").show();
						ssn.display.loadSubView(page, subview);
					};

					try {
						console.log("running " + page + " loader");
						ssn.display[page].load(done);
					} catch (e) {
						done();
					}
				}
			};

			$.ajax({
				type : "GET",
				dataType: 'html',
				url : "views/" + page + "/menu.view",
				error : function () {
					$("#subMenu").html("");
					done();
				},
				success : function (data) {
					try {
						$("#subMenu").html(data);
						$("#subMenu").children().each(function () {
							var ele = $(this.firstChild);

							ele.click(function () {
								if (typeof ele.attr("href") === "undefined") {
									if (typeof ele.attr("link") === "undefined") {
										if (typeof ele.attr("action") === "undefined") {
											if (typeof ele.attr("subview") === "undefined") {
												ssn.logger.log("no action defined");
											} else {
												ssn.display.setHash("subview", ele.attr("subview"));
											}
										} else {
											ssn.display.viewScript()[ele.attr("action")]();
										}
									} else {
										ssn.logger.log(ele.attr("link"));
										//TODO
									}
								}
							});
						});

						done();
					} catch (e) {
						ssn.logger.log(e);
					}
				}
			});

			$.ajax({
				url: "views/" + page + "/overall.js",
				dataType: "script",
				success: function () {
					done();
				},
				error : function () {
					done();
				}
			});
		} else if (ssn.display.subview !== subview) {
			ssn.display.loadSubView(ssn.display.loadedView, subview);
		} else {
			var doneF = function () {
				try {
					ssn.display[page][subview].hashChange(function () {});
				} catch (e) {
					ssn.logger.log(e, ssn.logger.ALL);
				}
			};

			try {
				ssn.display[page].hashChange(doneF);
			} catch (e3) {
				ssn.logger.log(e3, ssn.logger.ALL);
				doneF();
			}
		}
	},

	/** called when a view was loaded 
	* @param page page which was loaded.
	*/
	viewLoaded: function (page, subview) {
		ssn.logger.log("view loaded");

		var end = function () {
			$("#loading").hide();
			$("#main").show();
		};

		var done = function () {
			try {
				ssn.display[page][subview].load(end);
			} catch (e) {
				end();
			}
		};

		done();
	},

	/** show the menu which is available after you logged in. */
	showLogedinMenu: function () {
		$("#loginform").hide();
		$("#sidebar-left, #sidebar-right, #nav-icons, #nav-search").show();
	},

	/** hide the menu which is available after you logged in */
	hideLogedinMenu: function () {
		$("#loginform").show();
		$("#sidebar-left, #sidebar-right, #nav-icons, #nav-search").hide();
	},

	/** logout button was clicked */
	logout: function () {
		ssn.display.hideLogedinMenu();
		ssn.display.loadView("register");
		$("#searchInput").text("");
		$("#search_results").html("");

	},

	/** used to load the latest messages (for icon at top */
	loadLatestMessages: function (callback) {
		ssn.messages.getLatestTopics(function (m) {
			ssn.messages.getMessagesTeReSe(m, function (data) {
				ssn.display.viewLatestMessages(data, callback);
			});
		});
	},

	/** used to view the latest messages
	* @param data data to display. (TeReSe object)
	* @param callback called after messages where displayed.
	* @author Nilos
	*/
	viewLatestMessages: function (data, callback) {
		var full = $("<div/>");

		var current, receiver;

		var showM = function (topicid) {
			return function () {
				window.location.href = "#view=messages&topic=" + topicid;
			};
		};

		var i = 0;
		for (i = 0; i < data.length; i += 1) {
			current = data[i];
			var names = $("<div/>");
			var k = 0;
			for (k = 0; k < current.r.length; k += 1) {
				receiver = data[i].r[k];
				var name;
				if (k < current.r.length - 1) {
					name = $("<p/>").text(receiver.getName() + ", ").attr("href", "#view=profile&userid=" + receiver.getUserID()).css("display", "inline");
				} else {
					name = $("<p/>").text(receiver.getName()).attr("href", "#view=profile&userid=" + receiver.getUserID()).css("display", "inline");
				}
				names.append(name);
			}

			var element = $("<div/>").append(names).append(
				$("<div/>").text(current.t)
			).addClass("topicbox").click(
				showM(current.m.getTopicID())
			);

			full.append(element);

		}

		ssn.display.badge("message", data.length);

		//$("#messagesDropdown").html("");
		//$("#messagesDropdown").append(full);

		callback();
	},

	/** loads the friendship requests into the dropdown menu
	* @param callback called when done loading
	* @author Nilos
	*/
	loadFriendShipRequests: function (callback) {
		ssn.userManager.loadFriends(function () {
			ssn.userManager.friendShipRequestsUser(function (u) {
				var requests = false;

				$("#friendShipRequests").html("");

				var i;
				for (i = 0; i < u.length; i += 1) {
					if (ssn.userManager.userObject(u[i])) {
						var name = u[i].getName();

						var f = $("<div />").append($("<a href='#' class='btn btn-success' id='accept'>Annehmen</a> <a href='#' class='btn btn-danger' id='decline'>Ablehnen</a>"));

						f.children(':first-child').click(ssn.userManager.friendShipFunction(u[i]));

						var link = $("<a />").attr("href", "#view=profile&userid=" + u[i].getUserID()).css("display", "inline").text(name);
						f.append(link).attr("name", "friendShipDelete" + u[i].getUserID());

						$("#friendShipRequests").append(f);
						requests = true;
					}
				}

				ssn.display.badge("friend", u.length);

				if (!requests) {
					$("#friendShipRequests").text(ssn.translation.getValue("noFriendShipRequests"));
				}

				callback();
			});
		});
	},

	/** start loading the view after login.
	* displays a modal with a loading bar
	*/
	loadingMain: function () {
		ssn.display.loadingMainProgress(10);
		$("#loading").show();
	},

	/** called when loading main has finished. hides modal. */
	endLoadingMain: function () {
		ssn.logger.log("closing modal");
		$("#loading").hide();
		ssn.display.loadingMainProgress(0);
		ssn.display.showLogedinMenu();
	},

	/** move the progress bar to percentage
	* @param percentage percentage to move bar to (in %)
	* @author Nilos
	*/
	loadingMainProgress: function (percentage) {
		ssn.logger.log("Loaded: " + percentage + "%");
		$('#loadingMainProgressBar').css("width", percentage + "%");
	},

	// TODO
	passwordStrength: function () {
		var strength = ssn.session.passwordStrength(jQuery(this).val());

		jQuery(this).parent().attr('data-strength', strength);
		if (strength < 4) {
			$('#rpassword').qtip({
				content: "Dein Passwort ist nicht sicher. Bitte w&auml;hle ein st&auml;rkeres.",// <- Da editieren!
				show: {
					event: "click"
				},
				hide: {
					event: "click"
				},
				position: {
					at: "center right",
					my: "center left"
				},
				style: {
					classes: "ui-tooltip-red ui-tooltip-shadow ui-tooltip-rounded"
				}
			});
		} else if (strength > 4 && strength < 10) {
			$('#rpassword').qtip({
				content: "Dein Passwort ist relativ sicher. Wir empfehlen dennoch ein noch stärkeres zu wählen!",// <- Da editieren!
				show: {
					event: "click"
				},
				hide: {
					event: "click"
				},
				position: {
					at: "center right",
					my: "center left"
				},
				style: {
					classes: "ui-tooltip-yellow ui-tooltip-shadow ui-tooltip-rounded"
				}
			});
		} else if (strength === 10) {
			$('#rmail').qtip({
				content: "Deine Passwort ist sehr stark!",// <- Da editieren!
				show: {
					event: "click"
				},
				hide: {
					event: "click"
				},
				position: {
					at: "center right",
					my: "center left"
				},
				style: {
					classes: "ui-tooltip-green ui-tooltip-shadow ui-tooltip-rounded"
				}
			});
		}
	},

	/** Display a Message in a certain Element.	*/
	message: function (element, text) {
		$('#display-' + element).text(text);
	},

	checkMail: function () {
		if ($("#rmail").val() !== "") {
			ssn.session.checkMail($('#rmail').val(), this.checkMail2);
		} else {
			this.checkMail2(false, false, "");
		}
	},

	checkMail2: function (mailok, mailvalid, mail) {
		if ($('#rmail').val() === mail) {
			if (mailok && mailvalid) {
				$('#email').show();
				$('.micon').attr("src", "img/accept.png");
				//.text("&check; Die E-Mail Adresse ist g&uuml;ltig und wurde noch nicht verwendet!")
			} else if (!mailvalid) {
				$('#email').show();
				$('.micon').attr("src", "img/fail.png");
				//.text("Deine E-Mail Adresse ist ung&uuml;ltig!!")
			} else {
				$('#email').show();
				$('.micon').attr("src", "img/fail.png");
				//.text("Deine E-Mail Adresse wird bereits verwendet!")
			}
		}
	},

	checkNickname: function () {
		if ($('#rnickname').val() !== "") {
			ssn.session.checkNickname($('#rnickname').val(), this.checkNickname2);
		} else {
			this.checkNickname2(false, false, "");
		}
	},

	checkNickname2: function (nicknameok, nicknamevalid, nickname) {
		if ($('#rnickname').val() === nickname) {
			if (nicknameok && nicknamevalid) {
				$('.micon3').attr("src", "img/accept.png");
			} else if (!nicknamevalid) {
				$('.micon3').attr("src", "img/fail.png");
			} else {
				$('.micon3').attr("src", "img/fail.png");
			}
		}
	},

	/** checks if the two entered mails are the same. */
	mailSame: function () {
		if ($('#rmail').val() !== $('#rmail2').val()) {
			$('#email2').show();
			$('.micon2').attr("src", "img/fail.png");
			//$('#mail2').text("Deine E-Mail Adressen stimmen nicht &uuml;berein!!");
		} else {
			$('#email2').show();
			$('.micon2').attr("src", "img/accept.png").attr("alt", "&check;");
			//$('#mail2').text("&check; Die E-Mail Adressen stimmen &uuml;berein!");
		}
	},

	ajaxError: function () {
		ssn.display.showWarning(ssn.translation.getValue("ajaxError"));

		//window.setTimeout(function () {
			//window.location.href = "";
		//}, 2000);
	}
};