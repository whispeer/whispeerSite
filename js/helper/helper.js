"use strict";
define([], function () {
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

		/** is data an id?
		* @param data data to check for being an id
		* @author Nilos
		*/
		isID: function (data) {
			return ssn.helper.isInt(data);
		},

		setKey: function (keyType, key, receiverID, receiverKey, own, callback) {
			key = key.getEncrypted(ssn.session.key);

			var setKey = {
				"type": keyType,
				"key": key,
				"receiver": receiverID,
				"own": own
			};

			ssn.crypto.signText(ssn.session.key, $.toJSON(setKey), function (s) {
				setKey.s = s;
				ssn.helper.getData({"setKey": setKey}, callback);
			});
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
			return data.match(/^[A-z][A-z0-9]*$/);
		},

		/** is data a mail? */
		isMail: function (data) {
			return data.match(/^[A-Z0-9._%\-]+@[A-Z0-9.\-]+\.[A-Z]+$/i);
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
			if (ssn.helper.isset(arrayName)) {
				memory = arrayName;
			} else {
				return false;
			}

			for (i = 1; i < arguments.length; i += 1) {
				if (ssn.helper.isset(memory[arguments[i]])) {
					memory = memory[arguments[i]];
				} else {
					return false;
				}
			}

			return true;
		},

		/** connects an asymmetrically encrypted key with its symmetrically encrypted counterpart 
		* @param asymKey object for the asymmetric key to encrytp symmetrically
		* @author Nilos
		*/
		setSymAsymKey: function (asymKey) {
			ssn.crypto.waitForReady(function () {
				asymKey.decryptKey(ssn.session.key, function () {
					var asymKeyE = asymKey.getOriginal();
					var symKeyE = $.parseJSON(asymKey.getEncrypted(ssn.session.getMainKey()));
					ssn.helper.getData({"setSymAsymKey": {"asymKey": asymKeyE, "symKey": symKeyE}}, function () {});
				});
			});
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
			if (typeof data !== "object") {
				data = $.parseJSON(data);
			}

			if (ssn.session.logedin) {
				data.sid = ssn.session.getSID();
			}

			var isLogout = false;
			if (typeof data.logout !== "undefined") {
				isLogout = true;
			}

			$.ajax({
				type: "POST",
				url: "api/getData.php",
				data: "data=" + encodeURIComponent($.toJSON(data)),
				error: function (obj, error) {
					ssn.display.ajaxError(obj, error);
				},
				success: function (data) {
					data = $.parseJSON(data);
					if (data.logedin === 0) {
						if (!isLogout) {
							ssn.display.showWarning("Du wurdest automatisch ausgeloggt");
							ssn.session.logout();
						} else {
							ssn.display.showWarning("Du wurdest ausgeloggt");
						}

						return;
					}

					if (data.status === 0) {
						ssn.display.ajaxError();
						return;
					}

					if (typeof callback !== "undefined") {
						try {
							callback(data);
						} catch (e) {
							ssn.logger.log(e);
							throw e;
						}
					}
				}
			});
		},
		/** step function
		* throws given errors
		* passes on all other stuff to given function
		*/
		sF: function (cb) {
			return function (err) {
				if (err) {
					if (helper.log) {
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
		}
	};

	return helper;
});