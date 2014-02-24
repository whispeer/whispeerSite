define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function searchDirective(userService, friendsService, $location, $timeout) {
		return {
			transclude: false,
			scope:	{},
			restrict: "E",
			templateUrl: "/assets/views/directives/userSearch.html",
			replace: true,
			link: function postLink(scope, iElement, iAttrs) {
				scope.multiple = typeof iAttrs["multiple"] !== "undefined";

				if (iAttrs["size"] === "big") {
					scope.resultTemplate = "/assets/views/directives/userSearchResults.html";
				} else {
					scope.resultTemplate = "/assets/views/directives/userSearchResultsSmall.html";
				}

				scope.addFriend = function (user) {
					friendsService.friendship(user.id);
				};

				scope.sendMessage = function (data) {
					$location.path("/messages").search("userid=" + data.id);
					scope.hide();
				};

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
						scope.empty = (user.length === 0);

						theUsers = user;
						var i;
						for (i = 0; i < user.length; i += 1) {
							user[i].loadBasicData(this.parallel());
						}
					}), h.sF(function () {
						var users = [], i, user;
						for (i = 0; i < theUsers.length; i += 1) {
							user = theUsers[i];
							user.data.added = friendsService.didIRequest(user.getID());

							friendsService.listen(function () {
								user.data.added = friendsService.didIRequest(user.getID());
							});

							users.push(user.data);
						}

						submitResults(users);
					}));
				}

				scope.$on("elementSelected", function (event, element) {
					if (!scope.multiple) {
						$location.path(element.user.getUrl());
					}
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
				});
			}
		};
	}

	return searchDirective;
});