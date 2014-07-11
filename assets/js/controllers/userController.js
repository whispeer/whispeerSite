/**
* userController
**/

define(["step", "whispeerHelper", "asset/resizableImage"], function (step, h, ResizableImage) {
	"use strict";

	function userController($scope, $routeParams, $timeout, cssService, errorService, userService, postService, circleService, blobService) {
		var identifier = $routeParams.identifier;
		var userObject;

		var resizableImage = new ResizableImage();

		$scope.loading = true;
		$scope.notExisting = false;
		$scope.loadingFriends = true;

		$scope.changeImage = false;
		// for demo purposes
		$scope.trustlevel = 3;

		cssService.setClass("profileView");

		$scope.days = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"];
		$scope.months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
		$scope.years = ["1999", "1998", "1997", "1996", "1995", "1994", "1993", "1992", "1991", "1990", "1989", "1988", "1987", "1986", "1985", "1984", "1983", "1982", "1981", "1980", "1979", "1978", "1977", "1976", "1975", "1974", "1973", "1972", "1971", "1970", "1969", "1968", "1967", "1966", "1965", "1964", "1963", "1962", "1961", "1960", "1959", "1958", "1957", "1956", "1955", "1954", "1953", "1952", "1951", "1950", "1949", "1948", "1947", "1946", "1945", "1944", "1943", "1942", "1941", "1940", "1939", "1938", "1937", "1936", "1935", "1934", "1933", "1932", "1931", "1930", "1929", "1928", "1927", "1926", "1925", "1924", "1923", "1922", "1921", "1920", "1919", "1918", "1917", "1916", "1915", "1914", "1913", "1912", "1911", "1910", "1909", "1908", "1907", "1906", "1905", "1904", "1903", "1902", "1901", "1900"];

		var currentYear = new Date().getFullYear(), i;
		for (i = 2000; i <= currentYear; i += 1) {
			$scope.years.unshift(i.toString());
		}

		$scope.addFriend = function () {
			userObject.addAsFriend();
		};

		$scope.edit = function () {
			$scope.editGeneral = true;

			resizableImage.removeResizable();
			$scope.changeImage = false;
		};

		var ENDSIZE = 250;
		var CANVASWIDTH = 600, CANVASHEIGHT = 300;

		$scope.imageChange = resizableImage.callBackForFileLoad(function () {
			resizableImage.paintImageOnCanvasWithResizer({
				element: document.getElementById("original"),
				width: CANVASWIDTH,
				height: CANVASHEIGHT
			});
		});

		$scope.doChangeImage = function () {
			resizableImage.removeResizable();
			$scope.changeImage = !$scope.changeImage;

			resizableImage.loadImage($scope.user.basic.image, function () {
				resizableImage.paintImageOnCanvasWithResizer({
					element: document.getElementById("original"),
					width: CANVASWIDTH,
					height: CANVASHEIGHT
				});
			});
		};

		function setImage(cb) {
			step(function () {
				resizableImage.getImageBlob(ENDSIZE, this.ne);
			}, h.sF(function (imageBlob) {
				imageBlob = blobService.createBlob(imageBlob);

				this.parallel.unflatten();

				imageBlob.upload(this.parallel());
				imageBlob.getHash(this.parallel());
			}), h.sF(function (blobid, hash) {
				userObject.setProfileAttribute("imageBlob", {
					blobid: blobid,
					imageHash: hash
				}, this.parallel());

				userObject.setProfileAttribute("image", "", this.parallel());
			}), cb);
		}

		$scope.saveUser = function () {
			if (userObject.isOwn()) {
				//TODO: something goes wrong here when doing it the 2nd time!

				step(function () {
					if ($scope.changeImage) {
						setImage(this);
					} else {
						this.ne();
					}
				}, h.sF(function () {
					var adv = $scope.user.advanced;
					userObject.setAdvancedProfile(adv, this);
				}), h.sF(function () {
					userObject.uploadChangedProfile(this);
				}), h.sF(function () {
					$scope.edit();
				}), errorService.criticalError);
			}
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

		function editOrTrue(val) {
			return $scope.editGeneral || $scope.set(val);
		}

		$scope.setE = function (val, ret) {
			if (editOrTrue($scope.set(val))) {
				return ret;
			}

			return "";
		};

		function getVals(possible, val) {
			var i, res = "";
			val = val || {};
			possible.sort();

			for (i = 0; i < possible.length; i += 1) {
				if (editOrTrue(val[possible[i]])) {
					res += possible[i];
				}
			}

			return res;
		}

		$scope.getLocationVals = function (val) {
			return getVals(["town", "state", "country"], val);
		};

		$scope.getRelationVals = function (val) {
			return getVals(["name", "type"], val);
		};

		$scope.getWorkVals = function (val) {
			return getVals(["what", "where"], val);
		};

		$scope.removeElement = function(array, index) {
			array.splice(index, 1);
		};

		$scope.addElement = function(array, element, maxLength) {
			if (!maxLength || array.length <= maxLength) {
				array.push(element);
			}
		};

		$scope.userState = {
			saving: false,
			success: true,
			failure: false
		};

		$scope.circles = {
			selectedElements: [],
			saving: false,
			success: true,
			failure: false
		};

		function setCircleState(state) {
			h.setGeneralState(state, $scope.circles);
		}

		$scope.saveCircles = function () {
			step(function () {
				setCircleState("saving");
				$timeout(this, 200);
			}, h.sF(function () {
				var oldCircles = circleService.inWhichCircles($scope.user.id).map(function (e) {
					return h.parseDecimal(e.getID());
				});
				var newCircles = $scope.circles.selectedElements.map(h.parseDecimal);

				var toAdd = h.arraySubtract(newCircles, oldCircles);
				var toRemove = h.arraySubtract(oldCircles, newCircles);

				var i;
				for (i = 0; i < toAdd.length; i += 1) {
					circleService.get(toAdd[i]).addPersons([$scope.user.id], this.parallel());
				}

				for (i = 0; i < toRemove.length; i += 1) {
					circleService.get(toRemove[i]).removePersons([$scope.user.id], this.parallel());
				}
			}), function (e) {
				if (e) {
					setCircleState("failure");
					errorService.criticalError(e);
				} else {
					setCircleState("success");	
				}
			});
		};

		$scope.newPost = {
			text: ""
		};

		$scope.sendPost = function () {
			var visibleSelection = ["always:allfriends"], wallUserID = 0;

			if ($scope.newPost.text === "") {
				return;
			}

			if (!$scope.user.me) {
				wallUserID = $scope.user.id;
				visibleSelection.push("friends:" + $scope.user.id);
			}

			postService.createPost($scope.newPost.text, visibleSelection, wallUserID, function (err, post) {
				if (err) {
					errorService.criticalError(err);
				} else {
					$scope.newPost.text = "";
				}

				console.log(post);
			});
		};

		$scope.possibleStatus = ["single", "relationship", "engaged", "married", "divorced", "widowed", "complicated", "open", "inlove"];

		$scope.editGeneral = false;

		step(function () {
			userService.get(identifier, this);
		}, h.sF(function (user) {
			userObject = user;

			postService.getWallPosts(0, userObject.getID(), function (err, posts) {
				$scope.posts = posts;
			});

			user.loadFullData(this);
		}), h.sF(function () {
			$scope.user = userObject.data;

			$scope.loading = false;
			userObject.getFriends(this);
		}), h.sF(function (friends) {
			userService.getMultiple(friends, this);
		}), h.sF(function (friends) {
			var i;
			$scope.friends = [];

			for (i = 0; i < friends.length; i += 1) {
				$scope.friends.push(friends[i].data);
				friends[i].loadBasicData(this.parallel());
			}
		}), h.sF(function () {
			$scope.loadingFriends = false;
		}));

		$scope.posts = [];
		$scope.friends = [];
	}

	userController.$inject = ["$scope", "$routeParams", "$timeout", "ssn.cssService", "ssn.errorService", "ssn.userService", "ssn.postService", "ssn.circleService", "ssn.blobService"];

	return userController;
});