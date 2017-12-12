/*
The MIT License

Copyright (c) 2012-2013 Coding Smackdown TV, http://codingsmackdown.tv
Changes by Nils Kenneweg (2014-2015), http://whispeer.com
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

const angular = require("angular");
const Localize = require("./localize").default;
const localize = require("./localizationConfig");
const jQuery = require("jquery");

function toReplacementObject(values) {
	var result = {};
	values.forEach(function (val) {
		var index = val.indexOf("=");

		result[val.substr(0, index)] = val.substr(index + 1, val.length);
	});

	return result;
}

function turnTagIntoElementArray(tag, i18nElements) {
	var attr, k, tags = [tag];
	for (attr in i18nElements) {
		if (i18nElements.hasOwnProperty(attr)) {
			for (k = 0; k < tags.length; k += 1) {
				if (typeof tags[k] === "string" && tags[k].indexOf(Localize.getReplacementString(attr)) > -1) {
					var result = tags[k].split(Localize.getReplacementString(attr));
					tags.splice(k, 1, result[0], i18nElements[attr], result[1]);
				}
			}
		}
	}

	return tags;
}

var module = angular.module("localization", []);

// localization service responsible for retrieving resource files from the server and
// managing the translation dictionary
module.provider("localize", function () {
	this.$get = ["$rootScope", function ($rootScope) {
		localize.listen(function () {
			$rootScope.$broadcast("localizeResourcesUpdates");
		}, "localizeResourcesUpdates");

		localize.initLocalizedResources();

		return localize;
	}];
});

// simple translation filter
// usage {{ TOKEN | i18n }}
module.filter("i18n", ["localize", function () {
	const filter = (input) => localize.getLocalizedString(input)
	filter.$stateful = true
	return filter
}]);

module.filter("l", ["localize", function () {
	const filter = (input) => localize.getLocalizedString(input)
	filter.$stateful = true
	return filter
}]);

const i18nDirective = ($compile, directiveName, allowHtml) => {
	const directive = {
		restrict: "EAC",
		updateText: function (scope, elm, token, i18nElements) {
			var values = token.split("|");

			i18nElements = i18nElements || [];

			// construct the tag to insert into the element
			var tag = localize.getLocalizedString(values.shift(), toReplacementObject(values));
			// update the element only if data was returned
			if (!tag) {
				return;
			}

			elm.html("");

			var tags = turnTagIntoElementArray(tag, i18nElements);

			tags.forEach(function (cur) {
				if (typeof cur === "string") {
					elm.append(allowHtml === true ? cur : document.createTextNode(cur));
				} else {
					cur.forEach(function (element) {
						elm.append(element.clone());
					});
				}
			});

			$compile(elm.contents())(scope);
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
					directive.updateText(scope, elm, attrs[directiveName], elements);
				});

				attrs.$observe(directiveName, function () {
					directive.updateText(scope, elm, attrs[directiveName], elements);
				});
			};
		},
	}

	return directive
}

// translation directive that can handle dynamic strings
// updates the text value of the attached element
// usage <span data-i18n="TOKEN" ></span>
// or
// <span data-i18n="TOKEN|VALUE1|VALUE2" ></span>
module.directive("i18n", ["$compile", "localize", function ($compile) {
	return i18nDirective($compile, "i18n", false)
}]);

module.directive("i18nHtml", ["$compile", "localize", function ($compile) {
	return i18nDirective($compile, "i18nHtml", true)
}]);

// translation directive that can handle dynamic strings
// updates the attribute value of the attached element
// usage <span data-i18n-attr="TOKEN|ATTRIBUTE" ></span>
// or
// <span data-i18n-attr="TOKEN|ATTRIBUTE|VALUE1|VALUE2" ></span>
module.directive("i18nAttr", ["localize", function () {
	var i18nAttrDirective = {
		restrict: "EAC",
		updateText: function (elm, token) {
			var values = token.split("|"), key = values.shift(), attr = values.shift();
			// construct the tag to insert into the element
			var tag = localize.getLocalizedString(key, toReplacementObject(values));
			// update the element only if data was returned
			if (!tag) {
				return;
			}

			// insert the text into the atribute
			elm.attr(attr, tag);
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
