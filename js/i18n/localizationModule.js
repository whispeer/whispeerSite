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
*
*/

define(['angular'], function (angular) {
	'use strict';
	angular.module('localization', [])
		// localization service responsible for retrieving resource files from the server and
		// managing the translation dictionary
		.factory('localize', ['$http', '$rootScope', '$window', function ($http, $rootScope, $window) {
			var language = $window.navigator.userLanguage || $window.navigator.language;
			var dictionary = {};
			var resourceFileLoaded = false;

			function successCallback(data) {
				// store the returned array in the dictionary
				dictionary = data;
				// set the flag that the resource are loaded
				resourceFileLoaded = true;
				// broadcast that the file has been loaded
				$rootScope.$broadcast('localizeResourcesUpdates');
			}

			// loads the language resource file from the server
			function initLocalizedResources() {
				resourceFileLoaded = false;

				// build the url to retrieve the localized resource file
				var url = 'js/i18n/resources-locale_' + language + '.js';
				// request the resource file
				$http({ method: "GET", url: url, cache: false }).success(successCallback).error(function () {
					// the request failed set the url to the default resource file
					var url = 'js/i18n/resources-locale_en-US.js';
					// request the default resource file
					$http({ method: "GET", url: url, cache: false }).success(successCallback);
				});
			}

			var localize = {
				// allows setting of language on the fly
				setLanguage: function (value) {
					if (language !== value) {
						language = value;
						initLocalizedResources();
					}
				},

				// checks the dictionary for a localized resource string
				getLocalizedString: function (value) {
					if (!resourceFileLoaded) {
						return '';
					}

					// default the result to an empty string
					var memory = dictionary;

					var attributes = value.split(".");

					var i;
					for (i = 0; i < attributes.length; i += 1) {
						if (memory[attributes[i]]) {
							memory = memory[attributes[i]];
						} else {
							break;
						}
					}

					if (typeof memory !== "string" && typeof memory !== "number" && typeof memory !== "boolean") {
						console.log("Invalid Translation:" + value);
						return '';
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
		.filter('i18n', ['localize', function (localize) {
			return function (input) {
				return localize.getLocalizedString(input);
			};
		}])
		// translation directive that can handle dynamic strings
		// updates the text value of the attached element
		// usage <span data-i18n="TOKEN" ></span>
		// or
		// <span data-i18n="TOKEN|VALUE1|VALUE2" ></span>
		.directive('i18n', ['localize', function (localize) {
			var i18nDirective = {
				restrict: "EAC",
				updateText: function (elm, token) {
					var values = token.split('|'), index;
					if (values.length >= 1) {
						// construct the tag to insert into the element
						var tag = localize.getLocalizedString(values[0]);
						// update the element only if data was returned
						if ((tag !== null) && (tag !== undefined) && (tag !== '')) {
							if (values.length > 1) {
								for (index = 1; index < values.length; index += 1) {
									var target = '{' + (index - 1) + '}';
									tag = tag.replace(target, values[index]);
								}
							}
							// insert the text into the element
							elm.text(tag);
						}
					}
				},

				link: function (scope, elm, attrs) {
					scope.$on('localizeResourcesUpdates', function () {
						i18nDirective.updateText(elm, attrs.i18n);
					});

					attrs.$observe('i18n', function () {
						i18nDirective.updateText(elm, attrs.i18n);
					});
				}
			};

			return i18nDirective;
		}])
		// translation directive that can handle dynamic strings
		// updates the attribute value of the attached element
		// usage <span data-i18n-attr="TOKEN|ATTRIBUTE" ></span>
		// or
		// <span data-i18n-attr="TOKEN|ATTRIBUTE|VALUE1|VALUE2" ></span>
		.directive('i18nAttr', ['localize', function (localize) {
			var i18NAttrDirective = {
				restrict: "EAC",
				updateText: function (elm, token) {
					var values = token.split('|');
					// construct the tag to insert into the element
					var tag = localize.getLocalizedString(values[0]), index;
					// update the element only if data was returned
					if ((tag !== null) && (tag !== undefined) && (tag !== '')) {
						if (values.length > 2) {
							for (index = 2; index < values.length; index += 1) {
								var target = '{' + (index - 2) + '}';
								tag = tag.replace(target, values[index]);
							}
						}
						// insert the text into the element
						elm.attr(values[1], tag);
					}
				},
				link: function (scope, elm, attrs) {
					scope.$on('localizeResourcesUpdated', function () {
						i18NAttrDirective.updateText(elm, attrs.i18nAttr);
					});

					attrs.$observe('i18nAttr', function (value) {
						i18NAttrDirective.updateText(elm, value);
					});
				}
			};

			return i18NAttrDirective;
		}]);
});