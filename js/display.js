var ssn = {};
ssn.display = {};

define(['jquery', 'libs/step', 'asset/logger', 'model/state', 'asset/helper', 'config', 'asset/i18n'], function ($, step, logger, state, h, config, i18n) {
	"use strict";
	var hashes = [];

	var loginF;

	var display = {
		/** set the handler for the login function */
		setLogin: function (func) {
			loginF = func;
		},

		hashHandles: {},
		/** loading function is called on page load */
		load: function () {
			//Fix modals for Opera and IE.
			if (navigator.appName === "Opera" || navigator.appName === "Microsoft Internet Explorer") {
				$('#loadingMain').removeClass('fade');
			}

			$(window).bind('hashchange', function () {
				display.buildHashes();

				var view = display.getHash("view");
				var subview = display.getHash("subview");

				if (typeof view === "undefined" || view === "") {
					if (state.logedin) {
						view = "main";
					} else {
						view = "register";
					}
				}

				if (state.loaded) {
					display.loadView(view, subview);
				}
			});

			$('#loginform').submit(function () {
				try {
					loginF($('#mail').val(), $('#password').val());
					$('#password').val("");
				} catch (e) {
					logger.log(e);
				}

				return false;
			});

			$("#searchQuery").keyup(function () {
				var ele = this;
				step(function () {
					if ($(ele).val().length > 3) {
						require.wrap('model/userManager', this);
					}
				}, h.sF(function (userManager) {
					userManager.search($(ele).val(), this);
				}), h.sF(function (users) {
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
				}));
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
			hashes = [];

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
						hashes[res[0]] = res[1];
					}
				}
			}
		},

		/** get the value for a key from the hash object */
		getHash: function (key) {
			return hashes[key];
		},

		/** set the value for a key in the hash object */
		setHash: function (key, value) {
			hashes[key] = value;

			var k;
			var url = "";
			for (k in hashes) {
				if (hashes.hasOwnProperty(k)) {
					if (typeof hashes[k] !== "undefined") {
						url = url + "&" + k + "=" + hashes[k];
					}
				}
			}

			url = url.substr(1);

			window.location.hash = url;
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
				}, config.warningTime);
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
			display.showWarning(i18n.getValue("warnings.moveMouse"), "notReady");
		},

		/** hide a warning that we are not ready for encryption yet */
		hideNotReadyWarning: function () {
			display.hideWarning("notReady");
			display.showWarning("Es wurden genug Zufallszahlen gesammelt!");
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
			return display[display.loadedView];
			//TODO
		},

		subviewScript: function () {
			if (typeof display[display.loadedView] !== "undefined") {
				return display[display.loadedView][display.subview];
			}

			return undefined;
			//TODO
		},

		/** load a subview
		* @param subview name of subview to load.
		* @author Nilos
		* @created 21-10-2012
		*/
		loadSubView: function (page, subview) {
			logger.log("load subview " + subview);

			$("#main").hide();
			$("#loading").show();

			var stage = 0;

			var done = function () {
				stage += 1;

				if (stage === 2) {
					display.viewLoaded(page, subview);
				}
			};

			display.subview = subview;

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
					display.ajaxError(obj, error);
				},
				success : function (data) {
					try {
						$("#main").html(data);

						done();
					} catch (e) {
						logger.log(e);
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

			if (display.loadedView !== page) {
				logger.log("load View " + page + " - " + subview);

				try {
					display[display.loadedView].unload();
				} catch (e) {
					logger.log(e, logger.ALL);
				}

				try {
					display[display.loadedView][display.subview].unload();
				} catch (e2) {
					logger.log(e2, logger.ALL);
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

				display.setHash("view", page);
				display.loadedView = page;

				var stage = 0;
				var done = function () {
					stage += 1;

					if (stage === 2) {
						var done = function () {
							$("#subMenu").show();
							display.loadSubView(page, subview);
						};

						try {
							logger.log("running " + page + " loader");
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
													logger.log("no action defined");
												} else {
													display.setHash("subview", ele.attr("subview"));
												}
											} else {
												display.viewScript()[ele.attr("action")]();
											}
										} else {
											logger.log(ele.attr("link"));
											//TODO
										}
									}
								});
							});

							done();
						} catch (e) {
							logger.log(e);
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
			} else if (display.subview !== subview) {
				step(function () {
					ssn.display[page].hashChange(this);
				}, function (err) {
					if (err) {
						logger.log(err, logger.ALL);
					}

					display.loadSubView(display.loadedView, subview);
				});
			} else {
				var doneF = function () {
					try {
						ssn.display[page][subview].hashChange(function () {});
					} catch (e) {
						logger.log(e, logger.ALL);
					}
				};

				try {
					ssn.display[page].hashChange(doneF);
				} catch (e3) {
					logger.log(e3, logger.ALL);
					doneF();
				}
			}
		},

		/** called when a view was loaded 
		* @param page page which was loaded.
		*/
		viewLoaded: function (page, subview) {
			logger.log("view loaded");

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
			$("#subMenu").css("height", $("#menu").height());
		},

		/** hide the menu which is available after you logged in */
		hideLogedinMenu: function () {
			$("#loginform").show();
			$("#sidebar-left, #sidebar-right, #nav-icons, #nav-search").hide();
		},

		/** logout button was clicked */
		logout: function () {
			display.hideLogedinMenu();
			display.loadView("register");
			$("#searchInput").text("");
			$("#search_results").html("");

		},

		/** used to load the latest messages (for icon at top */
		loadLatestMessages: function (callback) {
			var messages;
			step(function requireMessages() {
				require.wrap('model/messages', this);
			}, h.sF(function (m) {
				messages = m;
				messages.getLatestTopics(this);
			}), h.sF(function (m) {
				messages.getMessagesTeReSe(m, this);
			}), h.sF(function (data) {
				display.viewLatestMessages(data, this);
			}), callback);
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

			display.badge("message", data.length);

			//$("#messagesDropdown").html("");
			//$("#messagesDropdown").append(full);

			callback();
		},

		/** loads the friendship requests into the dropdown menu
		* @param callback called when done loading
		* @author Nilos
		*/
		loadFriendShipRequests: function (callback) {
			var userManager;
/*			step(function requireUser() {
				require.wrap('model/user', this);
			}, h.sF(function getFriends(u) {
				userManager = u;
				userManager.loadFriends(this);
			}), h.sF(function*/
			userManager.loadFriends(function () {
				userManager.friendShipRequestsUser(function (u) {
					var requests = false;

					$("#friendShipRequests").html("");

					var i;
					for (i = 0; i < u.length; i += 1) {
						if (userManager.userObject(u[i])) {
							var name = u[i].getName();

							var f = $("<div />").append($("<a href='#' class='btn btn-success' id='accept'>Annehmen</a> <a href='#' class='btn btn-danger' id='decline'>Ablehnen</a>"));

							f.children(':first-child').click(userManager.friendShipFunction(u[i]));

							var link = $("<a />").attr("href", "#view=profile&userid=" + u[i].getUserID()).css("display", "inline").text(name);
							f.append(link).attr("name", "friendShipDelete" + u[i].getUserID());

							$("#friendShipRequests").append(f);
							requests = true;
						}
					}

					display.badge("friend", u.length);

					if (!requests) {
						$("#friendShipRequests").text(i18n.getValue("noFriendShipRequests"));
					}

					callback();
				});
			});
		},

		/** start loading the view after login.
		* displays a modal with a loading bar
		*/
		loadingMain: function () {
			display.loadingMainProgress(10);
			$("#loading").show();
		},

		/** called when loading main has finished. hides modal. */
		endLoadingMain: function () {
			logger.log("closing modal");
			$("#loading").hide();
			display.loadingMainProgress(0);
			display.showLogedinMenu();
		},

		/** move the progress bar to percentage
		* @param percentage percentage to move bar to (in %)
		* @author Nilos
		*/
		loadingMainProgress: function (percentage) {
			logger.log("Loaded: " + percentage + "%");
			$('#loadingMainProgressBar').css("width", percentage + "%");
		},

		/** Display a Message in a certain Element.	*/
		message: function (element, text) {
			$('#display-' + element).text(text);
		},

		ajaxError: function () {
			display.showWarning(i18n.getValue("ajaxError"));

			//window.setTimeout(function () {
				//window.location.href = "";
			//}, 2000);
		}

	};

	return display;
});