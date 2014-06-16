define([], function () {
	function extendError(parentErrorClass) {
		if (parentErrorClass.prototype instanceof Error || parentErrorClass === Error) {
			var F = function(){};
			var CustomError = function() {
				var _this = (this===window) ? new F() : this, // correct if not called with "new" 
					tmp = parentErrorClass.prototype.constructor.apply(_this,arguments);

				for (var i in tmp) {
					if (tmp.hasOwnProperty(i)) _this[i] = tmp[i];
				}
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

	var InvalidDataError = extendError(Error);
	var InvalidHexError = extendError(InvalidDataError);
	var InvalidFilter = extendError(InvalidDataError);

	var SecurityError = extendError(Error);
	var AccessViolation = extendError(SecurityError);
	var DecryptionError = extendError(SecurityError);
	var ValidationError = extendError(SecurityError);


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