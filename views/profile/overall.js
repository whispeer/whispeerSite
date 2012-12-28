define(["jquery", "display", "asset/helper", "libs/step"], function ($, display, h, step) {
	"use strict";

	var displayProfile = {
		userid: null,
		user: null,
		/**
		* Profile load function
		* Hide big user picture
		*/
		load: function (done) {
			step(function () {
				require.wrap(["model/session"], this);
			}, h.sF(function (session) {
				if (typeof display.getHash("userid") === "undefined") {
					display.setHash("userid", session.userid());
				}

				var theID = display.getHash("userid");

				displayProfile.loadUser(theID, this);
			}), done);

		},

		hashChange: function (done) {
			step(function () {
				require.wrap("model/session", this);
			}, h.sF(function (session) {
				if (typeof display.getHash("userid") === "undefined") {
					display.setHash("userid", session.userid());
				}

				var theID = display.getHash("userid");

				displayProfile.loadUser(theID, this);
			}), done);
		},

		unload: function () {
			displayProfile.userid = null;
			displayProfile.user = null;

			done();
		},

		loadUser: function (theID, done) {
			if (theID !== displayProfile.userid) {
				displayProfile.userid = theID;
				var u;
				step(function loadUManager() {
					require.wrap("model/userManager", this);
				}, h.sF(function (userManager) {
					userManager.getUser(theID, userManager.FULL, this);
				}), h.sF(function (theU) {
					u = theU;
					displayProfile.user = u;

					displayProfile.user.getName(this);
				}), h.sF(function (name) {

					$("#subMenuName").text(name).attr("href", u.getLink());

					$("#subMenuFriendShip").show();
					if (!u.ownUser()) {
						if (u.isFriend()) {
							$("#subMenuFriendShip").hide();
						} else if (u.didIRequestFriendShip()) {
							$("#subMenuFriendShip").text(translation.getValue("friendShipRequested"));
						} else if (u.hasFriendShipRequested()) {
							$("#subMenuFriendShip").text(translation.getValue("acceptFriendShipRequest"));
						} else {
							$("#subMenuFriendShip").text(translation.getValue("friendShipUser"));
						}
					} else {
						$("#subMenuFriendShip").hide();
					}

					this();
				}), done);
			} else {
				done();
			}
		}
	};

	return displayProfile;
});