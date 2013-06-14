/*
Copyright (c) 2012 Nils Kenneweg <beamgeraet@web.de>

Updated to my needs. Refactoring, JSLint Conformity.

Copyright (c) 2011 Tim Caswell <tim@creationix.com>

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// Inspired by http://github.com/willconant/flow-js, but reimplemented and
// modified to fit my taste and the node.JS error handling system.
function step() {
	function l0(number, count) {
		number = number + "";

		while (number.length < count) {
			number = "0" + number;
		}

		return number;
	}

	"use strict";

	var steps = Array.prototype.slice.call(arguments),
		pending = 0,
		counter = 0,
		results = [],
		lock = false,
		timing = step.timing,
		start = new Date().getTime(),
		previousTime = start,
		id = Math.floor(Math.random() * 100000);

	// Define the main callback that's given as `this` to the steps.
	function next(err) {
		counter = pending = 0;

		// Check if there are no steps left
		if (steps.length === 0) {
			// Throw uncaught errors
			if (typeof err !== "undefined") {
				throw err;
			}
			return;
		}

		// Get the next step to execute
		var fn = steps.shift();

		if (timing) {
			var functions = [fn];
			var theFunction = fn;
			var timingC = 0;
			while (typeof theFunction !== "undefined" && typeof theFunction.getRealFunction === "function" && timingC < 5) {
				functions.push(theFunction.getRealFunction());
				timingC += 1;

				theFunction = theFunction.getRealFunction();
			}

			var name = "", i;
			for (i = 0; i < functions.length; i += 1) {
				if (typeof functions[i] !== "undefined") {
					name = name + ":" + functions[i].name;
				} else {
					console.log(functions);
				}
			}

			var currentTime = new Date().getTime();
			console.log("" + l0(currentTime - start, 4) + ": Steper [" + l0(id, 5) + "] (" + l0(steps.length, 2) + "): " + name + " (" + (currentTime - previousTime) + ") ");
			previousTime = currentTime;
			//console.log(functions[functions.length - 1]);
		}

		results = [];

		if (typeof fn !== "function") {
			console.trace();
			next(new Error("Not a callable Function!"));
		}

		var result;
		// Run the step in a try..catch block so exceptions don't get out of hand.
		try {
			lock = true;
			result = fn.apply(next, arguments);
		} catch (e) {
			// Pass any exceptions on through the next callback
			next(e);
		}

		if (counter > 0 && pending === 0) {
			if (typeof process !== "undefined") {
				process.nextTick(function () {
					// If parallel() was called, and all parallel branches executed
					// syncronously, go on to the next step immediately.
					next.apply(null, results);
				});
			} else {
				next.apply(null, results);
			}
		} else if (typeof result !== "undefined") {
			if (typeof process !== "undefined") {
				process.nextTick(function () {
					// If a syncronous return is used, pass it to the callback
					next(undefined, result);
				});
			} else {
				next(undefined, result);
			}
		}
		lock = false;
	}

	next.getRealFunction = function () {
		if (typeof steps[0] === "function") {
			return steps[0];
		}
	};

	/** just call the next argument with null as the first value
	* makes it easier to highlight that no error should be passed
	*/
	next.ne = function () {
		var rArgs = Array.prototype.slice.call(arguments);
		rArgs.unshift(null);

		next.apply(null, rArgs);
	};

	/** just skip all calls and go directly to the last callback */
	next.last = function () {
		while (steps.length > 1) {
			steps.shift();
		}

		next.apply(null, arguments);
	};

	/** skip all calls and go directly to the last callback and add no error */
	next.last.ne = function () {
		var rArgs = Array.prototype.slice.call(arguments);
		rArgs.unshift(null);

		next.last.apply(null, rArgs);
	};

	/** skip a certain number of callbacks
	* @param remove number of callbacks to skip
	* @return function to call
	*/
	next.skip = function (remove) {
		return function () {
			var i;
			for (i = 0; i < remove; i += 1) {
				steps.shift();
			}

			next.apply(null, arguments);
		};
	};

	// Add a special callback generator `this.parallel()` that groups stuff.
	next.parallel = function () {
		var index = counter;
		counter += 1;
		pending += 1;

		var parallelFunction = function (err) {
			pending -= 1;
			// Compress the error from any result to the first argument
			if (typeof err !== "undefined") {
				results[0] = err;
			}
			// Send the other results as arguments

			var i = 1;
			for (i = 1; i < arguments.length; i += 1) {
				if (typeof results[i] === "undefined") {
					results[i] = [];
				}

				results[i][index] = arguments[i];
			}

			if (!lock && pending === 0) {
				// When all parallel branches done, call the callback
				next.apply(null, results);
			}
		};
		parallelFunction.getRealFunction = function () {
			if (typeof steps[0] === "function") {
				return steps[0];
			}
		};

		return parallelFunction;
	};

	// Start the engine and pass nothing to the first step.
	next();
}

// Tack on leading and tailing steps for input and output and return
// the whole thing as a function.  Basically turns step calls into function
// factories.
step.fn = function StepFn() {
	"use strict";
	var steps = Array.prototype.slice.call(arguments);
	return function () {
		var args = Array.prototype.slice.call(arguments);

		// Insert a first step that primes the data stream
		var toRun = [function () {
				this.apply(null, args);
			}].concat(steps);

		// If the last arg is a function add it as a last step
		if (typeof args[args.length - 1] === 'function') {
			toRun.push(args.pop());
		}

		step.apply(null, toRun);
	};
};


step.startTiming = function () {
	"use strict";
	step.timing = true;
};

step.stopTiming = function () {
	"use strict";
	step.timing = false;
};

step.timing = true;

// Hook into commonJS module systems
if (typeof module !== 'undefined' && module.hasOwnProperty("exports")) {
	module.exports = step;
}

if (typeof define !== 'undefined') {
	define([], function () {
		"use strict";
		return step;
	});
}