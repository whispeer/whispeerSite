/*
The MIT License

Copyright (c) 2012-2013 Coding Smackdown TV, http://codingsmackdown.tv
Changes by Nils Kenneweg, http://whispeer.com
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
Enjoy!
*/

/*
* An AngularJS Localization Service
*
* Written by Jim Lavin
* http://codingsmackdown.tv
* Changes by Nils Kenneweg, http://whispeer.com
*/

define(["angular"], function (angular) {
	"use strict";

	function escapeRegExp(string) {
		return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
	}

	function regExpFromString(string, mode) {
		return new RegExp(escapeRegExp(string), mode);
	}

	function insertValues(tag, values) {
		var i, toSet;
		if (values.length > 1) {
			for (i = 1; i < values.length; i += 1) {
				toSet = values[i].split("=");

				if (toSet.length === 2) {
					tag = tag.replace(regExpFromString("{" + toSet[0] + "}", "g"), toSet[1]);
				}
			}
		}

		return tag;
	}

	function turnTagIntoElementArray(tag, i18nElements) {
		var attr, k, tags = [tag];
		for (attr in i18nElements) {
			if (i18nElements.hasOwnProperty(attr)) {
				for (k = 0; k < tags.length; k += 1) {
					if (typeof tags[k] === "string" && tags[k].indexOf("{" + attr + "}") > -1) {
						var result = tags[k].split("{" + attr + "}");
						tags.splice(k, 1, result[0], i18nElements[attr], result[1]);
					}
				}
			}
		}

		return tags;
	}

	angular.module("localization", [])
		// localization service responsible for retrieving resource files from the server and
		// managing the translation dictionary
		.factory("localize", ["$http", "$rootScope", "$window", function ($http, $rootScope, $window) {
			var language = $window.navigator.userLanguage || $window.navigator.language;
			var dictionary = {};
			var resourceFileLoaded = false;

			function successCallback(data) {
				// store the returned array in the dictionary
				dictionary = data;
				// set the flag that the resource are loaded
				resourceFileLoaded = true;
				// broadcast that the file has been loaded
				$rootScope.$broadcast("localizeResourcesUpdates");
			}

			function loadDefault() {
				// the request failed set the url to the default resource file
				var url = "assets/js/i18n/l_en-US.json";
				// request the default resource file
				$http({ method: "GET", url: url, cache: false }).success(successCallback);
			}

			// loads the language resource file from the server
			function initLocalizedResources() {
				resourceFileLoaded = false;

				// build the url to retrieve the localized resource file
				var url = "assets/js/i18n/l_" + language + ".json";
				// request the resource file
				$http({ method: "GET", url: url, cache: false }).success(successCallback).error(function () {
					if (language.length === 2) {
						loadDefault();
					} else {
						// the request failed set the url to a different url
						var url = "assets/js/i18n/l_" + language.substr(0, 2) + ".json";

						$http({ method: "GET", url: url, cache: false }).success(successCallback).error(loadDefault);
					}
				});
			}

			var localize = {
				getLanguage: function () {
					return language;
				},

				// allows setting of language on the fly
				setLanguage: function (value) {
					if (language !== value) {
						language = (value || "").toString();
						initLocalizedResources();
					}
				},

				// checks the dictionary for a localized resource string
				getLocalizedString: function (value, replacements) {
					if (!resourceFileLoaded) {
						return "";
					}

					// default the result to an empty string
					var memory = dictionary;

					var attributes = value.split(".");

					var i;
					for (i = 0; i < attributes.length; i += 1) {
						if (memory[attributes[i]] || memory[attributes[i]] === "") {
							memory = memory[attributes[i]];
						} else {
							break;
						}
					}

					if (typeof memory !== "string" && typeof memory !== "number" && typeof memory !== "boolean") {
						console.warn("Invalid Translation:" + value);
						return "";
					}

					if (replacements) {
						var element;
						for (element in replacements) {
							if (replacements.hasOwnProperty(element)) {
								memory = memory.replace("{" + element + "}", replacements[element]);
							}
						}
					}

					return memory;
				}
			};

			// force the load of the resource file
			initLocalizedResources();

			// return the local instance when called
			return localize;
		} ])
		// simple translation filter
		// usage {{ TOKEN | i18n }}
		.filter("i18n", ["localize", function (localize) {
			return function (input) {
				return localize.getLocalizedString(input);
			};
		}])
		.filter("l", ["localize", function (localize) {
			return function (input) {
				return localize.getLocalizedString(input);
			};
		}])
		// translation directive that can handle dynamic strings
		// updates the text value of the attached element
		// usage <span data-i18n="TOKEN" ></span>
		// or
		// <span data-i18n="TOKEN|VALUE1|VALUE2" ></span>
		.directive("i18n", ["localize", "$compile", function (localize, $compile) {
			var i18nDirective = {
				restrict: "EAC",
				updateText: function (scope, elm, token, i18nElements) {
					var values = token.split("|"), k;

					i18nElements = i18nElements || [];

					// construct the tag to insert into the element
					var tag = localize.getLocalizedString(values[0]);
					// update the element only if data was returned
					if (tag && tag !== "") {
						tag = insertValues(tag, values);

						elm.html("");

						var tags = turnTagIntoElementArray(tag, i18nElements);

						var cur, i;
						//set element html
						for (i = 0; i < tags.length; i += 1) {
							cur = tags[i];

							if (typeof cur === "string") {
								elm.append(document.createTextNode(cur));
							} else {
								for (k = 0; k < cur.length; k += 1) {
									elm.append(cur[k].clone());
								}
							}
						}

						$compile(elm.contents())(scope);
					}
				},

				compile: function (elm) {
					var elements = {};

					var children = elm.children();
					var k, child, attr;

					//get the html of all children
					for (k = 0; k < children.length; k += 1) {
						child = jQuery(children[k]);

						attr = child.attr("data-for");

						elements[attr] = elements[attr] || [];
						elements[attr].push(child);
					}

					elm.html("");

					return function (scope, elm, attrs) {
						scope.$on("localizeResourcesUpdates", function () {
							i18nDirective.updateText(scope, elm, attrs.i18n, elements);
						});

						attrs.$observe("i18n", function () {
							i18nDirective.updateText(scope, elm, attrs.i18n, elements);
						});
					};
				},
			};

			return i18nDirective;
		}])
		// translation directive that can handle dynamic strings
		// updates the attribute value of the attached element
		// usage <span data-i18n-attr="TOKEN|ATTRIBUTE" ></span>
		// or
		// <span data-i18n-attr="TOKEN|ATTRIBUTE|VALUE1|VALUE2" ></span>
		.directive("i18nAttr", ["localize", function (localize) {
			var i18nAttrDirective = {
				restrict: "EAC",
				updateText: function (elm, token) {
					var values = token.split("|");
					// construct the tag to insert into the element
					var tag = localize.getLocalizedString(values[0]), index, toSet;
					// update the element only if data was returned
					if ((tag !== null) && (tag !== undefined) && (tag !== "")) {
						if (values.length > 2) {
							for (index = 2; index < values.length; index += 1) {
								toSet = values[index].split("=");
								if (toSet.length === 2) {
									var target = "{" + toSet[0] + "}";
									tag = tag.replace(target, toSet[1]);
								}
							}
						}
						// insert the text into the element
						elm.attr(values[1], tag);
					}
				},
				link: function (scope, elm, attrs) {
					scope.$on("localizeResourcesUpdates", function () {
						i18nAttrDirective.updateText(elm, attrs.i18nAttr);
					});

					attrs.$observe("i18nAttr", function (value) {
						i18nAttrDirective.updateText(elm, value);
					});
				}
			};

			return i18nAttrDirective;
		}]);
});