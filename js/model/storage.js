"use strict";
define([], function () {
	/** localStorage wrapper */
	var storage = {
		/** is localStorag available? */
		available: false,
		/** onload */
		load: function () {
			this.available = Modernizr.localstorage;
		},

		/** set the value of an item 
		* @param name key to set
		* @param value value to set to
		* @author Nilos
		*/
		setItem: function (name, value) {
			if (this.available) {
				localStorage.setItem(name, value);
				return true;
			}

			return false;
		},

		/** get an item from localStorage
		* @param name name of the item
		* @author Nilos
		*/
		getItem: function (name) {
			if (this.available) {
				return localStorage.getItem(name);
			}
		},

		/** remove an item from localstorage
		* @param name key of item to remove
		* @author Nilos
		*/
		removeItem: function (name) {
			if (this.available) {
				return localStorage.removeItem(name);
			}
		},

		/** clear localStorage - remove all items */
		clear: function () {
			localStorage.clear();
		}
	};

	storage.load();

	return storage;
});