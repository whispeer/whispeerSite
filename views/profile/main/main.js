define(["jquery", "display", "asset/logger", "asset/helper", "libs/step"], function ($, display, logger, h, step) {
	"use strict";

	var i18n;

	var profileMain = {
		/**
		* Profile load function
		* Hide big user picture
		*/
		load: function (done) {
			step(function () {
				require.wrap("asset/i18n!user", this);
			}, h.sF(function (translation) {
				i18n = translation;
				$("#psendMessage").click(function () {
					var u = display.viewScript().user;
					if (u !== null && !u.ownUser()) {
						window.location.href = "#view=messages&sendMessage=" + u.getUserID();
					}
				});

				$("#pfriendShip").click(function () {
					var u = display.viewScript().user;

					if (u !== null && !u.ownUser() && !u.isFriend() && !u.didIRequestFriendShip()) {
						u.friendShip(function (ret) {
							logger.log("Friendship: " + ret);

							if (ret === true) {
								if (u.isFriend())  {
									$("#pfriendShip").text(i18n.getValue("user.isFriend"));
								} else {
									$("#pfriendShip").text(i18n.getValue("user.friendShipRequested"));
								}
							} else {
								$("#pfriendShip").text(i18n.getValue("user.friendShipRequestedFailed"));
							}
						});
					}
				});

				profileMain.setUserData(this);
			}), done);
		},

		hashChange: function (done) {
			profileMain.setUserData(done);
		},

		unload: function (done) {
			done();
		},

		setUserData: function (done) {
			var u = display.viewScript().user;
			step(function () {
				u.getName(this.parallel());
				u.getValue("firstname", this.parallel());
				u.getValue("lastname", this.parallel());
			}, h.sF(function (data) {
				var name = data[0];
				var firstName = data[1];
				var lastName = data[2];
				$("#pname").text(name);

				$("#pnick").text(u.getNickname());

				$("#pid").text(u.getUserID());
				$("#pnick2").text(u.getNickname());
				$("#pfirstname").text(firstName);
				$("#plastname").text(lastName);
				// TODO: just do the following two steps if the text really needs to be white!
				$("#infowrap").css("color", "#fff");
				$("#infowrap i").addClass("icon-white");
				$("#infowrap").css("background-image", "url(img/testbanner.jpg)");

				if (!u.ownUser()) {
					$("#psendMessage").text(i18n.getValue("user.sendMessage")).show();

					if (u.isFriend()) {
						$("#pfriendShip").text(i18n.getValue("user.isFriend"));
					} else if (u.didIRequestFriendShip()) {
						$("#pfriendShip").text(i18n.getValue("user.friendShipRequested"));
					} else if (u.hasFriendShipRequested()) {
						$("#pfriendShip").text(i18n.getValue("user.acceptFriendShipRequest"));
					} else {
						$("#pfriendShip").text(i18n.getValue("user.friendShipUser"));
					}
				} else {
					$("#psendMessage").hide();
					$("#pfriendShip").text(i18n.getValue("user.thisIsYou"));
				}

				this();
			}), done);
		}
	};

	return profileMain;
});