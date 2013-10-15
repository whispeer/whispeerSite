define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function searchDirective(userService, $location) {
		return {
			transclude: false,
			scope:	{
				selectedUsers: "="
			},
			restrict: "E",
			templateUrl: "/assets/views/directives/search.html",
			replace: true,
			link: function postLink(scope, iElement, iAttrs) {
				scope.size = iAttrs["size"];
				scope.bigSize = (iAttrs["size"] === "big");
				scope.placeholder = iAttrs["placeholder"];

				scope.multiple = typeof iAttrs["multiple"] !== "undefined";

				scope.focused = false;
				scope.clicked = false;
				scope.query = "";
				scope.searching = false;
				scope.empty = false;
				scope.current = 0;
				scope.selected = [];

				var input = iElement.find("input");

				var timer = null;

				scope.markedSelection = -1;

				scope.selectedUsers = [];

				scope.queryChange = function () {
					scope.current = 0;
					scope.focused = true;
					if (scope.query.length >= 3) {
						scope.searching = true;
						window.clearTimeout(timer);
						timer = window.setTimeout(function () {
							var theUsers;
							step(function () {
								userService.query(scope.query, this);
							}, h.sF(function (user) {
								scope.empty = (user.length === 0);

								theUsers = user;
								var i;
								for (i = 0; i < user.length; i += 1) {
									user[i].loadBasicData(this.parallel());
								}

								var width = iElement.width();
								iElement.find(".searchDrop").width(width);
							}), h.sF(function () {
								scope.users = [];
								var i;
								for (i = 0; i < theUsers.length; i += 1) {
									scope.users.push(theUsers[i].data);
								}
								scope.searching = false;
							}));
						}, 250);
					} else {
						scope.users = [];
					}
				};

				scope.currentClass = function (i) {
					if (i === scope.current) {
						return "active";
					}

					return "";
				};

				function addCurrent(val) {
					scope.setCurrent(scope.current + val);
				}

				scope.setCurrent = function (val) {
					scope.current = val;

					if (scope.current < 0) {
						scope.current = 0;
					}

					if (scope.current > scope.users.length - 1) {
						scope.current = scope.users.length - 1;
					}
				};

				scope.selectUser = function(index) {
					var user = scope.users[index];
					if (scope.multiple) {
						var id = parseInt(user.basic.id, 10);
						if (scope.selectedUsers.indexOf(id) === -1) {
							scope.selected.push({
								id: id,
								name: user.basic.name
							});

							scope.query = "";
							scope.users = [];
							scope.selectedUsers.push(id);
						}
					} else {
						$location.path(user.basic.url);

						scope.click(false);
						scope.focus(false);
					}
				};

				var UP = [38, 33];
				var DOWN = [40, 34];
				var ENTER = [13];
				var BACKSPACE = 8;

				// left: 37, up: 38, right: 39, down: 40,
				// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
				var keys = UP.concat(DOWN);

				scope.removeSelection = function (index) {
					scope.selectedUsers.splice(index, 1);
					scope.selected.splice(index, 1);
					scope.markedSelection = -1;
				};

				scope.keydown = function (e) {
					if (UP.indexOf(e.keyCode) > -1) {
						addCurrent(-1);
					}

					if (DOWN.indexOf(e.keyCode) > -1) {
						addCurrent(1);
					}

					if (e.keyCode == BACKSPACE && scope.query.length === 0) {
						if (scope.markedSelection !== -1) {
							scope.removeSelection(scope.markedSelection);
						} else {
							scope.markedSelection = scope.selectedUsers.length - 1;
						}
					}

					if (e.keyCode == ENTER) {
						scope.selectUser(scope.current);
					}

					if (keys.indexOf(e.keyCode) > -1) {
						e.preventDefault();
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
					if (bool) {
						input.focus();
					}
					scope.clicked = bool;
				};

				scope.focus = function (bool) {
					scope.focused = bool;
				};

				scope.users = [];
				
				scope.userData2 = [
	{"name": "Megan Buckner", "mutuals": 110, "location": "Vreren", "age": 32, "image": "/assets/img/profil.jpg"},
	{"name": "Marsden Marsh", "mutuals": 103, "location": "Blind River", "age": 13, "image": "/assets/img/profil.jpg"},
	{"name": "Marsden Holden", "mutuals": 102, "location": "Widooie", "age": 36, "image": "/assets/img/profil.jpg"},
	{"name": "Seth Lawson", "mutuals": 45, "location": "Coquitlam", "age": 27, "image": "/assets/img/profil.jpg"},
	{"name": "Candice Griffith", "mutuals": 54, "location": "Ancaster Town", "age": 40, "image": "/assets/img/profil.jpg"},
	{"name": "Katelyn Hodge", "mutuals": 90, "location": "Habay-la-Neuve", "age": 15, "image": "/assets/img/profil.jpg"},
	{"name": "Roary Pennington", "mutuals": 55, "location": "Lamontz?e", "age": 37, "image": "/assets/img/profil.jpg"},
	{"name": "Amanda Gardner", "mutuals": 103, "location": "Vlissegem", "age": 43, "image": "/assets/img/profil.jpg"},
	{"name": "Steel Kim", "mutuals": 97, "location": "Darwin", "age": 37, "image": "/assets/img/profil.jpg"},
	{"name": "Hammett Larsen", "mutuals": 84, "location": "Pretoro", "age": 39, "image": "/assets/img/profil.jpg"},
	{"name": "Myra Swanson", "mutuals": 36, "location": "Crewe", "age": 16, "image": "/assets/img/profil.jpg"},
	{"name": "Ori Mitchell", "mutuals": 10, "location": "Welshpool", "age": 28, "image": "/assets/img/profil.jpg"},
	{"name": "Hedley Dotson", "mutuals": 51, "location": "Vastogirardi", "age": 42, "image": "/assets/img/profil.jpg"},
	{"name": "Maya Stanley", "mutuals": 33, "location": "Beverley", "age": 30, "image": "/assets/img/profil.jpg"},
	{"name": "Levi Glass", "mutuals": 28, "location": "Castlegar", "age": 26, "image": "/assets/img/profil.jpg"},
	{"name": "Graham Pruitt", "mutuals": 69, "location": "Anjou", "age": 13, "image": "/assets/img/profil.jpg"},
	{"name": "James Pearson", "mutuals": 46, "location": "Villa Cortese", "age": 39, "image": "/assets/img/profil.jpg"},
	{"name": "Addison Jensen", "mutuals": 58, "location": "Crecchio", "age": 16, "image": "/assets/img/profil.jpg"},
	{"name": "Burton Jones", "mutuals": 21, "location": "Havr?", "age": 32, "image": "/assets/img/profil.jpg"},
	{"name": "Beatrice Cooke", "mutuals": 23, "location": "Bromyard", "age": 25, "image": "/assets/img/profil.jpg"},
	{"name": "Tashya Warren", "mutuals": 3, "location": "Vaux-lez-Rosieres", "age": 17, "image": "/assets/img/profil.jpg"},
	{"name": "Althea Jordan", "mutuals": 7, "location": "Perpignan", "age": 33, "image": "/assets/img/profil.jpg"},
	{"name": "Kato Barr", "mutuals": 28, "location": "Mataró", "age": 44, "image": "/assets/img/profil.jpg"},
	{"name": "Amber Sykes", "mutuals": 33, "location": "Roccalumera", "age": 30, "image": "/assets/img/profil.jpg"},
	{"name": "Cedric Montoya", "mutuals": 58, "location": "Wommelgem", "age": 25, "image": "/assets/img/profil.jpg"},
	{"name": "Quamar Holder", "mutuals": 48, "location": "Soria", "age": 46, "image": "/assets/img/profil.jpg"},
	{"name": "Amos Shaw", "mutuals": 92, "location": "Nemoli", "age": 15, "image": "/assets/img/profil.jpg"},
	{"name": "Alvin Brock", "mutuals": 56, "location": "Hamilton", "age": 16, "image": "/assets/img/profil.jpg"},
	{"name": "Wade Melendez", "mutuals": 92, "location": "Boulogne-sur-Mer", "age": 18, "image": "/assets/img/profil.jpg"},
	{"name": "Kamal Cox", "mutuals": 49, "location": "Shrewsbury", "age": 40, "image": "/assets/img/profil.jpg"},
	{"name": "Grant Waters", "mutuals": 43, "location": "Anderlues", "age": 42, "image": "/assets/img/profil.jpg"},
	{"name": "Karina Mcclure", "mutuals": 91, "location": "Épernay", "age": 45, "image": "/assets/img/profil.jpg"},
	{"name": "Julie Walton", "mutuals": 46, "location": "Kitscoty", "age": 21, "image": "/assets/img/profil.jpg"},
	{"name": "Farrah English", "mutuals": 15, "location": "Daknam", "age": 40, "image": "/assets/img/profil.jpg"},
	{"name": "Renee Owen", "mutuals": 123, "location": "Nasino", "age": 31, "image": "/assets/img/profil.jpg"},
	{"name": "Jeanette Ball", "mutuals": 9, "location": "Brusson", "age": 43, "image": "/assets/img/profil.jpg"},
	{"name": "Quincy Dalton", "mutuals": 95, "location": "Carlton", "age": 16, "image": "/assets/img/profil.jpg"},
	{"name": "Alma Mercer", "mutuals": 79, "location": "Vandoeuvre-lès-Nancy", "age": 40, "image": "/assets/img/profil.jpg"},
	{"name": "Cairo Dunlap", "mutuals": 58, "location": "Aulnay-sous-Bois", "age": 31, "image": "/assets/img/profil.jpg"},
	{"name": "Jameson Sargent", "mutuals": 96, "location": "Blieskastel", "age": 33, "image": "/assets/img/profil.jpg"},
	{"name": "Brendan Guthrie", "mutuals": 34, "location": "Caldarola", "age": 16, "image": "/assets/img/profil.jpg"},
	{"name": "Brennan Martin", "mutuals": 117, "location": "Midway", "age": 19, "image": "/assets/img/profil.jpg"},
	{"name": "Ora Webster", "mutuals": 81, "location": "Markham", "age": 30, "image": "/assets/img/profil.jpg"},
	{"name": "Montana Lang", "mutuals": 86, "location": "Tongrinne", "age": 23, "image": "/assets/img/profil.jpg"},
	{"name": "Chastity Hubbard", "mutuals": 67, "location": "Pescopagano", "age": 36, "image": "/assets/img/profil.jpg"},
	{"name": "Aladdin Britt", "mutuals": 98, "location": "Bromley", "age": 41, "image": "/assets/img/profil.jpg"},
	{"name": "Gary Thompson", "mutuals": 7, "location": "Nicoya", "age": 34, "image": "/assets/img/profil.jpg"},
	{"name": "Virginia Pitts", "mutuals": 71, "location": "Mosciano Sant'Angelo", "age": 44, "image": "/assets/img/profil.jpg"},
	{"name": "Yoshi Mcgowan", "mutuals": 110, "location": "Beaconsfield", "age": 35, "image": "/assets/img/profil.jpg"},
	{"name": "Vanna Fox", "mutuals": 75, "location": "Breda", "age": 34, "image": "/assets/img/profil.jpg"},
	{"name": "Stacey Ross", "mutuals": 8, "location": "Wrigley", "age": 27, "image": "/assets/img/profil.jpg"},
	{"name": "Aimee Hicks", "mutuals": 69, "location": "Bierges", "age": 41, "image": "/assets/img/profil.jpg"},
	{"name": "Connor Callahan", "mutuals": 13, "location": "Dover", "age": 22, "image": "/assets/img/profil.jpg"},
	{"name": "Barry Craft", "mutuals": 60, "location": "Saint-Hilarion", "age": 36, "image": "/assets/img/profil.jpg"},
	{"name": "Haviva Mills", "mutuals": 85, "location": "Ferri?res", "age": 22, "image": "/assets/img/profil.jpg"},
	{"name": "Paul Coleman", "mutuals": 71, "location": "Casanova Elvo", "age": 25, "image": "/assets/img/profil.jpg"},
	{"name": "Carter Crane", "mutuals": 75, "location": "Eindhoven", "age": 21, "image": "/assets/img/profil.jpg"},
	{"name": "Alfreda Donaldson", "mutuals": 4, "location": "Saint Andr?", "age": 33, "image": "/assets/img/profil.jpg"},
	{"name": "Dai Roman", "mutuals": 22, "location": "Kitchener", "age": 24, "image": "/assets/img/profil.jpg"},
	{"name": "Troy Hewitt", "mutuals": 34, "location": "Charlottetown", "age": 26, "image": "/assets/img/profil.jpg"},
	{"name": "Gannon Rios", "mutuals": 88, "location": "Prince George", "age": 13, "image": "/assets/img/profil.jpg"},
	{"name": "Wanda Ray", "mutuals": 28, "location": "Ketchikan", "age": 31, "image": "/assets/img/profil.jpg"},
	{"name": "Adrian Noble", "mutuals": 39, "location": "Santa Vittoria in Matenano", "age": 34, "image": "/assets/img/profil.jpg"},
	{"name": "Tucker Monroe", "mutuals": 19, "location": "C?roux-Mousty", "age": 47, "image": "/assets/img/profil.jpg"},
	{"name": "Channing Clayton", "mutuals": 126, "location": "Tarbes", "age": 25, "image": "/assets/img/profil.jpg"},
	{"name": "Andrew England", "mutuals": 117, "location": "St. Austell", "age": 24, "image": "/assets/img/profil.jpg"},
	{"name": "Zenaida Murphy", "mutuals": 54, "location": "Southend", "age": 37, "image": "/assets/img/profil.jpg"},
	{"name": "Jaime Moody", "mutuals": 53, "location": "Brisbane", "age": 37, "image": "/assets/img/profil.jpg"},
	{"name": "Kane Oneil", "mutuals": 103, "location": "Farciennes", "age": 42, "image": "/assets/img/profil.jpg"},
	{"name": "Noel Pope", "mutuals": 117, "location": "Castle Douglas", "age": 43, "image": "/assets/img/profil.jpg"},
	{"name": "Britanni Barnett", "mutuals": 108, "location": "Santa Rita", "age": 17, "image": "/assets/img/profil.jpg"},
	{"name": "Graham Clark", "mutuals": 84, "location": "Arles", "age": 23, "image": "/assets/img/profil.jpg"},
	{"name": "Fay Farley", "mutuals": 19, "location": "Pedace", "age": 39, "image": "/assets/img/profil.jpg"},
	{"name": "Rogan Cooke", "mutuals": 76, "location": "Gavorrano", "age": 21, "image": "/assets/img/profil.jpg"},
	{"name": "Pamela Pruitt", "mutuals": 71, "location": "M?nchengladbach", "age": 32, "image": "/assets/img/profil.jpg"},
	{"name": "Shelley Elliott", "mutuals": 37, "location": "Grand Island", "age": 40, "image": "/assets/img/profil.jpg"},
	{"name": "Xena Travis", "mutuals": 21, "location": "Nelson", "age": 42, "image": "/assets/img/profil.jpg"},
	{"name": "Kirk Collier", "mutuals": 26, "location": "Saint-Pierre", "age": 20, "image": "/assets/img/profil.jpg"},
	{"name": "Nayda Levy", "mutuals": 95, "location": "Bal?tre", "age": 43, "image": "/assets/img/profil.jpg"},
	{"name": "Nyssa Mullins", "mutuals": 60, "location": "Fossato di Vico", "age": 24, "image": "/assets/img/profil.jpg"},
	{"name": "Geraldine Benjamin", "mutuals": 80, "location": "Amstelveen", "age": 45, "image": "/assets/img/profil.jpg"},
	{"name": "Charlotte Richard", "mutuals": 111, "location": "Bensheim", "age": 30, "image": "/assets/img/profil.jpg"},
	{"name": "Zoe Howell", "mutuals": 57, "location": "Saint-Martin", "age": 18, "image": "/assets/img/profil.jpg"},
	{"name": "Jermaine Pearson", "mutuals": 59, "location": "Ururi", "age": 37, "image": "/assets/img/profil.jpg"},
	{"name": "Virginia Hale", "mutuals": 59, "location": "Nil-Saint-Vincent-Saint-Martin", "age": 37, "image": "/assets/img/profil.jpg"},
	{"name": "Paloma Henson", "mutuals": 111, "location": "Cawdor", "age": 20, "image": "/assets/img/profil.jpg"},
	{"name": "Porter Martin", "mutuals": 100, "location": "Namur", "age": 26, "image": "/assets/img/profil.jpg"},
	{"name": "Hilda Maxwell", "mutuals": 31, "location": "Pangnirtung", "age": 23, "image": "/assets/img/profil.jpg"},
	{"name": "Raya Farley", "mutuals": 64, "location": "Marystown", "age": 21, "image": "/assets/img/profil.jpg"},
	{"name": "Rama Pearson", "mutuals": 19, "location": "Sousa", "age": 21, "image": "/assets/img/profil.jpg"},
	{"name": "Austin Cole", "mutuals": 98, "location": "Sambuca Pistoiese", "age": 32, "image": "/assets/img/profil.jpg"},
	{"name": "Zane Ferrell", "mutuals": 37, "location": "Angers", "age": 44, "image": "/assets/img/profil.jpg"},
	{"name": "Aladdin Mercer", "mutuals": 9, "location": "Drumheller", "age": 42, "image": "/assets/img/profil.jpg"},
	{"name": "Kermit Cruz", "mutuals": 73, "location": "Istres", "age": 41, "image": "/assets/img/profil.jpg"},
	{"name": "Maisie Maxwell", "mutuals": 98, "location": "Pollein", "age": 17, "image": "/assets/img/profil.jpg"},
	{"name": "Cleo Valdez", "mutuals": 66, "location": "Ansfelden", "age": 25, "image": "/assets/img/profil.jpg"},
	{"name": "Ulla Holmes", "mutuals": 44, "location": "Valverde", "age": 37, "image": "/assets/img/profil.jpg"},
	{"name": "Craig Norris", "mutuals": 34, "location": "Hohen Neuendorf", "age": 31, "image": "/assets/img/profil.jpg"},
	{"name": "Preston Lewis", "mutuals": 20, "location": "Aalbeke", "age": 42, "image": "/assets/img/profil.jpg"},
	{"name": "Carlos Grimes", "mutuals": 71, "location": "Bunbury", "age": 39, "image": "/assets/img/profil.jpg"}
];

			}
		};
	}

	return searchDirective;
});