define(["jquery", "display", "asset/logger", "asset/helper", "libs/step"], function ($, display, logger, h, step) {
	"use strict";

	var profileMain = {
		/**
		* Profile load function
		* Hide big user picture
		*/
		load: function (done) {
			$("#psendMessage").click(function () {
				var u = display.profile.user;
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
							$("#pfriendShip").text(translation.getValue("friendShipRequested"));
						} else {
							$("#pfriendShip").text(translation.getValue("friendShipRequestedFailed"));
						}
					});
				}
			});

			this.setUserData(done);
		},

		hashChange: function (done) {
			this.setUserData(done);
		},

		unload: function () {
		},

		setUserData: function (done) {
			var u = display.viewScript().user;
			step(function () {
				u.getName(this);
			}, h.sF(function (name) {
				$("#pname").text(name);

				$("#pnick").text(u.getNickname());

				$("#pid").text(u.getUserID());
				$("#pnick2").text(u.getNickname());
				$("#pfirstname").text(u.getValue("firstname"));
				$("#plastname").text(u.getValue("lastname"));
				$("#infowrap").css("background-image", "url(img/testbanner.jpg)");
				// TODO: just do the following two steps if the text really needs to be white!
				$("#infowrap").css("color", "#fff");
				$("#infowrap i").addClass("icon-white");

				if (!u.ownUser()) {
					$("#psendMessage").text(translation.getValue("sendMessage")).show();

					if (u.isFriend()) {
						$("#pfriendShip").text(translation.getValue("isFriend"));
					} else if (u.didIRequestFriendShip()) {
						$("#pfriendShip").text(translation.getValue("friendShipRequested"));
					} else if (u.hasFriendShipRequested()) {
						$("#pfriendShip").text(translation.getValue("acceptFriendShipRequest"));
					} else {
						$("#pfriendShip").text(translation.getValue("friendShipUser"));
					}
				} else {
					$("#psendMessage").hide();
					$("#pfriendShip").text(translation.getValue("thisIsYou"));
				}

				this();
			}), done);
		}
	};

	return profileMain;
});