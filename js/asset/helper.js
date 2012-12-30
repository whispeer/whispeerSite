define(['jquery', 'libs/step'], function ($, step) {
	"use strict";
	var helper = {
		/** is data a numeric?
		* @param data data to check for being numeric
		* @author Nilos
		*/
		isInt: function (data) {
			var y = parseInt(data, 10);
			if (isNaN(y)) {
				return false;
			}
			return y.toString() === data.toString();
		},

		callback: function (c) {
			if (typeof c !== "function") {
				console.trace();
				throw new Error("not a callback function");
			}
		},

		/** connects an asymmetrically encrypted key with its symmetrically encrypted counterpart 
		* @param asymKey object for the asymmetric key to encrytp symmetrically
		* @author Nilos
		*/
		setSymAsymKey: function (asymKey) {
			var session;
			step(function () {
				require.wrap(["crypto/waitForReadyDisplay", "model/session"], this);
			}, helper.sF(function (waitForReady, s) {
				session = s;
				waitForReady(this);
			}), helper.sF(function () {
				asymKey.decryptKey(session.getKey(), this);
			}), helper.sF(function () {
				asymKey.getEncrypted(session.getMainKey(), this);
			}), helper.sF(function (symKeyE) {
				var asymKeyE = asymKey.getOriginal();
				symKeyE = $.parseJSON(symKeyE);
				helper.getData({"setSymAsymKey": {"asymKey": asymKeyE, "symKey": symKeyE}}, this);
			}), function (e) {
				console.log(e);
			});
		},

		/** is data an id?
		* @param data data to check for being an id
		* @author Nilos
		*/
		isID: function (data) {
			return helper.isInt(data);
		},

		ajax: function (data, cb) {
			data.success = function (data) {
				cb(null, data);
			};

			data.error = function (obj, error) {
				cb(error);
			};

			$.ajax(data);
		},

		/** decode entities
		* @param str string to decode
		* @author Nilos
		* this is wrapped to remove overhead.
		* < and > are removed for security reasons.
		*/
		decodeEntities: (function () {
			// this prevents any overhead from creating the object each time
			var element = document.createElement('div');

			function decodeHTMLEntities(str) {
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
			}

			return decodeHTMLEntities;
		}()),

		/** is data a nickname? */
		isNickname: function (data) {
			if (typeof data === "string") {
				return data.match(/^[A-z][A-z0-9]*$/);
			}

			return false;
		},

		/** is data a mail? */
		isMail: function (data) {
			if (typeof data === "string") {
				return data.match(/^[A-Z0-9._%\-]+@[A-Z0-9.\-]+\.[A-Z]+$/i);
			}

			return false;
		},

		/** is data a session key? */
		isSessionKey: function (data) {
			return (data.match(/^[A-z0-9]$/) && (data.length === 64 || data.length === 32));
		},

		/** is val an object? */
		isObject: function (val) {
			return (typeof val === "object");
		},

		/** is data set (not null and not undefined)? */
		isset: function (val) {
			return (typeof val !== "undefined" && val !== null);
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

		/** getData helper function.
		* Gets data from the server given a certain data object.
		* Transforms data object into json and requests data.
		* also automatically sets sid and calls logout if necessary.
		* @param data object for which data to get from server
		* @param callback function called when results are there
		* @author Nilos
		*/
		getData: function (data, callback) {
			var isLogout = false;
			var session;

			step(function () {
				require.wrap("model/session", this);
			}, helper.sF(function (s) {
				session = s;
				if (typeof data !== "object") {
					data = $.parseJSON(data);
				}

				if (session.logedin()) {
					data.sid = session.getSID();
				}

				if (typeof data.logout !== "undefined") {
					isLogout = true;
				}

				helper.ajax({
					type: "POST",
					url: "api/getData.php",
					data: "data=" + encodeURIComponent($.toJSON(data))
				}, this);
			}), helper.sF(function (data) {
				data = $.parseJSON(data);
				if (data.logedin === 0) {
					if (!isLogout) {
						session.autologout();
					}

					return;
				}

				if (data.status === 0) {
					throw new Error("Server Error");
				}

				this(null, data);
			}), callback);
		},

		/** step function
		* throws given errors
		* passes on all other stuff to given function
		*/
		sF: function (cb) {
			var toCall = function (err) {
				if (err) {
					if (helper.log || true) {
						console.log(err);
						console.trace();
					}
					throw err;
				}

				var args = []; // empty array
				var i = 1;
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

	return helper;
});