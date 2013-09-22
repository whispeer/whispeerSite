define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function searchDirective(userService) {
		return {
			transclude: false,
			scope:	{},
			restrict: "E",
			templateUrl: "/views/directives/search.html",
			replace: true,
			link: function postLink(scope, iElement, iAttrs) {
				scope.size = iAttrs["size"];
				scope.bigSize = (iAttrs["size"] === "big");

				scope.focused = false;
				scope.clicked = false;
				scope.query = "";
				scope.searching = false;

				var timer = null;

				scope.queryChange = function () {
					if (scope.query.length > 3) {
						scope.searching = true;
						window.clearTimeout(timer);
						timer = window.setTimeout(function () {
							var theUsers;
							step(function () {
								userService.query(scope.query, this);
							}, h.sF(function (user) {
								theUsers = user;
								var i;
								for (i = 0; i < user.length; i += 1) {
									user[i].getName(this.parallel());
									user[i].getImage(this.parallel());
								}
							}), h.sF(function (data) {
								scope.users = [];
								var i;
								for (i = 0; i < theUsers.length; i += 1) {
									scope.users.push({
										"name": data[i*2],
										"mutuals": "0",
										"location": "?",
										"age": "?",
										"url": theUsers[i].getUrl(),
										"image": data[i*2+1],
										"id": theUsers[i].getID()
									});
								}
								scope.searching = false;
							}));
						}, 250);
					} else {
						scope.users = [];
					}
				};

				jQuery(document.body).click(function () {
					scope.$apply(function () {
						scope.click(false);
					});
				});

				scope.show = function () {
					return scope.focused || scope.clicked;
				};

				scope.click = function (bool) {
					console.log("Click:" + bool);
					scope.clicked = bool;
				};

				scope.focus = function (bool) {
					console.log("Focus:" + bool);
					scope.focused = bool;
				};

				scope.users = [
					{
						"name":	"Luisa Katharina Marschner",
						"mutuals":	"20",
						"location":	"Enger",
						"age":	"16",
						"image":	"/img/profil.jpg"
					},{
						"name":	"Daniel Melchior",
						"mutuals":	"450",
						"location":	"Enger",
						"age":	"16",
						"image":	"/img/profil.jpg"
					},{
						"name":	"Michelle Thenhausen",
						"mutuals":	"13",
						"location":	"Spenge",
						"age":	"19",
						"image":	"/img/profil.jpg"
					},
					{
						"name":	"Jacqueline Thenhausen",
						"mutuals":	"20",
						"location":	"Spenge",
						"age":	"23",
						"image":	"/img/profil.jpg"
					},
					{
						"name":	"Svenja Kenneweg",
						"mutuals":	"220",
						"location":	"Enger",
						"age":	"16",
						"image":	"/img/profil.jpg"
					},{
						"name":	"Anna Marie Marschner",
						"mutuals":	"20",
						"location":	"Enger",
						"age":	"24",
						"image":	"/img/profil.jpg"
					}
				];
			}
		};
	}

	return searchDirective;
});