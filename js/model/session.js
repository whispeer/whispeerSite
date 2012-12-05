define(['display', 'model/storage'], function (display, storage) {
	/** register started? are we generating keys? */
	var isRegisterStarted = false;
	var listeners = [];

	var privateKey = null;
	var publicKey = null;

	/** user loged in? */
	var logedin = false;
	/** loged in user identifier */
	var identifier = "";
	/** loged in users password */
	var password = "";
	/** session id for currently loged in user */
	var session = "";
	/** key of currently logged in user */
	var key = null;
	/** main symmetric key of currently logged in user */
	var mainKey = null;

	var session = {
		storageAvailable: function () {
			return storage.available;
		},

		logedin: function () {
			return logedin;
		}
	};

	return session;
});