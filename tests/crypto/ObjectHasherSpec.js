define(["crypto/objectHasher"], function (ObjectHasher) {
	"use strict";

	/* jshint quotmark: false */

	describe("Version 4 Stringify with", function() {
		it("empty object", function() {
			var result = new ObjectHasher({}, 4).stringify();

			expect(result).toEqual('["obj",[]]');
		});

		it("empty array", function() {
			var result = new ObjectHasher([], 4).stringify();

			expect(result).toEqual('["arr",[]]');
		});

		it("simple object", function() {
			var result = new ObjectHasher({a: "test"}, 4).stringify();

			expect(result).toEqual('["obj",[["val","a","test"]]]');
		});

		it("sorts attributes object", function() {
			var result = new ObjectHasher({b: "a", a: "b"}, 4).stringify();

			expect(result).toEqual('["obj",[["val","a","b"],["val","b","a"]]]');
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

			var expected = '["obj",[["obj","a",[["obj","b",[["obj","c",[["val","d","tata"]]]]]]],["obj","b",[["val","dud","dadam"],["val","test","bla"]]]]]';

			expect(result).toEqual(expected);
		});

		it("stringifies values", function() {
			var result = new ObjectHasher({b: 5}, 4).stringify();

			expect(result).toEqual('["obj",[["val","b","5"]]]');
		});

		it("transforms array values", function() {
			var result = new ObjectHasher([{a: "b"}], 4).stringify();

			expect(result).toEqual('["arr",[["obj",[["val","a","b"]]]]]');
		});
	});

	describe("version 3", function () {
		it ("does not change empty objects", function () {
			var result = new ObjectHasher({}, 3).stringify();

			expect(result).toEqual('{}');
		});

		it ("does not change empty array", function () {
			var result = new ObjectHasher([], 3).stringify();

			expect(result).toEqual('[]');
		});

		it ("stringifies values", function () {
			var result = new ObjectHasher({a: 5}, 3).stringify();

			expect(result).toEqual('{"a":"5"}');
		});

		it ("sorts values", function () {
			var result = new ObjectHasher({b: "a", a: "b"}, 3).stringify();

			expect(result).toEqual('{"a":"b","b":"a"}');
		});

		it ("stringifies sub objects", function () {
			var result = new ObjectHasher({a: {b: "c"}}, 3).stringify();

			expect(result).toEqual('{"a":"{\\"b\\":\\"c\\"}"}');
		});

		it ("sorts attributes of sub objects", function () {
			var result = new ObjectHasher({a: {b: "c", a: "c"}}, 3).stringify();

			expect(result).toEqual('{"a":"{\\"a\\":\\"c\\",\\"b\\":\\"c\\"}"}');
		});
	});

});
