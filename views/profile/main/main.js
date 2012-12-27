"use strict";

ssn.display.profile.main = {
	/**
	* Profile load function
	* Hide big user picture
	*/
	load: function (done) {
		$("#psendMessage").click(function () {
			var u = ssn.display.profile.user;
			if (u !== null && !u.ownUser()) {
				window.location.href = "#view=messages&sendMessage=" + u.getUserID();
			}
		});

		$("#pfriendShip").click(function () {
			var u = ssn.display.profile.user;

			if (u !== null && !u.ownUser() && !u.isFriend() && !u.didIRequestFriendShip()) {
				u.friendShip(function (ret) {
					ssn.logger.log("Friendship: " + ret);

					if (ret === true) {
						$("#pfriendShip").text(ssn.translation.getValue("friendShipRequested"));
					} else {
						$("#pfriendShip").text(ssn.translation.getValue("friendShipRequestedFailed"));
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
		var u = ssn.display.profile.user;
		$("#pname").text(u.getName());

		$("#pnick").text(u.getNickname());

		$("#pid").text(u.getUserID());
		$("#pnick2").text(u.getNickname());
		$("#pfirstname").text(u.getValue("firstname"));
		$("#plastname").text(u.getValue("lastname"));
		// TODO: just do the following two steps if the text really needs to be white!
		$("#infowrap").css("color", "#fff");
		$("#infowrap i").addClass("icon-white");
		$("#infowrap").css("background-image", "url(img/testbanner.jpg)");

		if (!u.ownUser()) {
			$("#psendMessage").text(ssn.translation.getValue("sendMessage")).show();

			if (u.isFriend()) {
				$("#pfriendShip").text(ssn.translation.getValue("isFriend"));
			} else if (u.didIRequestFriendShip()) {
				$("#pfriendShip").text(ssn.translation.getValue("friendShipRequested"));
			} else if (u.hasFriendShipRequested()) {
				$("#pfriendShip").text(ssn.translation.getValue("acceptFriendShipRequest"));
			} else {
				$("#pfriendShip").text(ssn.translation.getValue("friendShipUser"));
			}
		} else {
			$("#psendMessage").hide();
			$("#pfriendShip").text(ssn.translation.getValue("thisIsYou"));
		}

		done();
	}
};