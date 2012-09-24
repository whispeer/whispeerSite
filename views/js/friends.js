"use strict";

ssn.display.friends = {
	load: function () {
		ssn.userManager.friendsUser(function (u) {
			var user, i;
			var element = $("#friendsList");
			for (i = 0; i < u.length; i += 1) {
				user = u[i];
				var userElement = $("<li>").append($("<a>").attr("href", "#view=profile&userid=" + user.getUserID()).text(user.getName()));
				element.append(userElement);
			}
		});
	},

	hashChange: function () {
	},

	unload: function () {
	}
};