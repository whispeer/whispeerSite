/* Warning! This code manipulates the DOM, do only change with extra care as you might create Cross-Site-Scripting holes */
define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	var ignoreAsLastCharacter = ["'", ")", "\"", "."];
	var linkElement = jQuery("<a>").attr("target", "_blank");

	function appendUrl(elm, url, remainingTextCallback) {
		var i, removeUntil = 0;
		for (i = -1; i > -5; i -= 1) {
			//if i:=-1 than i+1 would be 0 and thus the slice would be empty.
			var lastCharacter = url.slice(i, i+1 || undefined);
			if (ignoreAsLastCharacter.indexOf(lastCharacter) === -1) {
				removeUntil = i + 1;
				break;
			}
		}

		var removedCharacters = "";

		if (removeUntil) {
			removedCharacters = url.slice(removeUntil);
			url = url.slice(0, removeUntil);
		}

		elm.append(linkElement.clone().attr("href", url).text(url));

		if (removeUntil) {
			remainingTextCallback(removedCharacters);
		}
	}

	function urlify(elm, text, remainingTextCallback) {
		/*
		/                                   # Start at the beginning of the text
		(?:ftp|http|https):\/\/              # Look for ftp, http, or https
		(?:                                  # Username:password combinations (optional)
			[\w\.\-\+]+                        # A username
			:{0,1}                             # an optional colon to separate the username and password
			[\w\.\-\+]*@                       # A password
		)?
		(?:[a-z0-9\-\.]+)                    # The domain limiting it to just allowed characters
		(?::[0-9]+)?                         # Server port number
		(?:                                  # The path (optional)
			\/(?:[\w#!:"'\)\.\?\+=&%@!\-\/\(]+)|  # or a forward slash followed by a full path
			\?(?:[\w#!:"'\)\.\?\+=&%@!\-\/\(]+)  # or a question mark followed by key value pairs
		)?/
		*/

		var urlRegex = /((?:http|https):\/\/(?:[\w\.\-\+]+:{0,1}[\w\.\-\+]*@)?(?:[a-z0-9\-\.]+)(?::[0-9]+)?(?:\/(?:[\w#!:"'\)\.,\?\+=&%@!\-\~\/\(]+)|\?(?:[\w#!:"'\)\.,\?\+=&%@!\-\~\/\(]+))?)(?!http)/;

		var urls = text.split(urlRegex);

		var i;
		for (i = 0; i < urls.length; i += 2) {
			remainingTextCallback(urls[i]);
			if (urls[i+1]) {
				appendUrl(elm, urls[i+1], remainingTextCallback);
			}
		}
	}

	function newlines(elm, text, remainingTextCallback) {
		var parts = text.split(/\r\n|\n\r|\r|\n|\w*\[br\]\w*/);

		var i, br = jQuery("<br>");
		for (i = 0; i < parts.length; i += 1) {
			elm.append(remainingTextCallback(parts[i]));
			if (i !== parts.length - 1) {
				elm.append(br.clone());
			}
		}
	}

	function createTextNode(elm, text) {
		elm.append(document.createTextNode(text));
	}

	var syntaxifier = [urlify, newlines, createTextNode];

	function callSyntaxifier(number, elm, text) {
		syntaxifier[number](elm, text, function (text) {
			callSyntaxifier(number + 1, elm, text);
		});
	}

	var syntaxifyDirective =  function ($timeout) {
		return {
			restrict: "A",
			link: function (scope, elm, attrs) {
				if (attrs.syntaxify) {
					scope.$watch(attrs.syntaxify, function (text) {
						if (text) {
							elm.html("");
							callSyntaxifier(0, elm, text);
						}
					});
				} else {
					$timeout(function () {
						var text = elm.text();
						elm.html("");

						callSyntaxifier(0, elm, text);
					});
				}
			}
		};
	};

	syntaxifyDirective.$inject = ["$timeout"];

	directivesModule.directive("syntaxify", syntaxifyDirective);
});
