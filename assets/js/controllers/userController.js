/**
* userController
**/

define(["step", "whispeerHelper", "asset/resizableImage", "asset/state", "libs/qrreader"], function (step, h, ResizableImage, State, qrreader) {
	"use strict";

	function userController($scope, $routeParams, $timeout, cssService, errorService, userService, postService, circleService, blobService) {
		var identifier = $routeParams.identifier;
		var userObject;

		var resizableImage = new ResizableImage();

		var saveUserState = new State();
		$scope.saveUserState = saveUserState.data;

		$scope.loading = true;
		$scope.notExisting = false;
		$scope.loadingFriends = true;
		$scope.verifyNow = false;

		var verifyState = new State();
		$scope.verifyingUser = verifyState.data;

		$scope.qr = {
			available: !!(navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia),
			view: false,
			read: false,
			reset: function () {
				if (verifyState.isFailed()) {
					$scope.qr.read = false;
					initializeReader();
				}
			}
		};

		$scope.verifyCode = !$scope.qr.available;

		$scope.verifyWithCode = function () {
			$scope.verifyCode = true;
		};

		$scope.resetVerifcationMethod = function () {
			$scope.verifyCode = false;
			$scope.qr.view = false;
		};

		var theStream;

		function captureToCanvas() {
			if (!$scope.qr.read) {
				try {
					var width = 800;
					var height = 600;

					var gCanvas = document.createElement("canvas");
					gCanvas.width = width;
					gCanvas.height = height;

					var gCtx = gCanvas.getContext("2d");
					gCtx.clearRect(0, 0, width, height);

					gCtx.drawImage(document.getElementById("qrCodeVideo"), 0, 0);
					var codeText = qrreader.decodeCanvas(gCanvas);

					$scope.qr.read = true;
					theStream.stop();
					$scope.qrCode = codeText;

					$scope.verify(codeText);
				} catch(e) {
					console.error(e);
					$scope.qrCode = "error:" + e;
					$timeout(captureToCanvas, 500);
				}
			}
		}

		function initializeReader() {
			var webkit=false;
			var moz=false;

			step(function () {
				if (window.MediaStreamTrack && window.MediaStreamTrack.getSources) {
					window.MediaStreamTrack.getSources(this.ne);
				} else {
					this.ne();
				}
			}, h.sF(function (sources) {
				var constraints = {
					audio: false,
					video: true
				};

				if (sources) {
					var environmentSources = sources.filter(function (data) {
						return data.kind === "video" && data.facing === "environment";
					});

					if (environmentSources.length === 1) {
						constraints.video = { optional: [{sourceId: environmentSources[0].id}] };
					}
				}

				if(navigator.getUserMedia) {
					navigator.getUserMedia(constraints, this.ne, this);
				} else if(navigator.webkitGetUserMedia) {
					webkit=true;
					navigator.webkitGetUserMedia(constraints, this.ne, this);
				} else if(navigator.mozGetUserMedia) {
					moz=true;
					navigator.mozGetUserMedia(constraints, this.ne, this);
				}
			}), h.sF(function (stream) {
				$scope.qr.noDevice = false;
				theStream = stream;
				var v = document.getElementById("qrCodeVideo");

				if(webkit) {
					v.src = window.webkitURL.createObjectURL(stream);
				} else if(moz) {
					v.mozSrcObject = stream;
					v.play();
				} else {
					v.src = stream;
				}

				$timeout(captureToCanvas, 500);
			}), function (e) {
				if (e.name === "DevicesNotFoundError") {
					$scope.qr.noDevice = true;

					$timeout(initializeReader, 1000);
				} else {
					this(e);
				}
			}, errorService.criticalError);
		}

		$scope.verifyWithQrCode = function () {
			$scope.qr.view = true;

			initializeReader();
		};

		$scope.givenPrint = ["", "", "", ""];
		$scope.faEqual = function (val1, val2) {
			if (val1.length < val2.length) {
				return "";
			}

			if (val1 === val2) {
				return "fa-check";
			} else {
				return "fa-times";
			}
		};

		function partitionInput() {
			var fpLength = $scope.fingerPrint[0].length, i;
			var given = $scope.givenPrint.join("");

			for (i = 0; i < $scope.fingerPrint.length - 1; i += 1) {
				$scope.givenPrint[i] = given.substr(i * fpLength, fpLength);
			}

			$scope.givenPrint[$scope.fingerPrint.length - 1] = given.substr(i * fpLength);
		}

		function focusMissingField() {
			var fpLength = $scope.fingerPrint[0].length, i;

			for (i = 0; i < $scope.givenPrint.length; i += 1) {
				if ($scope.givenPrint[i].length < fpLength) {
					jQuery(".verify input")[i].focus();
					return;
				}
			}

			jQuery(".verify input")[$scope.givenPrint.length - 1].focus();
		}

		$scope.nextInput = function (index) {
			$scope.givenPrint[index] = $scope.givenPrint[index].toUpperCase().replace(/[^A-Z0-9]/g, "");

			partitionInput();
			focusMissingField();
		};

		$scope.toggleVerify = function () {
			$scope.verifyNow = !$scope.verifyNow;
		};

		$scope.verify = function (fingerPrint) {
			verifyState.pending();
			if (typeof fingerPrint.join === "function") {
				fingerPrint = fingerPrint.join("");
			}

			step(function () {
				var ok = userObject.verifyFingerPrint(fingerPrint, this);	

				if (!ok) {
					this(new Error("wrong code"));
				}
			}, errorService.failOnError(verifyState));
		};

		$scope.changeImage = false;

		cssService.setClass("profileView", true);

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

		$scope.removeFriend = function () {
			userObject.removeAsFriend();
		};

		$scope.edit = function () {
			$scope.editGeneral = !$scope.editGeneral;

			resizableImage.removeResizable();
			$scope.changeImage = false;
		};

		var ENDSIZE = 250;
		var CANVASWIDTH = 600, CANVASHEIGHT = 300;

		$scope.imageChange = resizableImage.callBackForFileLoad(function () {
			resizableImage.paintImageOnCanvasWithResizer({
				element: document.getElementById("userView-userimage-original"),
				width: CANVASWIDTH,
				height: CANVASHEIGHT
			});
		});

		$scope.doChangeImage = function () {
			resizableImage.removeResizable();
			$scope.changeImage = !$scope.changeImage;

			resizableImage.loadImage($scope.user.basic.image, function () {
				resizableImage.paintImageOnCanvasWithResizer({
					element: document.getElementById("userView-userimage-original"),
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
			saveUserState.pending();

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

					if (adv.gender.gender !== "o") {
						adv.gender.text = "";
					}

					userObject.setAdvancedProfile(adv, this);
				}), h.sF(function () {
					userObject.uploadChangedProfile(this);
				}), h.sF(function () {
					$scope.edit();

					$timeout(this);
				}), errorService.failOnError(saveUserState));
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
			return getVals(["town", "country"], val);
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

		var circleState = new State();

		$scope.circles = {
			selectedElements: [],
			saving: circleState.data
		};

		$scope.saveCircles = function () {
			step(function () {
				circleState.pending();
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
				this.parallel()();
			}), errorService.failOnError(circleState));
		};

		$scope.newPost = {
			text: ""
		};

		var sendPostState = new State();
		$scope.sendPostState = sendPostState.data;

		$scope.sendPost = function () {
			sendPostState.pending();

			var visibleSelection = ["always:allfriends"], wallUserID = 0;

			if ($scope.newPost.text === "") {
				sendPostState.failed();
				return;
			}

			if (!$scope.user.me) {
				wallUserID = $scope.user.id;
				visibleSelection.push("friends:" + $scope.user.id);
			}

			step(function () {
				postService.createPost($scope.newPost.text, visibleSelection, wallUserID, this);
			}, h.sF(function () {
				$scope.newPost.text = "";

				this.ne();
			}), errorService.failOnError(sendPostState));
		};

		$scope.possibleStatus = ["single", "relationship", "engaged", "married", "divorced", "widowed", "complicated", "open", "inlove"];

		$scope.editGeneral = false;

		step(function () {
			userService.get(identifier, this);
		}, h.sF(function (user) {
			userObject = user;

			var fp = user.getFingerPrint();
			$scope.fingerPrint = [fp.substr(0,13), fp.substr(13,13), fp.substr(26,13), fp.substr(39,13)];

			postService.getWallPosts(0, userObject.getID(), function (err, posts) {
				$scope.posts = posts;
			});

			user.loadFullData(this);
		}), h.sF(function () {
			$scope.user = userObject.data;
			$scope.adv = $scope.user.advanced;

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