define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function searchDirective(userService, friendsService, $location, $timeout) {
		return {
			transclude: false,
			scope:	false,
			restrict: "E",
			templateUrl: "/assets/views/directives/userSearch.html",
			replace: true,
			link: function postLink(scope, iElement, iAttrs) {
				var multiple = typeof iAttrs["multiple"] !== "undefined";

				if (iAttrs["user"]) {
					var theUser;
					var user = h.parseDecimal(scope.$parent.$eval(iAttrs["user"]));
					if (user > 0) {
						step(function () {
							$timeout(this);
						}, h.sF(function () {
							userService.get(user, this);
						}), h.sF(function (user ) {
							theUser = user;
							theUser.loadBasicData(this);
						}), h.sF(function () {
							scope.$broadcast("initialSelection", [theUser.data]);
						}));
					}
				}

				var timer = null;

				function submitResults(results) {
					scope.$broadcast("queryResults", results);
				}

				function queryResults(query) {
					var theUsers;
					step(function () {
						if (iAttrs["scope"] === "friends") {
							userService.queryFriends(query, this);
						} else {
							userService.query(query, this);
						}
					}, h.sF(function (user) {
						if (user.length === 0) {
							this.ne([]);
						}

						theUsers = user;
						var i;
						for (i = 0; i < user.length; i += 1) {
							user[i].loadBasicData(this.parallel());
						}
					}), h.sF(function () {
						var users = theUsers.map(function (e) {
							return e.data;
						});

						submitResults(users);
					}));
				}

				scope.saveCircles = function () {

				};

				scope.$on("addFriend", function (event, user) {
					friendsService.friendship(user.id);
				});

				scope.$on("sendMessage", function (event, data) {
					$location.path("/messages").search("userid=" + data.id);
					scope.$broadcast("hide");
				});

				scope.$on("elementSelected", function (event, element) {
					if (!multiple) {
						scope.$parent.searchActive = false;
						$location.path(element.user.getUrl());
					}

					event.stopPropagation();
				});

				scope.$on("queryChange", function (event, query) {
					if (query.length >= 3) {
						window.clearTimeout(timer);
						timer = window.setTimeout(function () {
							queryResults(query);
						}, 250);
					} else {
						submitResults([]);
					}

					event.stopPropagation();
				});
			}
		};
	}

	return searchDirective;
});