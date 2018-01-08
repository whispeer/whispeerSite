console.warn(`Whispeer startup at ${Date.now()}`)
console.time("Spinner on Home")

const errorService = require("./error.service").errorServiceInstance;
const keyStore = require("crypto/keyStore");

const debug = require("debug");
const Observer = require("asset/observer");
const Bluebird = require("bluebird");

const sessionService = require("services/session.service").default;

const debugName = "whispeer:initService";

function time(name) {
	if (debug.enabled(debugName)) {
		console.time("init: " + name);
	}
}

function timeEnd(name) {
	if (debug.enabled(debugName)) {
		console.timeEnd("init: " + name);
	}
}

var initCallbacks = [], initService;

function loadData() {
	keyStore.security.blockPrivateActions();

	var promise = Bluebird.resolve().then(() => {
		time("runInitCallbacks");
		return Bluebird.all(initCallbacks.map((func) => func()))
	}).then(function () {
		timeEnd("runInitCallbacks");
		keyStore.security.allowPrivateActions();

		var migrationService = require("services/migrationService");
		migrationService();
		initService.notify("", "initDone");
		return null;
	});

	promise.catch(errorService.criticalError);

	return promise;
}

var loadingPromise = sessionService.awaitLogin().then(function () {
	return loadData();
});

initService = {
	/** get via api, also check cache in before!
	* @param domain: domain to get from
	*/
	awaitLoading: function () {
		return loadingPromise
	},
	registerCallback: function (cb) {
		initCallbacks.push(cb);
	}
};

Observer.extend(initService);

module.exports = initService;
