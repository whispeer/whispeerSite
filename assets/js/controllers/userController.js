/**
* userController
**/

define(["step", "whispeerHelper", "asset/resizableImage", "asset/state"], function (step, h, ResizableImage, State) {
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

		$scope.givenPrint = "";

		$scope.toggleVerify = function () {
			$scope.verifyNow = !$scope.verifyNow;
		};

		var verifyState = new State();
		$scope.verifyingUser = verifyState.data;

		$scope.verify = function (fingerPrint) {
			verifyState.pending();

			var ok = userObject.verify(fingerPrint, function (e) {
				if (e) {
					verifyState.failed();
					errorService.criticalError(e);
				} else {
					verifyState.success();
				}
			});

			if (!ok) {
				verifyState.failed();
			}
		};

		$scope.changeImage = false;

		cssService.setClass("profileView");

		$scope.days = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"];
		$scope.months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
		$scope.years = ["1999", "1998", "1997", "1996", "1995", "1994", "1993", "1992", "1991", "1990", "1989", "1988", "1987", "1986", "1985", "1984", "1983", "1982", "1981", "1980", "1979", "1978", "1977", "1976", "1975", "1974", "1973", "1972", "1971", "1970", "1969", "1968", "1967", "1966", "1965", "1964", "1963", "1962", "1961", "1960", "1959", "1958", "1957", "1956", "1955", "1954", "1953", "1952", "1951", "1950", "1949", "1948", "1947", "1946", "1945", "1944", "1943", "1942", "1941", "1940", "1939", "1938", "1937", "1936", "1935", "1934", "1933", "1932", "1931", "1930", "1929", "1928", "1927", "1926", "1925", "1924", "1923", "1922", "1921", "1920", "1919", "1918", "1917", "1916", "1915", "1914", "1913", "1912", "1911", "1910", "1909", "1908", "1907", "1906", "1905", "1904", "1903", "1902", "1901", "1900"];
		$scope.countries = [{name:'-',code:'none'},{name:'Afghanistan',code:'AF'},{name:'ÅlandIslands',code:'AX'},{name:'Albania',code:'AL'},{name:'Algeria',code:'DZ'},{name:'AmericanSamoa',code:'AS'},{name:'AndorrA',code:'AD'},{name:'Angola',code:'AO'},{name:'Anguilla',code:'AI'},{name:'Antarctica',code:'AQ'},{name:'AntiguaandBarbuda',code:'AG'},{name:'Argentina',code:'AR'},{name:'Armenia',code:'AM'},{name:'Aruba',code:'AW'},{name:'Australia',code:'AU'},{name:'Austria',code:'AT'},{name:'Azerbaijan',code:'AZ'},{name:'Bahamas',code:'BS'},{name:'Bahrain',code:'BH'},{name:'Bangladesh',code:'BD'},{name:'Barbados',code:'BB'},{name:'Belarus',code:'BY'},{name:'Belgium',code:'BE'},{name:'Belize',code:'BZ'},{name:'Benin',code:'BJ'},{name:'Bermuda',code:'BM'},{name:'Bhutan',code:'BT'},{name:'Bolivia',code:'BO'},{name:'BosniaandHerzegovina',code:'BA'},{name:'Botswana',code:'BW'},{name:'BouvetIsland',code:'BV'},{name:'Brazil',code:'BR'},{name:'BritishIndianOceanTerritory',code:'IO'},{name:'BruneiDarussalam',code:'BN'},{name:'Bulgaria',code:'BG'},{name:'BurkinaFaso',code:'BF'},{name:'Burundi',code:'BI'},{name:'Cambodia',code:'KH'},{name:'Cameroon',code:'CM'},{name:'Canada',code:'CA'},{name:'CapeVerde',code:'CV'},{name:'CaymanIslands',code:'KY'},{name:'CentralAfricanRepublic',code:'CF'},{name:'Chad',code:'TD'},{name:'Chile',code:'CL'},{name:'China',code:'CN'},{name:'ChristmasIsland',code:'CX'},{name:'Cocos(Keeling)Islands',code:'CC'},{name:'Colombia',code:'CO'},{name:'Comoros',code:'KM'},{name:'Congo',code:'CG'},{name:'Congo,TheDemocraticRepublicofthe',code:'CD'},{name:'CookIslands',code:'CK'},{name:'CostaRica',code:'CR'},{name:'CoteD\'Ivoire',code:'CI'},{name:'Croatia',code:'HR'},{name:'Cuba',code:'CU'},{name:'Cyprus',code:'CY'},{name:'CzechRepublic',code:'CZ'},{name:'Denmark',code:'DK'},{name:'Djibouti',code:'DJ'},{name:'Dominica',code:'DM'},{name:'DominicanRepublic',code:'DO'},{name:'Ecuador',code:'EC'},{name:'Egypt',code:'EG'},{name:'ElSalvador',code:'SV'},{name:'EquatorialGuinea',code:'GQ'},{name:'Eritrea',code:'ER'},{name:'Estonia',code:'EE'},{name:'Ethiopia',code:'ET'},{name:'FalklandIslands(Malvinas)',code:'FK'},{name:'FaroeIslands',code:'FO'},{name:'Fiji',code:'FJ'},{name:'Finland',code:'FI'},{name:'France',code:'FR'},{name:'FrenchGuiana',code:'GF'},{name:'FrenchPolynesia',code:'PF'},{name:'FrenchSouthernTerritories',code:'TF'},{name:'Gabon',code:'GA'},{name:'Gambia',code:'GM'},{name:'Georgia',code:'GE'},{name:'Germany',code:'DE'},{name:'Ghana',code:'GH'},{name:'Gibraltar',code:'GI'},{name:'Greece',code:'GR'},{name:'Greenland',code:'GL'},{name:'Grenada',code:'GD'},{name:'Guadeloupe',code:'GP'},{name:'Guam',code:'GU'},{name:'Guatemala',code:'GT'},{name:'Guernsey',code:'GG'},{name:'Guinea',code:'GN'},{name:'Guinea-Bissau',code:'GW'},{name:'Guyana',code:'GY'},{name:'Haiti',code:'HT'},{name:'HeardIslandandMcdonaldIslands',code:'HM'},{name:'HolySee(VaticanCityState)',code:'VA'},{name:'Honduras',code:'HN'},{name:'HongKong',code:'HK'},{name:'Hungary',code:'HU'},{name:'Iceland',code:'IS'},{name:'India',code:'IN'},{name:'Indonesia',code:'ID'},{name:'Iran,IslamicRepublicOf',code:'IR'},{name:'Iraq',code:'IQ'},{name:'Ireland',code:'IE'},{name:'IsleofMan',code:'IM'},{name:'Israel',code:'IL'},{name:'Italy',code:'IT'},{name:'Jamaica',code:'JM'},{name:'Japan',code:'JP'},{name:'Jersey',code:'JE'},{name:'Jordan',code:'JO'},{name:'Kazakhstan',code:'KZ'},{name:'Kenya',code:'KE'},{name:'Kiribati',code:'KI'},{name:'Korea,DemocraticPeople\'SRepublicof',code:'KP'},{name:'Korea,Republicof',code:'KR'},{name:'Kuwait',code:'KW'},{name:'Kyrgyzstan',code:'KG'},{name:'LaoPeople\'SDemocraticRepublic',code:'LA'},{name:'Latvia',code:'LV'},{name:'Lebanon',code:'LB'},{name:'Lesotho',code:'LS'},{name:'Liberia',code:'LR'},{name:'LibyanArabJamahiriya',code:'LY'},{name:'Liechtenstein',code:'LI'},{name:'Lithuania',code:'LT'},{name:'Luxembourg',code:'LU'},{name:'Macao',code:'MO'},{name:'Macedonia,TheFormerYugoslavRepublicof',code:'MK'},{name:'Madagascar',code:'MG'},{name:'Malawi',code:'MW'},{name:'Malaysia',code:'MY'},{name:'Maldives',code:'MV'},{name:'Mali',code:'ML'},{name:'Malta',code:'MT'},{name:'MarshallIslands',code:'MH'},{name:'Martinique',code:'MQ'},{name:'Mauritania',code:'MR'},{name:'Mauritius',code:'MU'},{name:'Mayotte',code:'YT'},{name:'Mexico',code:'MX'},{name:'Micronesia,FederatedStatesof',code:'FM'},{name:'Moldova,Republicof',code:'MD'},{name:'Monaco',code:'MC'},{name:'Mongolia',code:'MN'},{name:'Montserrat',code:'MS'},{name:'Morocco',code:'MA'},{name:'Mozambique',code:'MZ'},{name:'Myanmar',code:'MM'},{name:'Namibia',code:'NA'},{name:'Nauru',code:'NR'},{name:'Nepal',code:'NP'},{name:'Netherlands',code:'NL'},{name:'NetherlandsAntilles',code:'AN'},{name:'NewCaledonia',code:'NC'},{name:'NewZealand',code:'NZ'},{name:'Nicaragua',code:'NI'},{name:'Niger',code:'NE'},{name:'Nigeria',code:'NG'},{name:'Niue',code:'NU'},{name:'NorfolkIsland',code:'NF'},{name:'NorthernMarianaIslands',code:'MP'},{name:'Norway',code:'NO'},{name:'Oman',code:'OM'},{name:'Pakistan',code:'PK'},{name:'Palau',code:'PW'},{name:'PalestinianTerritory,Occupied',code:'PS'},{name:'Panama',code:'PA'},{name:'PapuaNewGuinea',code:'PG'},{name:'Paraguay',code:'PY'},{name:'Peru',code:'PE'},{name:'Philippines',code:'PH'},{name:'Pitcairn',code:'PN'},{name:'Poland',code:'PL'},{name:'Portugal',code:'PT'},{name:'PuertoRico',code:'PR'},{name:'Qatar',code:'QA'},{name:'Reunion',code:'RE'},{name:'Romania',code:'RO'},{name:'RussianFederation',code:'RU'},{name:'RWANDA',code:'RW'},{name:'SaintHelena',code:'SH'},{name:'SaintKittsandNevis',code:'KN'},{name:'SaintLucia',code:'LC'},{name:'SaintPierreandMiquelon',code:'PM'},{name:'SaintVincentandtheGrenadines',code:'VC'},{name:'Samoa',code:'WS'},{name:'SanMarino',code:'SM'},{name:'SaoTomeandPrincipe',code:'ST'},{name:'SaudiArabia',code:'SA'},{name:'Senegal',code:'SN'},{name:'SerbiaandMontenegro',code:'CS'},{name:'Seychelles',code:'SC'},{name:'SierraLeone',code:'SL'},{name:'Singapore',code:'SG'},{name:'Slovakia',code:'SK'},{name:'Slovenia',code:'SI'},{name:'SolomonIslands',code:'SB'},{name:'Somalia',code:'SO'},{name:'SouthAfrica',code:'ZA'},{name:'SouthGeorgiaandtheSouthSandwichIslands',code:'GS'},{name:'Spain',code:'ES'},{name:'SriLanka',code:'LK'},{name:'Sudan',code:'SD'},{name:'Suriname',code:'SR'},{name:'SvalbardandJanMayen',code:'SJ'},{name:'Swaziland',code:'SZ'},{name:'Sweden',code:'SE'},{name:'Switzerland',code:'CH'},{name:'SyrianArabRepublic',code:'SY'},{name:'Taiwan,ProvinceofChina',code:'TW'},{name:'Tajikistan',code:'TJ'},{name:'Tanzania,UnitedRepublicof',code:'TZ'},{name:'Thailand',code:'TH'},{name:'Timor-Leste',code:'TL'},{name:'Togo',code:'TG'},{name:'Tokelau',code:'TK'},{name:'Tonga',code:'TO'},{name:'TrinidadandTobago',code:'TT'},{name:'Tunisia',code:'TN'},{name:'Turkey',code:'TR'},{name:'Turkmenistan',code:'TM'},{name:'TurksandCaicosIslands',code:'TC'},{name:'Tuvalu',code:'TV'},{name:'Uganda',code:'UG'},{name:'Ukraine',code:'UA'},{name:'UnitedArabEmirates',code:'AE'},{name:'UnitedKingdom',code:'GB'},{name:'UnitedStates',code:'US'},{name:'UnitedStatesMinorOutlyingIslands',code:'UM'},{name:'Uruguay',code:'UY'},{name:'Uzbekistan',code:'UZ'},{name:'Vanuatu',code:'VU'},{name:'Venezuela',code:'VE'},{name:'VietNam',code:'VN'},{name:'VirginIslands,British',code:'VG'},{name:'VirginIslands,U.S.',code:'VI'},{name:'WallisandFutuna',code:'WF'},{name:'WesternSahara',code:'EH'},{name:'Yemen',code:'YE'},{name:'Zambia',code:'ZM'},{name:'Zimbabwe',code:'ZW'}];

		var currentYear = new Date().getFullYear(), i;
		for (i = 2000; i <= currentYear; i += 1) {
			$scope.years.unshift(i.toString());
		}

		$scope.addFriend = function () {
			userObject.addAsFriend();
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
					userObject.setAdvancedProfile(adv, this);
				}), h.sF(function () {
					userObject.uploadChangedProfile(this);
				}), h.sF(function () {
					$scope.edit();

					this.ne();
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
			}, h.sF(function (post) {
				$scope.newPost.text = "";

				console.log(post);
			}), errorService.failOnError(sendPostState));
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