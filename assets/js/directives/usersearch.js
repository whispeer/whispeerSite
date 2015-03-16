define(["step", "whispeerHelper", "bluebird"], function (step, h, Promise) {
	"use strict";

	function userSearchDirective(userService) {
		return {
			restrict: "A",
			require: "search",
			link: function (scope, element, iAttrs, search) {
				var action;

				if (iAttrs.scope === "friends") {
					action = Promise.promisify(userService.queryFriends, userService);
				} else {
					action = Promise.promisify(userService.query, userService);
				}

				search.search = function (query) {
					return action(query).then(function (users) {
						if (!iAttrs.filter) {
							return users;
						}

						var filter = scope.$parent.$eval(iAttrs.filter);
						return users.filter(function (user) {
							return filter.indexOf(user.getID()) === -1;
						});
					}).map(function (user) {
						var loadBasicData = Promise.promisify(user.loadBasicData, user);
						return loadBasicData().then(function () {
							return user;
						});
					}).then(function (users) {
						return users.map(function (e) {
							return e.data;
						});						
					});
				};
			}
		};
	}

	userSearchDirective.$inject = ["ssn.userService"];

	return userSearchDirective;
});