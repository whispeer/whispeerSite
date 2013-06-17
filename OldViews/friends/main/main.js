define(["jquery", "model/userManager", "asset/helper", "libs/step", "model/session"], function ($, userManager, h, step, session) {
	"use strict";

	var friendsMain = {
		load: function (done) {
			var friendsList;
			step(function () {
				session.getOwnUser(this);
			}, h.sF(function (u) {
				u.friends(this);
			}), h.sF(function (d) {
				friendsList = d;

				var i;
				for (i = 0; i < friendsList.length; i += 1) {
					friendsList[i].getName(this.parallel());
				}
			}), h.sF(function (theNames) {
				var element = $("#friendsList");

				var i;
				for (i = 0; i < theNames.length; i += 1) {
					var names = $("<li>").append(
						$("<a>").attr("href", friendsList[i].getLink()).append(
							$("<img>").addClass("friendPicture").attr("src", "img/user.png")
						).append(
							$("<span>").addClass("friendName").text(theNames[i])
						)
					);
					//element.append(names);
				}

				this();
			}), done);
		},

		hashChange: function (done) {
			done();
		},

		unload: function (done) {
			done();
		}
	};

	return friendsMain;
});