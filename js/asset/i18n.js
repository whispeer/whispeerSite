define(['jquery', 'asset/logger', 'asset/helper', 'libs/step'], function ($, logger, h, step) {
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
			}), h.sF(function localLoaded(local) {
				i18n.locales[topic] = local;
				this();
			}), cb);
		},
		/** translate elements in ele
		* loops through the child elements of the element
		* @param ele element to translate
		*/
		translate: function (ele) {
			ele.find("[i18n]").each(function (nop, sub) {
				sub = $(sub);

				sub.text(i18n.getValue(sub.attr("i18n")));
			});
		},
		/** get the value of a translation.
		* @param val value to get. Is split on dots to determine topic
		*/
		getValue: function (val) {
			var vals = val.split(".");
			var topic = vals[0];
			var value = vals[1];

			if (!h.arraySet(i18n.locales, topic, value)) {
				logger.log("unset translation:" + val);
				return "";
			}

			var result = i18n.locales[topic][value];

			result = h.decodeEntities(result);

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

	return {
		load: function (name, req, onLoad) {
			step(function load() {
				var names = name.split(";");

				var i;
				for (i = 0; i < names.length; i += 1) {
					i18n.loadLocale(names[i], this.parallel());
				}
			}, function i18nLoaded(err) {
				if (err) {
					logger.log(err);
				}

				this(i18n);
			}, onLoad);
		}
	};
});