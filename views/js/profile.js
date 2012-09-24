"use strict";

ssn.display.profile = {
	userid: null,
	user: null,
	/**
	* Profile load function
	* Hide big user picture
	*/
	load: function () {
		$("#user").hide();

		if (typeof ssn.display.getHash("userid") === "undefined") {
			ssn.display.setHash("userid", ssn.session.userid);
		}

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

		var theID = ssn.display.getHash("userid");

		this.loadUser(theID);
	},

	hashChange: function () {
		if (typeof ssn.display.getHash("userid") === "undefined") {
			ssn.display.setHash("userid", ssn.session.userid);
		}

		var theID = ssn.display.getHash("userid");

		this.loadUser(theID);
	},

	unload: function () {
		this.userid = null;
		this.user = null;

		$("#user").show();
		$("#banner").hide();
	},

	loadUser: function (theID) {
		if (theID !== this.userid) {
			this.userid = theID;
			ssn.userManager.getUser(theID, ssn.userManager.FULL, function (u) {
				ssn.display.profile.user = u;
				$("#pname").text(u.getName());

				$("#pnick").text(u.getNickname());

				$("#pid").text(u.getUserID());
				$("#pnick2").text(u.getNickname());
				$("#pfirstname").text(u.getValue("firstname"));
				$("#plastname").text(u.getValue("lastname"));
				$("#infowrap").css("background-image", "url(img/testbanner.jpg)");
				// TODO: just do the following two steps if the text really needs to be white!
				$("#infowrap").css("color", "#fff")
				$("#infowrap i").addClass("icon-white");

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
			});
		}
	}
};