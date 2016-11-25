define([], function () {
	"use strict";
	function extendError(ParentErrorClass, name) {
		if (ParentErrorClass.prototype instanceof Error || ParentErrorClass === Error) {
			var F = function(){};
			var CustomError = function(message, data) {
				var _this = this;

				var tmp = new ParentErrorClass(message);
				tmp.name = this.name = name || "Error";

				_this.data = data;
				_this.stack = tmp.stack;
				_this.message = tmp.message;
				_this.name = name;

				return _this;
			};
			var SubClass = function (){};
			SubClass.prototype = ParentErrorClass.prototype;
			F.prototype = CustomError.prototype = new SubClass();
			CustomError.prototype.constructor = CustomError;

			return CustomError;
		} else {
			throw new Error("our error should inherit from error!");
		}
	}

	var InvalidDataError = extendError(Error, "InvalidDataError");
	var InvalidHexError = extendError(InvalidDataError, "InvalidHexError");
	var InvalidFilter = extendError(InvalidDataError, "InvalidFilter");

	var SecurityError = extendError(Error, "SecurityError");
	var AccessViolation = extendError(SecurityError, "AccessViolation");
	var DecryptionError = extendError(SecurityError, "DecryptionError");
	var ValidationError = extendError(SecurityError, "ValidationError");

	var LoginError = extendError(Error, "LoginError");

	return {
		SecurityError: SecurityError,
		AccessViolation: AccessViolation,
		DecryptionError: DecryptionError,
		ValidationError: ValidationError,

		InvalidDataError: InvalidDataError,
		InvalidHexError: InvalidHexError,
		InvalidFilter: InvalidFilter,

		LoginError: LoginError,
	};
});
