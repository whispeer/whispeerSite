/* global module, require, define */
"use strict";

var step;

var helper = {
	callback: function (c) {
		if (typeof c !== "function") {
			console.trace();
			throw new Error("not a callback function");
		}
	},

	/** decode entities
	* @param str string to decode
	* @author Nilos
	* this is wrapped to remove overhead.
	* < and > are removed for security reasons.
	*/
	decodeEntities: (function () {
		var decodeHTMLEntities;
		if (typeof document !== "undefined") {
			// this prevents any overhead from creating the object each time
			var element = document.createElement('div');

			decodeHTMLEntities = function (str) {
				if (str && typeof str === 'string') {
					// strip script/html tags
					str = str.replace(/</gmi, '&gt;');
					str = str.replace(/>/gmi, '&lt;');
					element.innerHTML = str;

					if (typeof element.textContent === "undefined") {
						str = element.innerText;
						element.innerText = '';
					} else {
						str = element.textContent;
						element.textContent = '';
					}
				}

				return str;
			};
		} else {
			decodeHTMLEntities = function () {
				return "Document is not defined!";
			};
		}

		return decodeHTMLEntities;
	}()),

	/** is data an integer?
	* @param data value to check for int value
	* @return bool is integer?
	*/
	isInt: function (data) {
		var y = parseInt(data, 10);
		if (isNaN(y)) {
			return false;
		}
		return y.toString() === data.toString();
	},

	/** is data an id?*/
	isID: function (data) {
		if (helper.isInt(data)) {
			data = parseInt(data, 10);

			return (data > 0);
		}

		return false;
	},

	isRealID: function (data) {
		var parts = data.split(":");

		if (parts.length !== 2) {
			return false;
		}

		if (parts[1].length !== 64) {
			return false;
		}

		if (!helper.isNickname(parts[0]) && !helper.isMail(parts[0])) {
			return false;
		}

		return true;
	},

	/** is data a valid nickname? */
	isNickname: function (data) {
		return (helper.isString(data) && !!data.match(/^[A-z][A-z0-9]*$/));
	},

	/** is data an e-mail? */
	isMail: function (data) {
		return (helper.isString(data) && !!data.match(/^[A-Z0-9._%\-]+@[A-Z0-9.\-]+\.[A-Z]+$/i));
	},

	/** is data a session Key (hex value with certain length) */
	isSessionKey: function (data) {
		return (helper.isset(data) && (data.length === 64 || data.length === 32) && helper.isHex(data));
	},

	isPassword: function (data) {
		return (data.isHex(data) && data.length === 10);
	},

	isCurve: function (data) {
		if (data === "c256" || data === "256") {
			return true;
		}
		//TODO!
		return false;
	},

	isHex: function (data) {
		return (helper.isset(data) && !!data.match(/^[A-Fa-f0-9]*$/));
	},

	/** typeof val == object? */
	isObject: function (val) {
		return (typeof val === "object");
	},

	/** is val set (not null/undefined) */
	isString: function (val) {
		return (val !== undefined && val !== null && typeof val === "string");
	},

	/** is val set (not null/undefined) */
	isset: function (val) {
		return (val !== undefined && val !== null);
	},

	/** checks if an array is set and attributes in that array are set.
	* @param arrayName the array to check
	* @param other attributes to check for
	* checks if arrayName[1][2][3][4]... is set where 1-inf are the given attributes.
	* helper function
	* @author Nilos
	*/
	arraySet: function (arrayName) {
		var i = 1;
		var memory;
		if (helper.isset(arrayName)) {
			memory = arrayName;
		} else {
			return false;
		}

		for (i = 1; i < arguments.length; i += 1) {
			if (helper.isset(memory[arguments[i]])) {
				memory = memory[arguments[i]];
			} else {
				return false;
			}
		}

		return true;
	},



	/** step function
	* throws given errors
	* passes on all other stuff to given function
	*/
	sF: function (cb) {
		var toCall = function sF(err) {
			if (err) {
				if (helper.log || true) {
					console.log(err.stack);
				}
				throw err;
			}

			var args = []; // empty array
			var i;
			// copy all other arguments we want to "pass through"
			for (i = 1; i < arguments.length; i += 1) {
				args.push(arguments[i]);
			}

			cb.apply(this, args);
		};

		toCall.getRealFunction = function () {
			return cb;
		};

		toCall.getName = function () {
			if (typeof cb === "function") {
				if (typeof cb.getName === "function") {
					return cb.getName();
				}

				return cb.name;
			}

			return "helper.sF";
		};

		return toCall;
	},
	firstCapital: function (string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
};

// Hook into commonJS module systems
if (typeof module !== 'undefined' && module.hasOwnProperty("exports")) {
	module.exports = helper;
}

if (typeof require === "function") {
	step = require("step");	
}

if (typeof define !== 'undefined') {
	define(['step'], function (s) {
		step = s;

		return helper;
	});
}