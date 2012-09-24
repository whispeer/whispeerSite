"use strict";

if (typeof (ssn) === "undefined") {
	var ssn = {};
}

ssn.exception = {
	/** exception for not having a private key */
	needPrivateKey: function (message) {
		this.toString = function () { return "Not A Private Key: " + this.message; };
		this.message = message;
	},
	/** user is not existing exception */
	userNotExisting: function (message) {
		this.toString = function () { return "User not Existing: " + this.message; };
		this.message = message;
	},
	/** exception for a message not existing */
	messageNotFound: function (message) {
		this.toString = function () { return "Message not Existing: " + this.message; };
		this.message = message;
	},
	/** exception if a user identifier is invalid */
	invalidUserIdentifier: function (message) {
		this.toString = function () { return "invalid user identifier: " + this.message; };
		this.message = message;
	}
};