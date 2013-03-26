define([], function () {
	var keys = {};
	var passwords = [];

	var keyStore = {
		encrypt: function (text, keyID) {
		
		},
		
		decrypt: function (ctext, keyID) {
		
		},
		
		reset: function () {
			keys = {};
			passwords = [];
		},
		
		generateKey: function (parentKeyID) {
		
		}
	};
	
	
	return keyStore;
});