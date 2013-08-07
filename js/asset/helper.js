"use strict";

var step;

/** contains general helper functions */
var helper = {
	/** to disable logging (console.log) which is necessary because logger.js depends on helper */
	log: true,

	deepGet: function (obj, key) {
		var i;
		var cur = obj;
		for (i = 0; i < key.length; i += 1) {
			if (cur[key[i]]) {
				cur = cur[key[i]];
			} else {
				return false;
			}
		}

		return cur;
	},

	validateObjects: function validateObjectsF(reference, data, noValueCheck) {
		var key;
		for (key in data) {
			if (data.hasOwnProperty(key)) {
				if (!reference[key]) {
					return false;
				}

				if (!noValueCheck) {
					if (typeof reference[key] === "object") {
						if (!helper.validateObjects(reference[key], data[key])) {
							return false;
						}
					} else if (typeof reference[key] === "function") {
						if (!reference[key](data[key])) {
							return false;
						}
					} else if (reference[key] !== true) {
						return false;
					}
				}
			}
		}

		return true;
	},

	deepSet: function (obj, key, val) {
		var i;
		var cur = obj;
		for (i = 0; i < key.length - 1; i += 1) {
			if (!cur[key[i]]) {
				cur[key[i]] = {};
			}

			cur = cur[key[i]];
		}

		cur[key[key.length - 1]] = val;
	},

	/** chars for a sid */
	codeChars: ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P", "A", "S", "D", "F", "G", "H", "J", "K", "L", "Y", "X", "C", "V", "B", "N", "M", "q", "w", "e", "r", "t", "z", "u", "i", "o", "p", "a", "s", "d", "f", "g", "h", "j", "k", "l", "y", "x", "c", "v", "b", "n", "m", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
	/** get a random sid of given length 
	* @param length length of sid
	* @param callback callback
	* @callback (error, sid)
	*/
	code: function (length, callback) {
		var random = require("secure_random");

		step(function generateRandom() {
			if (length <= 0) {
				throw new Error("length not long enough");
			}

			var i = 0;
			for (i = 0; i < length; i += 1) {
				random.getRandomInt(0, helper.codeChars.length - 1, this.parallel());
			}

			return;
		}, function (err, numbers) {
			if (err) {
				callback(err);
				return;
			}

			var result = "", i = 0;

			for (i = 0; i < numbers.length; i += 1) {
				result = result + helper.codeChars[numbers[i]];
			}

			callback(null, result);
		});
	},

	/** get a file names extension */
	getExtension: function (filename) {
		var i = filename.lastIndexOf(".");
		return (i < 0) ? "" : filename.substr(i);
	},

	/** get a filenames name */
	getName: function (filename) {
		var i = filename.lastIndexOf(".");
		return (i < 0) ? filename : filename.substr(0, i);
	},

	/** just a function which moves on in step */
	passFunction: function () {
		this.apply(null, arguments);
	},
	/** order a certain ass-array correctly
	* @param object object to sort
	* @param order correct order (normal array)
	* @param getFunction which func to call on objects to get their "value"
	* @return ordered object
	*/
	orderCorrectly: function (object, order, getFunction) {
		var i, j, results = [];
		for (i = 0; i < order.length; i += 1) {
			for (j = 0; j < object.length; j += 1) {
				if (object[j][getFunction]() === order[i]) {
					results.push(object[j]);

					object.splice(j, 1);

					break;
				}
			}
		}

		return results;
	},
	/** decode an EncryptedSignedMessage */
	decodeESM: function (esm) {
		var result = {};
		result.m = helper.base64ToHex(esm.m);
		result.s = helper.base64ToHex(esm.s);
		result.iv = helper.base64ToHex(esm.iv);

		return result;
	},

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
		return (helper.isString(data) && data.length !== 0 && !!data.match(/^[A-z][A-z0-9]*$/));
	},

	/** is data an e-mail? */
	isMail: function (data) {
		return (helper.isString(data) && data.length !== 0 && !!data.match(/^[A-Z0-9._%\-]+@[A-Z0-9.\-]+\.[A-Z]+$/i));
	},

	/** is data a session Key (hex value with certain length) */
	isSessionKey: function (data) {
		return (helper.isset(data) && (data.length === 64 || data.length === 32) && helper.isHex(data));
	},

	isPassword: function (data) {
		return (helper.isHex(data) && data.length === 10);
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
		var mysf = function sfFunction(err) {
			if (err) {
				if (helper.log || false) {
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

		mysf.getRealFunction = function () {
			return cb;
		};

		return mysf;
	},

	/** handle Error function for step
	* passes given errors to callback but only those!
	* throws other errors.
	*/
	hE: function (cb, errors) {
		function throwCertainError(err, type) {
			if (!err instanceof type) {
				return true;
			}
		}

		return function (err) {
			if (err) {
				console.log(err);

				if (errors instanceof Array) {
					var doThrow = true;
					var i;
					for (i = 0; i < errors.length; i += 1) {
						if (throwCertainError(err, errors[i])) {
							doThrow = false;
						}
					}

					if (doThrow) {
						throw err;
					}
				} else {
					if (throwCertainError(err, errors)) {
						throw err;
					}
				}
			}

			cb.apply(this, arguments);
		};
	},

	/** is needle in haystack? */
	inArray: function (haystack, needle) {
		var i = 0;
		for (i = 0; i < haystack.length; i += 1) {
			if (haystack[i] === needle) {
				return true;
			}
		}

		return false;
	},

	firstCapital: function (string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
};

// Hook into commonJS module systems
if (typeof module !== "undefined" && module.hasOwnProperty("exports")) {
	module.exports = helper;
}

if (typeof require === "function") {
	step = require("step");
}

if (typeof define !== "undefined") {
	define(["step"], function (s) {
		step = s;

		return helper;
	});
}