define([], function () {
	"use strict";
	function extendError(parentErrorClass, name) {
		if (parentErrorClass.prototype instanceof Error || parentErrorClass === Error) {
			var F = function(){};
			var CustomError = function() {
				var _this = (this===window) ? new F() : this, // correct if not called with "new" 
					tmp = parentErrorClass.prototype.constructor.apply(_this,arguments);

				_this.stack = tmp.stack;
				_this.message = tmp.message;
				_this.name = name;

				return _this;
			};
			var SubClass = function (){};
			SubClass.prototype = parentErrorClass.prototype;
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


	return {
		SecurityError: SecurityError,
		AccessViolation: AccessViolation,
		DecryptionError: DecryptionError,
		ValidationError: ValidationError,

		InvalidDataError: InvalidDataError,
		InvalidHexError: InvalidHexError,
		InvalidFilter: InvalidFilter
	};
});