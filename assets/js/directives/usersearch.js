define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function searchDirective(circleService, userService, friendsService, $location, $timeout) {
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

						theUsers = user || [];
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

				scope.circles = {
					saving: false,
					success: true,
					failure: false
				};

				function setCircleState(state) {
					h.setGeneralState(state, scope.circles);
				}

				function saveCircles(user, selectedElements) {
					step(function () {
						setCircleState("saving");
						$timeout(this, 200);
					}, h.sF(function () {
						var oldCircles = circleService.inWhichCircles(user.id).map(function (e) {
							return h.parseDecimal(e.getID());
						});
						var newCircles = selectedElements.map(h.parseDecimal);

						var toAdd = h.arraySubtract(newCircles, oldCircles);
						var toRemove = h.arraySubtract(oldCircles, newCircles);

						var i;
						for (i = 0; i < toAdd.length; i += 1) {
							circleService.get(toAdd[i]).addPersons([user.id], this.parallel());
						}

						for (i = 0; i < toRemove.length; i += 1) {
							circleService.get(toRemove[i]).removePersons([user.id], this.parallel());
						}
					}), h.sF(function (results) {
						setCircleState("success");
					}), function (e) {
						setCircleState("failure");
					});
				};

				scope.$on("addFriend", function (event, user) {
					friendsService.friendship(user.id);
				});

				scope.$on("saveCircles", function (event, data) {
					saveCircles(data.user, data.circles.selectedElements);
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