/* Warning! This code manipulates the DOM, do only change with extra care as you might create Cross-Site-Scripting holes */
define([], function () {
	"use strict";

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
			\/(?:[\w#!:\.\?\+=&%@!\-\/\(]+)|  # or a forward slash followed by a full path
			\?(?:[\w#!:\.\?\+=&%@!\-\/\(]+)  # or a question mark followed by key value pairs
		)?/
		*/

		var urlRegex = /((?:http|https):\/\/(?:[\w\.\-\+]+:{0,1}[\w\.\-\+]*@)?(?:[a-z0-9\-\.]+)(?::[0-9]+)?(?:\/(?:[\w#!:\.\?\+=&%@!\-\/\(]+)|\?(?:[\w#!:\.\?\+=&%@!\-\/\(]+))?)(?!http)/;

		var urls = text.split(urlRegex);

		var i, a = jQuery("<a>").attr("target", "_blank");
		for (i = 0; i < urls.length; i += 2) {
			remainingTextCallback(urls[i]);
			if (urls[i+1]) {
				elm.append(a.clone().attr("href", urls[i+1]).text(urls[i+1]));
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

	var syntaxify =  function ($timeout) {
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

	syntaxify.$inject = ["$timeout"];

	return syntaxify;
});