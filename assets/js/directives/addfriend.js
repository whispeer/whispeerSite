var templateUrl = require("../../views/directives/addFriend.html");
var step = require("step");
var h= require("whispeerHelper");
var State = require("asset/state");
var Bluebird = require("bluebird");
var directivesModule = require("directives/directivesModule");

function addFriendDirective($timeout, errorService, circleService) {
	"use strict";

	return {
		transclude: false,
		scope:	{
			user: "="
		},
		restrict: "E",
		templateUrl: templateUrl,
		replace: false,
		link: function postLink(scope) {
			var circleState = new State();

			scope.circles = {
				initial: function () {
					var user = h.parseDecimal(scope.user.id);
					var loadAllCircles = Bluebird.promisify(circleService.loadAll);

					return loadAllCircles().then(function () {
						return circleService.inWhichCircles(user).map(function (circle) {
							return circle.data;
						});
					});
				},
				callback: function (selected) {
					scope.circles.selectedElements = selected;
				},
				selectedElements: [],
				saving: circleState.data
			};

			scope.saveCircles = function () {
				step(function () {
					circleState.pending();
					$timeout(this, 200);
				}, h.sF(function () {
					var oldCircles = circleService.inWhichCircles(scope.user.id).map(function (e) {
						return h.parseDecimal(e.getID());
					});
					var newCircles = scope.circles.selectedElements.map(h.parseDecimal);

					var toAdd = h.arraySubtract(newCircles, oldCircles);
					var toRemove = h.arraySubtract(oldCircles, newCircles);

					var i;
					for (i = 0; i < toAdd.length; i += 1) {
						circleService.get(toAdd[i]).addPersons([scope.user.id], this.parallel());
					}

					for (i = 0; i < toRemove.length; i += 1) {
						circleService.get(toRemove[i]).removePersons([scope.user.id], this.parallel());
					}
					this.parallel()();
				}), errorService.failOnError(circleState));
			};

			scope.addFriend = function () {
				scope.user.user.addAsFriend();
			};
		}
	};
}

addFriendDirective.$inject = ["$timeout", "ssn.errorService", "ssn.circleService"];

directivesModule.directive("addfriend", addFriendDirective);
