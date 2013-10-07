/**
* userController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function userController($scope, $routeParams, cssService, userService) {
		var identifier = $routeParams.identifier;
		$scope.loading = true;

		cssService.setClass("profileView");

		$scope.days = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"];
		$scope.months = ["january", "feburary", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
		$scope.years = ["1999", "1998", "1997", "1996", "1995", "1994", "1993", "1992", "1991", "1990", "1989", "1988", "1987", "1986", "1985", "1984", "1983", "1982", "1981", "1980", "1979", "1978", "1977", "1976", "1975", "1974", "1973", "1972", "1971", "1970", "1969", "1968", "1967", "1966", "1965", "1964", "1963", "1962", "1961", "1960", "1959", "1958", "1957", "1956", "1955", "1954", "1953", "1952", "1951", "1950", "1949", "1948", "1947", "1946", "1945", "1944", "1943", "1942", "1941", "1940", "1939", "1938", "1937", "1936", "1935", "1934", "1933", "1932", "1931", "1930", "1929", "1928", "1927", "1926", "1925", "1924", "1923", "1922", "1921", "1920", "1919", "1918", "1917", "1916", "1915", "1914", "1913", "1912", "1911", "1910", "1909", "1908", "1907", "1906", "1905", "1904", "1903", "1902", "1901", "1900"];

		var currentYear = new Date().getFullYear(), i;
		for (i = 2000; i <= currentYear; i += 1) {
			$scope.years.unshift(i.toString());
		}

		$scope.user	= {
			"name":	"Not loaded",
			"added": false,
			"data": {
				"image": "/img/profil.jpg",
				"me": true,
				"birthday":	{
					"day":	"",
					"month": "",
					"year":	""
				},
				"location": {
					"town":	"",
					"state": "",
					"country": ""
				},
				"partner":	{
					"type":	"",
					"name": ""
				},
				"education": [],
				"job": {
					"what": "",
					"where": ""
				},
				"gender": "",
				"languages": []
			}
		};

		$scope.edit = function () {
			$scope.editGeneral = !$scope.editGeneral;
		};

		$scope.set = function (val) {
			if (typeof val === "undefined" || val === null) {
				return false;
			}

			if (typeof val === "object" && val instanceof Array && val.length !== 0) {
				return true;
			}

			if (typeof val === "string") {
				return val !== "";
			}

			if (typeof val === "object") {
				var attr;
				for (attr in val) {
					if (val.hasOwnProperty(attr)) {
						if (typeof val[attr] !== "undefined" && val[attr] !== "") {
							return true;
						}
					}
				}

				return false;
			}
		};

		$scope.setE = function (val, ret) {
			if ($scope.editGeneral || $scope.set(val)) {
				return ret;
			}

			return "";
		};

		$scope.setEDeep = function (val) {
			var keys = Object.keys(val), i, res = "";
			keys.sort();
			for (i = 0; i < keys.length; i += 1) {
				res = res + $scope.setE(val[keys[i]], keys[i]);
			}

			return res;
		};

		$scope.removeElement = function(array, index) {
			array.splice(index, 1);
		};

		$scope.addElement = function(array, element, maxLength) {
			if (!maxLength || array.length <= maxLength) {
				array.push(element);
			}
		};

		$scope.possibleStatus = ["single", "relationship", "engaged", "married", "divorced", "widowed", "complicated", "open", "inlove"];

		$scope.editGeneral = false;

		step(function () {
			userService.get(identifier, this);
		}, h.sF(function (user) {
			this.parallel.unflatten();
			user.getName(this.parallel());
			user.getImage(this.parallel());
		}), h.sF(function (name, image) {
			$scope.user.name = name;
			$scope.user.image = image;
			$scope.loading = false;
		}));

		$scope.posts = [
			{
				"sender":	{
					"image":	{
						"image":	"/img/profil.jpg",
						"alttext":	"Test"
					},
					"name":	"Daniel Melchior"
				},
				"content":	{
					"text": "Lorem Ipsum Dolor Sit Amet!",
				},
				"info":	{
					"with"	: "Svenja Kenneweg",
					"awesome"	: "20",
					"comments":	{
						"count":	"20"
					}
				}
			},
			{
				"sender":	{
					"image":	{
						"image":	"/img/profil.jpg",
						"alttext":	"Test"
					},
					"name":	"Daniel Melchior"
				},
				"content":	{
					"text": "Lorem Ipsum Dolor Sit Amet!",
				},
				"info":	{
					"with"	: "Svenja Kenneweg",
					"awesome"	: "20",
					"comments":	{
						"count":	"20"
					}
				}
			},
			{
				"sender":	{
					"image":	{
						"image":	"/img/profil.jpg",
						"alttext":	"Test"
					},
					"name":	"Daniel Melchior"
				},
				"content":	{
					"text": "Lorem Ipsum Dolor Sit Amet!",
				},
				"info":	{
					"with"	: "Svenja Kenneweg",
					"awesome"	: "20",
					"comments":	{
						"count":	"20"
					}
				}
			}
		];
		$scope.friends = [
			{
				"name": "Willi Welle",
				"mutualFriends":	"295",
				"image":	"/img/profil.jpg"
				//"lists":	[''] // ID's of the Lists with this friend
			},
			{
				"name": "William Welle",
				"mutualFriends":	"495",
				"image":	"/img/profil.jpg"
				//"lists":	[''] // ID's of the Lists with this friend
			}
		];
	}

	userController.$inject = ["$scope", "$routeParams", "ssn.cssService", "ssn.userService"];

	return userController;
});