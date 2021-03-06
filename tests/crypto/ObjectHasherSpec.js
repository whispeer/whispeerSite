define(["crypto/objectHasher", "text!../../tests/crypto/bigObject.txt", "text!../../tests/crypto/bigObjectV3.txt", "text!../../tests/crypto/bigObjectV4.txt"], function (ObjectHasher, bigObjectString, bigObjectStringV3, bigObjectStringV4) {
	"use strict";

	bigObjectString  = bigObjectString.replace("\n", "");
	bigObjectStringV3 = bigObjectStringV3.replace("\n", "");
	bigObjectStringV4 = bigObjectStringV4.replace("\n", "");

	console.log(bigObjectStringV3.length);
	console.log(bigObjectStringV4.length);

	var time;
	function now() {
		return new Date().getTime();
	}

	function timeStart() {
		time = now();
	}

	function timeEnd() {
		console.log(now() - time);
	}

	function bigObject() {
		return JSON.parse(bigObjectString);
	}

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

		it("big object", function() {
			var obj = bigObject();

			timeStart();
			var result = new ObjectHasher(obj, 4).stringify();
			timeEnd();

			expect(result).toEqual(bigObjectStringV4);
		});
	});

	describe("version 3", function () {
		it("does not change empty objects", function () {
			var result = new ObjectHasher({}, 3).stringify();

			expect(result).toEqual('{}');
		});

		it("does not change empty array", function () {
			var result = new ObjectHasher([], 3).stringify();

			expect(result).toEqual('[]');
		});

		it("stringifies values", function () {
			var result = new ObjectHasher({a: 5}, 3).stringify();

			expect(result).toEqual('{"a":"5"}');
		});

		it("sorts values", function () {
			var result = new ObjectHasher({b: "a", a: "b"}, 3).stringify();

			expect(result).toEqual('{"a":"b","b":"a"}');
		});

		it("stringifies sub objects", function () {
			var result = new ObjectHasher({a: {b: "c"}}, 3).stringify();

			expect(result).toEqual('{"a":"{\\"b\\":\\"c\\"}"}');
		});

		it("sorts attributes of sub objects", function () {
			var result = new ObjectHasher({a: {b: "c", a: "c"}}, 3).stringify();

			expect(result).toEqual('{"a":"{\\"a\\":\\"c\\",\\"b\\":\\"c\\"}"}');
		});

		it("big object", function() {
			var obj = bigObject();

			timeStart();
			var result = new ObjectHasher(obj, 3).stringify();
			timeEnd();

			expect(result.length).toEqual(bigObjectStringV3.length);
		});
	});

	describe("version 2", function () {
		it("does not change empty objects", function () {
			var result = new ObjectHasher({}, 2).stringify();

			expect(result).toEqual('{}');
		});

		it("does not change empty array", function () {
			var result = new ObjectHasher([], 2).stringify();

			expect(result).toEqual('[]');
		});

		it("stringifies values", function () {
			var result = new ObjectHasher({a: 5}, 2).stringify();

			expect(result).toEqual('{"a":"5"}');
		});

		it("sorts values", function () {
			var result = new ObjectHasher({b: "a", a: "b"}, 2).stringify();

			expect(result).toEqual('{"a":"b","b":"a"}');
		});

		it("stringifies sub objects", function () {
			var result = new ObjectHasher({a: {b: "c"}}, 2).stringify();

			expect(result).toEqual('{"a":"hash::8e381f171b8633463e4696612f16c33e2abbcc27f54ef1455bd513f4ad6b3511"}');
		});

		it("sorts attributes of sub objects", function () {
			var result = new ObjectHasher({a: {b: "c", a: "c"}}, 2).stringify();

			expect(result).toEqual('{"a":"hash::97ad14762aa508302135f5a3e9a9611cebeb3352ee9e56de70aa854dfbdde681"}');
		});

		it("big object", function() {
			var obj = bigObject();

			timeStart();
			var result = new ObjectHasher(obj, 2).stringify();
			timeEnd();

			expect(result).toEqual('{"a":"hash::b14cbb158809ca33e9359cc248e0999f3e0252702265cc0fbe88342fb33020e4"}');
		});
	});

	describe("version 1", function () {
		it("does not change empty objects", function () {
			var result = new ObjectHasher({}, 1).stringify();

			expect(result).toEqual('{}');
		});

		it("does not change empty array", function () {
			var result = new ObjectHasher([], 1).stringify();

			expect(result).toEqual('[]');
		});

		it("stringifies values", function () {
			var result = new ObjectHasher({a: 5}, 1).stringify();

			expect(result).toEqual('{"a":"hash::e2833fab2d34fe77dd528d8b98534420d3fe166aecd550918d6f1109e53a3e25"}');
		});

		it("sorts values", function () {
			var result = new ObjectHasher({b: "a", a: "b"}, 1).stringify();

			expect(result).toEqual('{"a":"hash::9905f75ee3631db65809e2415b94df99ffd0fb6711571ab78b93695f043008ba","b":"hash::6216399d51f3581b0f8418644b4fd0b50f86a25b59101afb08dd0785dd4e8d9c"}');
		});

		it("stringifies sub objects", function () {
			var result = new ObjectHasher({a: {b: "c"}}, 1).stringify();

			expect(result).toEqual('{"a":"hash::2b9f8de35d456ab77fe22f2e2ab6073acaa964c3cb8684a935dbecb0ef709d07"}');
		});

		it("sorts attributes of sub objects", function () {
			var result = new ObjectHasher({a: {b: "c", a: "c"}}, 1).stringify();

			expect(result).toEqual('{"a":"hash::058c781de71fbdb3d86ea546297cfe202f58e54c56e7c2610330368375fc6594"}');
		});

		it("big object", function() {
			var obj = bigObject();

			timeStart();
			var result = new ObjectHasher(obj, 1).stringify();
			timeEnd();

			expect(result).toEqual('{"a":"hash::987590df9c9cc570f9a3ed1a3252bcb6356c188a417dc3ee4b3595f38f9c8818"}');
		});
	});

});
