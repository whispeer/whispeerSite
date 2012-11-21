"use strict";

ssn.display.profile.friends = {
	load: function (done) {
		ssn.display.profile.user.friends(function (d) {
			var element = $("#friendsList");
			var names;
			var i;
			for (i = 0; i < d.length; i += 1) {
				names.append($("<div>").append($("<a>").attr("href", d[i].getLink()).text(d[i].getName())));
			}

			element.append(names);
			$("body").addClass("friendsView");
			done();
		});
	},
	hashChange: function (done) {
		done();
	},
	unload: function () {
		$("body").removeClass("friendsView");
	}
};

var userElement = $("<li>").append(
					$("<a>").attr("href", "#view=profile&userid=" + user.getUserID()).append(
						$("<img>").addClass("friendPicture").attr("src", "img/user.png")
					).append(
						$("<span>").addClass("friendName").text(user.getName())
					)
				);