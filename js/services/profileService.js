/**
* ProfileService
**/
define(['crypto/keyStore'], function (keyStore) {
	"use strict";

	var service = function () {
		var validAttributes = {
			basic: {
				iv: false,
				firstName: true,
				lastName: true,
				birthday: function (val) {
					if (isNaN(Date.parse(val))) {
						return false;
					}

					return true;
				}
			}
		};

		function checkValid(data, checkValues) {
			var topic, attribute;
			for (topic in data) {
				if (data.hasOwnProperty(topic)) {
					if (!validAttributes[topic]) {
						throw "invalid profile data - invalid topic: " + topic;
					}

					for (attribute in data[topic]) {
						if (data[topic].hasOwnProperty(attribute)) {
							var cur = validAttributes[topic][attribute];
							if (checkValues) {
								if (typeof cur === "function") {
									if (cur(data[topic][attribute]) === true) {
										return true;
									}
								} else if (typeof cur === "boolean") {
									if (cur === true) {
										return true;
									}
								} else if (typeof cur === "object" && cur instanceof RegExp) {
									if (cur.match(data[topic][attribute])) {
										return true;
									}
								}
							} else {
								if (cur) {
									return true;
								}
							}

							console.log("invalid profile data - invalid attribute: " + attribute);
							data[topic][attribute] = false;
						}
					}
				}
			}
		}

		//where should the key go? should it be next to the data?
		var profileService = function (data) {
			var dataEncrypted, dataDecrypted, decrypted;

			if (data.iv) {
				dataEncrypted = data;
				decrypted = false;

				checkValid(data, false);
			} else {
				dataDecrypted = data;
				decrypted = true;

				checkValid(data, true);
			}

			this.encrypt = function encryptProfileF(key, callback) {
				step(function () {
					keyStore.sym.encryptObject(data, key, this);
				}, h.sF(function (result) {
					dataEncrypted = result;
					this.ne(result);
				}), callback);
			};

			this.decrypt = function decryptProfileF(callback) {
				step(function () {
					keyStore.sym.decryptObject(data, this);
				}, h.sF(function (result) {
					dataDecrypted = result;
					decrypted = true;
					checkValid(data, true);
					this.ne(result);
				}), callback);
			};
		};

		profileService.encryptProfile = function encryptProfileF(data) {
			checkValid(data);
		};
	};

	service.$inject = [];

	return service;
});