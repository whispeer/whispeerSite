define(["jquery", "display", "asset/helper", "libs/step"], function ($, display, h, step) {
	"use strict";

	var profileFriends = {
		load: function (done) {
			var friendsList;
			step(function () {
				display.viewScript().user.friends(this);
			}, h.sF(function (d) {
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
					element.append(names);
				}

				this();
			}), done);
		},
		hashChange: function (done) {
			done();
		},
		unload: function () {
			done();
		}
	};

	return profileFriends;
});