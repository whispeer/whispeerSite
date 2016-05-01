define(["crypto/objectHasher"], function (ObjectHasher) {
	"use strict";

	/* jshint quotmark: false */

	describe("Version 4 Stringify with", function() {
		it("empty object", function() {
			var result = new ObjectHasher({}, 4).stringify();

			expect(result).toEqual('["obj","",[]]');
		});

		it("empty array", function() {
			var result = new ObjectHasher([], 4).stringify();

			expect(result).toEqual('["arr","",[]]');
		});

		it("simple object", function() {
			var result = new ObjectHasher({a: "test"}, 4).stringify();

			expect(result).toEqual('["obj","",[["val","a","test"]]]');
		});

		it("sorts attributes object", function() {
			var result = new ObjectHasher({b: "a", a: "b"}, 4).stringify();

			expect(result).toEqual('["obj","",[["val","a","b"],["val","b","a"]]]');
		});

		it("complex object", function() {
			var result = new ObjectHasher({
				b: {"test": "bla", "dud": "dadam"},
				a: {
					b: {
						c: {
							d: "tata"
						}
					}
				}
			}, 4).stringify();

			var expected = '["obj","",[["obj","a",[["obj","b",[["obj","c",[["val","d","tata"]]]]]]],["obj","b",[["val","dud","dadam"],["val","test","bla"]]]]]';

			expect(result).toEqual(expected);
		});

		it("stringifies values", function() {
			var result = new ObjectHasher({b: 5}, 4).stringify();

			expect(result).toEqual('["obj","",[["val","b","5"]]]');
		});
	});

});
