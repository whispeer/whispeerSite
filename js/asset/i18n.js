var preLoad = ['i18n!nls/errors', 'i18n!nls/warnings'];
define(['asset/logger', 'asset/helper', 'libs/step'].concat(preLoad), function (logger, h, step) {
	"use strict";

	var i18n = {
		locales: {},
		/** load a certain local topic
		* @param topic topic to load
		* @param cb callback to call onload
		*/
		loadLocale: function (topic, cb) {
			step(function checkLoaded() {
				if (i18n.locales[topic]) {
					this.last();
				} else {
					this();
				}
			}, h.sF(function loadLocale() {
				require.wrap('i18n!nls/' + topic, this);
			}), h.sF(function (local) {
				i18n.locales[topic] = local;
				this();
			}), cb);
		},
		/** translate elements in ele
		* loops through the child elements of the element
		* @param ele element to translate
		*/
		translate: function (ele) {
			//TODO
			//child.each
		},
		/** get the value of a translation.
		* @param val value to get. Is split on dots to determine topic
		*/
		getValue: function (val) {
			//TODO
			if (typeof this.translations[val] === "undefined") {
				logger.log("unset translation:" + val);
				return "";
			}

			var result = h.decodeEntities(translation.translations[val]);

			var i = 1;
			for (i = 1; i < arguments.length; i += 1) {
				result = result.replace(new RegExp("&" + i + ";", "g"), arguments[i]);
			}

			var suche = /&\d;/g;
			if (suche.test(result)) {
				logger.log("Problematic Translation: " + val + " - " + result);
			}

			result = result.replace(suche, "");

			return result;
		}
	};

	var i;
	for (i = 0; i < preLoad.length; i += 1) {
		var theLocale = arguments[i+3];
		//TODO
		//var localeName = preLoad[i].
	}

	return i18n;
});