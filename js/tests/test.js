//Modernizr.webworkers = false;
var ssn;
define(['jquery', 'libs/step', 'crypto/waitForReady', 'asset/helper', 'libs/jquery.json.min'], function ($, step, waitForReady, h) {
	"use strict";
	require(['libs/sjcl'], function (sjcl) {
		sjcl.random.startCollectors();
		sjcl.random.addEntropy("test", 5000);
	});

	step(function startup() {
		$(document).ready(this);
	}, function () {
		waitForReady(this);
	}, function () {
		describe("SessionKey", function () {
			it("generate", function (done) {
				step(function () {
					require.wrap("crypto/sessionKey", this);
				}, h.sF(function (SessionKey) {
					var sk = new SessionKey();
					expect(sk).not.to.be(undefined);
					expect(sk.decryptKey).to.be.a("function");
					expect(sk.getEncrypted).to.be.a("function");
					expect(sk.encryptText).to.be.a("function");
					expect(sk.decryptText).to.be.a("function");

					this();
				}), done);
			});

			it("decrypt/encrypt", function (done) {
				var sk, sk2, SessionKey;
				var text = "testText";
				step(function () {
					require.wrap("crypto/sessionKey", this);
				}, h.sF(function (SK) {
					SessionKey = SK;

					sk = new SessionKey();
					sk2 = new SessionKey();

					sk.encryptText(text, this);
				}), h.sF(function (encrypted) {
					expect(encrypted).not.to.be(undefined);
					expect(encrypted).to.be.a("string");

					var parsed = $.parseJSON(encrypted);
					expect(parsed).to.be.a("object");
					expect(parsed.iv).to.be.a("string");
					expect(parsed.ct).to.be.a("string");
					expect(parsed.v).to.be(undefined);
					expect(parsed.iter).to.be(undefined);

					sk.decryptText(encrypted, this);
				}), h.sF(function (decrypted) {
					expect(decrypted).to.be(text);
					sk2.encryptText(text, this);
				}), h.sF(function (encrypted) {
					sk.decryptText(encrypted, this);
				}), h.sF(function (decrypted) {
					expect(decrypted).to.be(false);
					this();
				}), done);
			});

			it("export/import with sk", function (done) {
				var text = "testText", encryptedText;

				var encryptedSK;
				var sk, sk2, exK, SessionKey;
				step(function () {
					require.wrap("crypto/sessionKey", this);
				}, h.sF(function (SK) {
					SessionKey = SK;

					sk = new SessionKey();
					exK = new SessionKey();
					sk.encryptText(text, this);
				}), h.sF(function (encrypted) {
					encryptedText = encrypted;

					sk.getEncrypted(exK, this);
				}), h.sF(function (encrypted) {
					encryptedSK = encrypted;
					expect(encrypted).not.to.be(undefined);
					expect(encrypted).to.be.a("string");

					var parsed = $.parseJSON(encrypted);
					expect(parsed).to.be.a("object");
					expect(parsed.iv).to.be.a("string");
					expect(parsed.ct).to.be.a("string");
					expect(parsed.v).to.be(undefined);
					expect(parsed.iter).to.be(undefined);

					sk2 = new SessionKey(encrypted);
					expect(sk2.decrypted()).to.be(false);

					sk2.decryptKey(sk, this);
				}), h.sF(function (decrypted) {
					expect(decrypted).to.be(false);

					sk2.decryptText(encryptedText, this);
				}), h.sF(function (decryptedText) {
					expect(decryptedText).to.be(false);

					sk2.decryptKey(exK, this);
				}), h.sF(function (decrypted) {
					expect(decrypted).to.be(true);

					expect(sk2.getOriginal()).to.be(encryptedSK);
					expect(sk2.isSymKey()).to.be(true);

					sk2.decryptText(encryptedText, this);
				}), h.sF(function (decryptedText) {
					expect(decryptedText).to.be(text);
					this();
				}), done);
			});
		});

		describe("RSA Keys", function () {
			var password = "4s3cur3P455word!";

			it("direct generation", function (done) {
				this.timeout(15000);
				var BigInteger;
				step(function loadDeps() {
					require.wrap(["crypto/rsa", "crypto/jsbn", "config"], this);
				}, h.sF(function (RSA, BI, config) {
					BigInteger = BI;
					var rsa = new RSA();
					rsa.generateAsync(config.keyLength, "10001", this);
				}), h.sF(function (key) {
					expect(key.n).to.be.a(BigInteger);
					expect(key.ee).to.be.a(BigInteger);
					expect(key.ee.toString(16)).to.be("10001");

					expect(key.p.isProbablePrime(5)).to.be.ok();
					expect(key.p.isProbablePrime(5)).to.be.ok();
					this();
				}), done);
			});

			it.only("crypto interface generation", function (done) {
				this.timeout(15000);
				var BigInteger;
				step(function loadDeps() {
					require.wrap(["crypto/crypto", "crypto/jsbn"], this);
				}, h.sF(function (crypto, BI) {
					BigInteger = BI;
					crypto.generateKey(password, this);
				}), h.sF(function (key) {
					expect(key).not.to.be(undefined);
					expect(key.n()).to.be.a(BigInteger);
					expect(key.ee()).to.be.a(BigInteger);
					expect(key.ee().toString(16)).to.be("10001");

					this();
				}), done);
			});
		});
		mocha.run();

		//mocha.run();
	});

});
/*
$(document).ready(function () {
	QUnit.testDone = function (result) {
		localStorage.setItem(result.name, parseInt(localStorage.getItem(result.name), 10) + result.runtime);
	};

	QUnit.done = function (result) {
		if (result.total === 0) {
			return;
		}
		if (result.failed === 0) {
			localStorage.setItem("count", parseInt(localStorage.getItem("count"), 10) + 1);

			if (parseInt(localStorage.getItem("count"), 10) % 1000 === 0) {
				alert(localStorage.getItem("count"));
			}

			window.location.href = "";
		} else {
			alert(result.failed + " Fehlgeschlagen! Nach " + localStorage.getItem("count") + " richtigen");
			localStorage.setItem("count", 0);
		}
	};

	module("Crypto");

	var password = "as3cur3P455word!";

	asyncTest("KeyGen, Key Generation Async Test", function () {
		var rsa = new RSA();
		rsa.generateAsync(ssn.config.keyLength, "10001", function (key) {
			notEqual(key.n, null, "key n value");
			notEqual(key.ee, null, "key ee value");

			ok(key.p.isProbablePrime(5), "p is prime");
			ok(key.q.isProbablePrime(5), "q is prime");

			start();
		});
	});

	test("SHA256", function () {
		var str_sha256 = ssn.crypto.sha256;
		equal(str_sha256(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
		equal(str_sha256("abc"),	"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
		equal(str_sha256("message digest"),	"f7846f55cf23e14eebeab5b4e1550cad5b509e3348fbc4efa3a1413d393cb650");
		equal(str_sha256("secure hash algorithm"),	"f30ceb2bb2829e79e4ca9753d35a8ecc00262d164cc077080295381cbd643f0d");
		equal(str_sha256("SHA256 is considered to be safe"),	"6819d915c73f4d1e77e4e1b52d1fa0f9cf9beaead3939f15874bd988e2a23630");
		equal(str_sha256("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"),	"248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
		equal(str_sha256("For this sample, this 63-byte string will be used as input data"),	"f08a78cbbaee082b052ae0708f32fa1e50c5c421aa772ba5dbb406a2ea6be342");
		equal(str_sha256("This is exactly 64 bytes long, not counting the terminating byte"),	"ab64eff7e88e2e46165e29f2bce41826bd4c7b3552f6b382a9e7d3af47c245f8");

	});

	test("Signature", function () {
		waitForReady(function () {
			var privateKeyJSON = '{"ee":"10001","n":"d581e7a15678a61c7120a4b986195f424ca2239e262fd970d04c4a2c9297e63a88b62b880775599f3b8f617aa94b7274cd96bd1b64271359505e524fe80cce4e366fc50e35205795ebf7befdff4fdd128d8eefb936203640ad45d0044467b6b3ba846699933ff1ec8c04ab072536422a81b7734fb506e078d73a6ca138c4cac5","priv":{"iv":"YFUvNzgFBQwe0oHhVr+8wg","salt":"ZtkMf8WX8fo","ct":"PAQmEp2YbTxOTSp+VTky7OQcca0XW1peVr+57wgjci/GR+XxY7nrt9hPM7biPJrC52LA7MKSk2sKLavO7DqxpGzwrGh1WBcBlQS9GZti/JBC461M7qlNLDfw//Yz2e/+hC9fLAtRwqSYAos8vT9zdmUYknn/XW/IGByWPtE5czdMPtgiRTu+rHbsicsMQ80Np/yemIorUjTNMkLTVYpntayMYParA7uthRMDIVyuWLXEMyRu26iiP8eJ1cLBVQqMf9CVvIehTOpMgRWxFVja6TSjXUYxqCoM6nOK6OdweoSgoNsWQXzKxDAkmYX/rYPRyf5o77iKw+Vh8eZYv/00OwxQx4WLbi938/mrYoAw8chMSTQl6wL8mHEqpOtIoaxhZ5/0S7JwFaGb6EK1jmS+3VDzUI5xfmh31/sXJxs0LMzQqvfaJf4AjwlAtmTxI8aaSEUhYtR6buAhd52clT6iHDsGyTTtksdrVGB6d3mpQOY+I1qXLB1F1HM/hpEfwa8nYw8qCwgDkoNF+at8GG1AFReD5u7pidgg8urnAYonuoE4ByaMqZtek6VL3BY0GkMoKjyXWDg3qxJoeOG21mvUyK++DWLsD9JqCcMCtNyqSzey9euuAQRKW/59p9zy9IyW9wtlJRvXVOmGWwiL/fz8YwB96Npk67EuYGv69PIS04ezbLCqX8Hz6MNOAYmi8O1hPxSE1DNQvJqhXgmwy6idLtvvlXIHQDE4ECSvv6bSbmdLkSQLtnUgwxIOzj/iKgqSr2Pc/YrvkTws+jnYKFk9djL95ygKkWzbE/JjtFCzSI4xR6dourTVHgcWGnO8oxUfHRYTUnLkyRzR/BOCGB2wgXIMThx+Bifay40VUQ+ZilhClvCBFwCCqVsGh/rutq+PfSwW5A4"}}';
			var privateKey = new ssn.crypto.privateKey(privateKeyJSON, password);
			var publicKey = new ssn.crypto.publicKey(privateKeyJSON);

			var message = "Dies ist ein Testtext! <br /> Er dient einzig und allein des Testes";
			var message2 = "Dies ist ein Testtext! <br /> Er dient einzig und allein dem Testen";

			var signature = ssn.crypto.signText(privateKey, message);
			ssn.logger.log("Signature of test text: " + signature);
			ok(ssn.crypto.verifyText(publicKey, message, signature), "Signature valid");
			ok(ssn.crypto.verifyText(publicKey, message, signature), "Signature valid");
			ok(!ssn.crypto.verifyText(publicKey, message2, signature), "Signature invalid");
		});
	});

	test("Asymmetric Encryption", function () {
		waitForReady(function () {
			var toEncrypt = sjcl.codec.hex.fromBits(sjcl.random.randomWords(8, 0), ssn.config.paranoia);

			var privateKeyJSON = '{"ee":"10001","n":"d581e7a15678a61c7120a4b986195f424ca2239e262fd970d04c4a2c9297e63a88b62b880775599f3b8f617aa94b7274cd96bd1b64271359505e524fe80cce4e366fc50e35205795ebf7befdff4fdd128d8eefb936203640ad45d0044467b6b3ba846699933ff1ec8c04ab072536422a81b7734fb506e078d73a6ca138c4cac5","priv":{"iv":"YFUvNzgFBQwe0oHhVr+8wg","salt":"ZtkMf8WX8fo","ct":"PAQmEp2YbTxOTSp+VTky7OQcca0XW1peVr+57wgjci/GR+XxY7nrt9hPM7biPJrC52LA7MKSk2sKLavO7DqxpGzwrGh1WBcBlQS9GZti/JBC461M7qlNLDfw//Yz2e/+hC9fLAtRwqSYAos8vT9zdmUYknn/XW/IGByWPtE5czdMPtgiRTu+rHbsicsMQ80Np/yemIorUjTNMkLTVYpntayMYParA7uthRMDIVyuWLXEMyRu26iiP8eJ1cLBVQqMf9CVvIehTOpMgRWxFVja6TSjXUYxqCoM6nOK6OdweoSgoNsWQXzKxDAkmYX/rYPRyf5o77iKw+Vh8eZYv/00OwxQx4WLbi938/mrYoAw8chMSTQl6wL8mHEqpOtIoaxhZ5/0S7JwFaGb6EK1jmS+3VDzUI5xfmh31/sXJxs0LMzQqvfaJf4AjwlAtmTxI8aaSEUhYtR6buAhd52clT6iHDsGyTTtksdrVGB6d3mpQOY+I1qXLB1F1HM/hpEfwa8nYw8qCwgDkoNF+at8GG1AFReD5u7pidgg8urnAYonuoE4ByaMqZtek6VL3BY0GkMoKjyXWDg3qxJoeOG21mvUyK++DWLsD9JqCcMCtNyqSzey9euuAQRKW/59p9zy9IyW9wtlJRvXVOmGWwiL/fz8YwB96Npk67EuYGv69PIS04ezbLCqX8Hz6MNOAYmi8O1hPxSE1DNQvJqhXgmwy6idLtvvlXIHQDE4ECSvv6bSbmdLkSQLtnUgwxIOzj/iKgqSr2Pc/YrvkTws+jnYKFk9djL95ygKkWzbE/JjtFCzSI4xR6dourTVHgcWGnO8oxUfHRYTUnLkyRzR/BOCGB2wgXIMThx+Bifay40VUQ+ZilhClvCBFwCCqVsGh/rutq+PfSwW5A4"}}';
			var privateKey = new ssn.crypto.privateKey(privateKeyJSON, password);
			var publicKey = new ssn.crypto.publicKey(privateKeyJSON);

			var rsa = new RSA();

			var encryptedOAEP = rsa.encryptOAEP(new BigInteger(toEncrypt, 16), publicKey.ee, publicKey.n, "Socialize");
			var decryptedOAEP = privateKey.decryptOAEP(encryptedOAEP, "Socialize");

			var encryptedOAEP2 = "4822aea11aafda34a6fea1851633d53aa004fface5900810dbbd01bb5cdd0f68";
			ssn.logger.log(privateKey.decryptOAEP(encryptedOAEP, "Socialize"));
			ok(privateKey.decryptOAEP(encryptedOAEP, "Socialize") !== false, "problematic encryption");

			ok(!privateKey.decryptOAEP(encryptedOAEP, "wrongLabel"));

			var toEncrypt2 = new BigInteger(toEncrypt, 16).toString(16);
			var decrypted = decryptedOAEP.toString(16);

			toEncrypt2 = ssn.crypto.r0(toEncrypt2);
			decrypted = ssn.crypto.r0(decrypted);

			equal(decrypted, toEncrypt2);
		});
	});

	test("Session Key", function () {
		waitForReady(function () {
			var privateKeyJSON = '{"ee":"10001","n":"d581e7a15678a61c7120a4b986195f424ca2239e262fd970d04c4a2c9297e63a88b62b880775599f3b8f617aa94b7274cd96bd1b64271359505e524fe80cce4e366fc50e35205795ebf7befdff4fdd128d8eefb936203640ad45d0044467b6b3ba846699933ff1ec8c04ab072536422a81b7734fb506e078d73a6ca138c4cac5","priv":{"iv":"YFUvNzgFBQwe0oHhVr+8wg","salt":"ZtkMf8WX8fo","ct":"PAQmEp2YbTxOTSp+VTky7OQcca0XW1peVr+57wgjci/GR+XxY7nrt9hPM7biPJrC52LA7MKSk2sKLavO7DqxpGzwrGh1WBcBlQS9GZti/JBC461M7qlNLDfw//Yz2e/+hC9fLAtRwqSYAos8vT9zdmUYknn/XW/IGByWPtE5czdMPtgiRTu+rHbsicsMQ80Np/yemIorUjTNMkLTVYpntayMYParA7uthRMDIVyuWLXEMyRu26iiP8eJ1cLBVQqMf9CVvIehTOpMgRWxFVja6TSjXUYxqCoM6nOK6OdweoSgoNsWQXzKxDAkmYX/rYPRyf5o77iKw+Vh8eZYv/00OwxQx4WLbi938/mrYoAw8chMSTQl6wL8mHEqpOtIoaxhZ5/0S7JwFaGb6EK1jmS+3VDzUI5xfmh31/sXJxs0LMzQqvfaJf4AjwlAtmTxI8aaSEUhYtR6buAhd52clT6iHDsGyTTtksdrVGB6d3mpQOY+I1qXLB1F1HM/hpEfwa8nYw8qCwgDkoNF+at8GG1AFReD5u7pidgg8urnAYonuoE4ByaMqZtek6VL3BY0GkMoKjyXWDg3qxJoeOG21mvUyK++DWLsD9JqCcMCtNyqSzey9euuAQRKW/59p9zy9IyW9wtlJRvXVOmGWwiL/fz8YwB96Npk67EuYGv69PIS04ezbLCqX8Hz6MNOAYmi8O1hPxSE1DNQvJqhXgmwy6idLtvvlXIHQDE4ECSvv6bSbmdLkSQLtnUgwxIOzj/iKgqSr2Pc/YrvkTws+jnYKFk9djL95ygKkWzbE/JjtFCzSI4xR6dourTVHgcWGnO8oxUfHRYTUnLkyRzR/BOCGB2wgXIMThx+Bifay40VUQ+ZilhClvCBFwCCqVsGh/rutq+PfSwW5A4"}}';
			var privateKey = new ssn.crypto.privateKey(privateKeyJSON, password);
			var publicKey = new ssn.crypto.publicKey(privateKeyJSON);

			var sessionKey = new ssn.crypto.sessionKey();

			var message = "Dies ist ein Testtext! <br /> Er dient einzig und allein des Testes";
			var encryptedText = sessionKey.encryptText(message);
			equal(message, sessionKey.decryptText(encryptedText));

			var sessionKey2 = new ssn.crypto.sessionKey();

			var key = sessionKey.getEncrypted(publicKey);
			var encryptedKey = new ssn.crypto.sessionKey(key);
			equal(encryptedKey.decryptText(encryptedText), false);

			equal(encryptedKey.getEncrypted(publicKey), false);
			equal(encryptedKey.getEncrypted("test"), false);

			var needKey = function () {
				encryptedKey.decryptKey("test");
			};

			raises(needKey, ssn.exception.needPrivateKey, "Session Key Decryption Exception.");
			equal(encryptedKey.decryptKey(privateKey), true, "Session Key Decryption");
			equal(encryptedKey.decryptKey("test"), true, "Decrypt after decryption was already done works in any case.");

			ssn.logger.log("Encrypted Text: " + encryptedText);
			ssn.logger.log("Original Text: " + message);
			equal(encryptedKey.decryptText(encryptedText), message, "Text decrypt works");

			var decryptText = function () {
				sessionKey.decryptText("bla");
			};

			var decryptText2 = function () {
				sessionKey2.decryptText(encryptedText);
			};

			raises(decryptText, "decrypting non json text fails");
			raises(decryptText2, sjcl.exception.corrupt, "wrong decrypt fails as expected");
		});
	});

	test("Long Encryption", function () {
		var i = 0;
		var sessionKey = new ssn.crypto.sessionKey();

		var message = "";

		for (i = 0; i < 1000000; i += 1) {
			message = message + "u";
		}

		var encryptedText = sessionKey.encryptText(message);
		ssn.logger.log("Text length: " + message.length + " vs " + encryptedText.length + " Ratio: " + encryptedText.length / message.length);
		equal(message, sessionKey.decryptText(encryptedText));
	});

	asyncTest("KeyGen, Crypto Library Encryption", function () {
		sjcl.random.addEntropy("d", 1000, "mouse");

		ssn.logger.heading("Crypto Library");
		ssn.crypto.generate_Key(password, function (privateKey, pubKey) {
			notEqual(privateKey.n, null, "key n value");
			notEqual(privateKey.ee, null, "key ee value");

			equal(privateKey.n.toString(16), pubKey.n.toString(16), "Public and Private n Equal");
			equal(privateKey.ee.toMPI(), pubKey.ee.toMPI(), "Public and Private ee Equal");

			//export to json and import again
			var json = pubKey.getJSON();
			var pubKey2 = new ssn.crypto.publicKey(json);

			ok(pubKey.ee.equals(pubKey2.ee), "json export");
			ok(pubKey.n.equals(pubKey2.n), "json export");

			var jsonPrivate = privateKey.getEncrypted();

			ssn.logger.log("Generated Key:" + jsonPrivate);

			var wrongPW = function () {
				var b = new ssn.crypto.privateKey(jsonPrivate, "falschespw");
			};

			raises(wrongPW);

			var privateKey2 = new ssn.crypto.privateKey(jsonPrivate, password);

			var message = "Dies ist ein Testtext! <br /> Er dient einzig und allein des Testes";

			pubKey.id = 1;
			ssn.crypto.encryptText(pubKey, message, function (result) {
				ssn.crypto.decryptText(privateKey2, result.EM, result.sessionKeys[1], function (result) {
					equal(result, message, "asynchronous encrypt/decrypt");
					ssn.crypto.signText(privateKey, message, function (result) {
						ssn.crypto.verifyText(pubKey, message, result, function (result) {
							ok(result, "asynchronous signature");
							start();
						});
					});
				});
			});
		});
	});
});*/