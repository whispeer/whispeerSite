/* Warning! This code manipulates the DOM, do only change with extra care as you might create Cross-Site-Scripting holes */

var jQuery = require("jquery");
var directivesModule = require("directives/directivesModule");
var EmojifyConverter = require("emojify");

var syntaxifyDirective = function ($timeout) {
	"use strict";

	console.log("loaded syntaxify directive");

	var emojify = new EmojifyConverter();
	emojify.img_sets.apple.sheet = "/assets/img/sheet_apple_64.png";
	emojify.use_sheet = true;
	emojify.include_title = true;

	var ignoreAsLastCharacter = ["'", ")", "\"", "."];
	var linkElement = jQuery("<a>").attr("target", "_blank");
	var emojiElementOuter = jQuery("<span>").addClass("emoji-outer").addClass("emoji-sizer");
	var emojiElementInner = jQuery("<span>").addClass("emoji-inner").css("background", "url(" + emojify.img_sets.apple.sheet + ")");

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

	function emojifyReplacer(elm, text, remainingTextCallback) {
		var replaced = emojify.replace_colons(emojify.replace_unified(text));
		replaced = replaced.replace(/<span class="emoji-outer emoji-sizer"><span class="emoji-inner"([^>]*)><\/span><\/span>/g, ":emoji:$1:emoji:");
		var splitted = replaced.split(":emoji:");

		splitted.forEach(function (text) {
			if (text.indexOf(emojify.img_sets.apple.sheet) === -1) {
				elm.append(remainingTextCallback(text));
				return;
			}

			//;background-position:67.5% 27.5%;background-size:4100%" title="disappointed_relieved"
			var positionMatch = text.match(/background-position:([^;^"]*)/);
			var sizeMatch = text.match(/background-size:([^;^"]*)/);
			var titleMatch = text.match(/title="([^"]*)"/);

			if (!positionMatch || !sizeMatch || !titleMatch) {
				elm.append(remainingTextCallback(text));
				return;
			}

			var position = positionMatch[1];
			var size = sizeMatch[1];
			var title = titleMatch[1];

			if (!position.match(/^[0-9\.% ]*$/) && !size.match(/^[0-9\.%]*$/)) {
				elm.append(remainingTextCallback(text));
				return;
			}

			elm.append(
				emojiElementOuter.clone().append(
					emojiElementInner.clone().
						css("background-position", position).
						css("background-size", size).attr("title", title)
				)
			);
		});
	}

	function createTextNode(elm, text) {
		elm.append(document.createTextNode(text));
	}

	var syntaxifier = [urlify, newlines, emojifyReplacer, createTextNode];

	function callSyntaxifier(number, elm, text) {
		syntaxifier[number](elm, text, function (text) {
			callSyntaxifier(number + 1, elm, text);
		});
	}

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
