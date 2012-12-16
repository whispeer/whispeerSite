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
		var password = "4s3cur3P455word!";

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
			it("direct generation", function (done) {
				if (!Modernizr.webworkers) {
					done();
					return;
				}

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

			it("crypto interface generation", function (done) {
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
					expect(key.getJSON()).to.be.a("string");
					expect(key.ee().toString(16)).to.be("10001");

					console.log(key.getJSON());

					this();
				}), done);
			});

			it("private and public Key sign/verify", function (done) {
				this.timeout(8000);

				var keyJSON = '{"ee":"10001","n":"740d8ef1913de35f9e923b7da0c0102424501bd723644d5fbc55ab00c560d03eb977f7a2a06633c62fbe040c9db8ca81e34cd1ff7453c0bbb32b1c0ab4999fb80643df2fd5b7d0184ceee7398e2e56402245d48a751f0cd186ea7c61ac39ae6a4d22bde9007ba1f9452330b448386be61da649c876f7cad821ce7c03ee9aec0f","id":"null","priv":{"iv":"CQrUG7UmUM5PLFXG19GMzA","v":1,"iter":1000,"ks":128,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"lNepFJwzi1A","ct":"nykmwHQGJVU/Kk1FiovB3fZytKIaFXGrqvXAfnr2wqGl7+07yGEk8r/bSk6Hy49QX4Zolde7dcHWAog3VXKw9A0WGv/epiMpXx84UmFEOg9GzzAtBSqi+36LIO4VjAl5Zbuam5L4VYzMXuiXfOx96SsqR50pwcogLubzSRBQrZGP6zu8Z0juZySJU5AbgLiR/fgLsWR1OkQhmlYbYOKDvjuFRDZnlBfuQz+aJEiDK11WSReKIGQL/4pLPehWIwT/LH1+ukloEFIhEC/k9C3xI5VrupxFrKcrz/Vnu7gJ5WT4RFd/9OMrRBk3+0EGmgYkOVWLNDXePw/HdDq+CWRT0axiXo4U3OQvG+F6bLx8l2yN83KhmVEuLSlWzApx/RfM35YlZwUh/K2A8NI7AzWghyyAwABadtvbuYc7j2LEZzrES7eRgAgDo014oxBqCmCz2pmG670IRxCMKxiOwmpHkmRNqbSBuOUJDEzwMqCAk3+2xS2+APBhzNkq7VKYQsH/eBps9A2whc9Pgvd2l0lOSL+XdhF2BjxNI6vm4YlRm89OBlB+nGQjTekZbFIYOTigRbO0QBWVa1EXSsxJe9Y26bViW17cUzwgPMc4kRlhfW7qovudeKH3b2aL3wXIXKdpaXQQl76jVFJxst/f5DakBZJD0ncVvRcm9UfLwgMC3YD/n/cLiaoJldlv5ksGFgqBMIpIhoWE50MWEjFNg6VFw4dN4L6HcdPjKIhr0UG5G23x6uFEFXY20w+SQqcphXU7Q1l49LfO6JNtyLSrD+mJVqWLDhhVGEdzhiZA9w6PeClOIPKIpkOs3Bc+TQL0+KeKJ4sf0EdXR7XABO6fymFPAxdOgYm43obLsieGMteqPntSGJVAx9P0ZLW3FvKFX5y0wy3BHw"}}';
				var message = "dfspiughoTestNachrichtwoepsg!%&(/%&$/i";
				var privKey, pubKey;

				step(function loadDeps() {
					require.wrap(["crypto/publicKey", "crypto/privateKey"], this);
				}, h.sF(function (PublicKey, PrivateKey) {
					pubKey = new PublicKey(keyJSON);
					expect(function () {
						privKey = new PrivateKey(keyJSON, "test");
					}).to.throwError();

					privKey = new PrivateKey(keyJSON, password);
					expect(privKey.ee().toString(16)).to.be(pubKey.ee().toString(16));
					expect(privKey.n().toString(16)).to.be(pubKey.n().toString(16));
					expect(privKey.id()).to.be(pubKey.id());
					expect(privKey.id()).to.be(null);

					expect(privKey.setID(5)).to.be(true);
					expect(privKey.setID(6)).to.be(false);
					expect(privKey.id()).to.be(5);

					expect(pubKey.setID(5)).to.be(true);
					expect(pubKey.setID(6)).to.be(false);
					expect(pubKey.id()).to.be(5);

					privKey.signPSS(message, this);
				}), h.sF(function (signature) {
					pubKey.verifyPSS(message, signature, this.parallel());
					privKey.verifyPSS(message, signature, this.parallel());
					privKey.getPublicKey().verifyPSS(message, signature, this.parallel());
				}), h.sF(function (sigOK) {
					expect(sigOK[0]).to.be.ok();
					expect(sigOK[1]).to.be.ok();
					expect(sigOK[2]).to.be.ok();
					this();
				}), done);
			});

			it("private and public Key decrypt/encrypt", function (done) {
				this.timeout(8000);

				var keyJSON = '{"ee":"10001","n":"740d8ef1913de35f9e923b7da0c0102424501bd723644d5fbc55ab00c560d03eb977f7a2a06633c62fbe040c9db8ca81e34cd1ff7453c0bbb32b1c0ab4999fb80643df2fd5b7d0184ceee7398e2e56402245d48a751f0cd186ea7c61ac39ae6a4d22bde9007ba1f9452330b448386be61da649c876f7cad821ce7c03ee9aec0f","id":"null","priv":{"iv":"CQrUG7UmUM5PLFXG19GMzA","v":1,"iter":1000,"ks":128,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"lNepFJwzi1A","ct":"nykmwHQGJVU/Kk1FiovB3fZytKIaFXGrqvXAfnr2wqGl7+07yGEk8r/bSk6Hy49QX4Zolde7dcHWAog3VXKw9A0WGv/epiMpXx84UmFEOg9GzzAtBSqi+36LIO4VjAl5Zbuam5L4VYzMXuiXfOx96SsqR50pwcogLubzSRBQrZGP6zu8Z0juZySJU5AbgLiR/fgLsWR1OkQhmlYbYOKDvjuFRDZnlBfuQz+aJEiDK11WSReKIGQL/4pLPehWIwT/LH1+ukloEFIhEC/k9C3xI5VrupxFrKcrz/Vnu7gJ5WT4RFd/9OMrRBk3+0EGmgYkOVWLNDXePw/HdDq+CWRT0axiXo4U3OQvG+F6bLx8l2yN83KhmVEuLSlWzApx/RfM35YlZwUh/K2A8NI7AzWghyyAwABadtvbuYc7j2LEZzrES7eRgAgDo014oxBqCmCz2pmG670IRxCMKxiOwmpHkmRNqbSBuOUJDEzwMqCAk3+2xS2+APBhzNkq7VKYQsH/eBps9A2whc9Pgvd2l0lOSL+XdhF2BjxNI6vm4YlRm89OBlB+nGQjTekZbFIYOTigRbO0QBWVa1EXSsxJe9Y26bViW17cUzwgPMc4kRlhfW7qovudeKH3b2aL3wXIXKdpaXQQl76jVFJxst/f5DakBZJD0ncVvRcm9UfLwgMC3YD/n/cLiaoJldlv5ksGFgqBMIpIhoWE50MWEjFNg6VFw4dN4L6HcdPjKIhr0UG5G23x6uFEFXY20w+SQqcphXU7Q1l49LfO6JNtyLSrD+mJVqWLDhhVGEdzhiZA9w6PeClOIPKIpkOs3Bc+TQL0+KeKJ4sf0EdXR7XABO6fymFPAxdOgYm43obLsieGMteqPntSGJVAx9P0ZLW3FvKFX5y0wy3BHw"}}';
				var BIMessage = "abcdefabcdef458962349857abfdac";
				var privKey, pubKey;
				step(function loadDeps() {
					require.wrap(["crypto/publicKey", "crypto/privateKey", "crypto/jsbn"], this);
				}, h.sF(function (PublicKey, PrivateKey, BigInteger) {
					pubKey = new PublicKey(keyJSON);
					privKey = new PrivateKey(keyJSON, password);

					pubKey.encryptOAEP(new BigInteger(BIMessage, 16), "Whispeer", this.parallel());
					privKey.encryptOAEP(new BigInteger(BIMessage, 16), "Whispeer", this.parallel());
					privKey.getPublicKey().encryptOAEP(new BigInteger(BIMessage, 16), "Whispeer", this.parallel());
				}), h.sF(function (encrypted) {
					expect(encrypted[0]).to.not.be(encrypted[1]);
					expect(encrypted[0]).to.not.be(encrypted[2]);
					expect(encrypted[1]).to.not.be(encrypted[2]);

					privKey.decryptOAEP(encrypted[0], "bla", this.parallel());
					privKey.decryptOAEP(encrypted[1], "bla", this.parallel());
					privKey.decryptOAEP(encrypted[2], "bla", this.parallel());

					privKey.decryptOAEP(encrypted[0], "Whispeer", this.parallel());
					privKey.decryptOAEP(encrypted[1], "Whispeer", this.parallel());
					privKey.decryptOAEP(encrypted[2], "Whispeer", this.parallel());
				}), h.sF(function (decrypted) {
					expect(decrypted[0]).to.be(false);
					expect(decrypted[1]).to.be(false);
					expect(decrypted[2]).to.be(false);

					expect(decrypted[3]).to.be(BIMessage);
					expect(decrypted[4]).to.be(BIMessage);
					expect(decrypted[5]).to.be(BIMessage);

					this();
				}), done);
			});
		});

		describe("Crypto", function () {
			it("sha256", function (done) {
				step(function loadDeps() {
					require.wrap("crypto/crypto", this);
				}, h.sF(function deps(crypto) {
					var str_sha256 = crypto.sha256;
					expect(str_sha256("")).to.be("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
					expect(str_sha256("abc")).to.be("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
					expect(str_sha256("message digest")).to.be("f7846f55cf23e14eebeab5b4e1550cad5b509e3348fbc4efa3a1413d393cb650");
					expect(str_sha256("secure hash algorithm")).to.be("f30ceb2bb2829e79e4ca9753d35a8ecc00262d164cc077080295381cbd643f0d");
					expect(str_sha256("SHA256 is considered to be safe")).to.be("6819d915c73f4d1e77e4e1b52d1fa0f9cf9beaead3939f15874bd988e2a23630");
					expect(str_sha256("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).to.be("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
					expect(str_sha256("For this sample, this 63-byte string will be used as input data")).to.be("f08a78cbbaee082b052ae0708f32fa1e50c5c421aa772ba5dbb406a2ea6be342");
					expect(str_sha256("This is exactly 64 bytes long, not counting the terminating byte")).to.be("ab64eff7e88e2e46165e29f2bce41826bd4c7b3552f6b382a9e7d3af47c245f8");

					this();
				}), done);
			});

			it("Signature", function (done) {
				var keyJSON = '{"ee":"10001","n":"740d8ef1913de35f9e923b7da0c0102424501bd723644d5fbc55ab00c560d03eb977f7a2a06633c62fbe040c9db8ca81e34cd1ff7453c0bbb32b1c0ab4999fb80643df2fd5b7d0184ceee7398e2e56402245d48a751f0cd186ea7c61ac39ae6a4d22bde9007ba1f9452330b448386be61da649c876f7cad821ce7c03ee9aec0f","id":"null","priv":{"iv":"CQrUG7UmUM5PLFXG19GMzA","v":1,"iter":1000,"ks":128,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"lNepFJwzi1A","ct":"nykmwHQGJVU/Kk1FiovB3fZytKIaFXGrqvXAfnr2wqGl7+07yGEk8r/bSk6Hy49QX4Zolde7dcHWAog3VXKw9A0WGv/epiMpXx84UmFEOg9GzzAtBSqi+36LIO4VjAl5Zbuam5L4VYzMXuiXfOx96SsqR50pwcogLubzSRBQrZGP6zu8Z0juZySJU5AbgLiR/fgLsWR1OkQhmlYbYOKDvjuFRDZnlBfuQz+aJEiDK11WSReKIGQL/4pLPehWIwT/LH1+ukloEFIhEC/k9C3xI5VrupxFrKcrz/Vnu7gJ5WT4RFd/9OMrRBk3+0EGmgYkOVWLNDXePw/HdDq+CWRT0axiXo4U3OQvG+F6bLx8l2yN83KhmVEuLSlWzApx/RfM35YlZwUh/K2A8NI7AzWghyyAwABadtvbuYc7j2LEZzrES7eRgAgDo014oxBqCmCz2pmG670IRxCMKxiOwmpHkmRNqbSBuOUJDEzwMqCAk3+2xS2+APBhzNkq7VKYQsH/eBps9A2whc9Pgvd2l0lOSL+XdhF2BjxNI6vm4YlRm89OBlB+nGQjTekZbFIYOTigRbO0QBWVa1EXSsxJe9Y26bViW17cUzwgPMc4kRlhfW7qovudeKH3b2aL3wXIXKdpaXQQl76jVFJxst/f5DakBZJD0ncVvRcm9UfLwgMC3YD/n/cLiaoJldlv5ksGFgqBMIpIhoWE50MWEjFNg6VFw4dN4L6HcdPjKIhr0UG5G23x6uFEFXY20w+SQqcphXU7Q1l49LfO6JNtyLSrD+mJVqWLDhhVGEdzhiZA9w6PeClOIPKIpkOs3Bc+TQL0+KeKJ4sf0EdXR7XABO6fymFPAxdOgYm43obLsieGMteqPntSGJVAx9P0ZLW3FvKFX5y0wy3BHw"}}';
				var message = "dfspiughoTestNachrichtwoepsg!%&(/%&$/i";
				var privKey, pubKey, crypto;

				step(function loadDeps() {
					require.wrap(["crypto/publicKey", "crypto/privateKey", "crypto/crypto"], this);
				}, h.sF(function (PublicKey, PrivateKey, c) {
					crypto = c;
					pubKey = new PublicKey(keyJSON);
					privKey = new PrivateKey(keyJSON, password);

					crypto.signText(privKey, message, this);
				}), h.sF(function (signature) {
					crypto.verifyText(pubKey, message, signature, this.parallel());
					crypto.verifyText(pubKey, "bla", signature, this.parallel());
				}), h.sF(function (sigOK) {
					expect(sigOK[0]).to.be.ok();
					expect(sigOK[1]).not.to.be.ok();
					this();
				}), done);
			});

			it("Asymmetric Encryption", function (done) {
				var keyJSON = '{"ee":"10001","n":"740d8ef1913de35f9e923b7da0c0102424501bd723644d5fbc55ab00c560d03eb977f7a2a06633c62fbe040c9db8ca81e34cd1ff7453c0bbb32b1c0ab4999fb80643df2fd5b7d0184ceee7398e2e56402245d48a751f0cd186ea7c61ac39ae6a4d22bde9007ba1f9452330b448386be61da649c876f7cad821ce7c03ee9aec0f","id":"null","priv":{"iv":"CQrUG7UmUM5PLFXG19GMzA","v":1,"iter":1000,"ks":128,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"lNepFJwzi1A","ct":"nykmwHQGJVU/Kk1FiovB3fZytKIaFXGrqvXAfnr2wqGl7+07yGEk8r/bSk6Hy49QX4Zolde7dcHWAog3VXKw9A0WGv/epiMpXx84UmFEOg9GzzAtBSqi+36LIO4VjAl5Zbuam5L4VYzMXuiXfOx96SsqR50pwcogLubzSRBQrZGP6zu8Z0juZySJU5AbgLiR/fgLsWR1OkQhmlYbYOKDvjuFRDZnlBfuQz+aJEiDK11WSReKIGQL/4pLPehWIwT/LH1+ukloEFIhEC/k9C3xI5VrupxFrKcrz/Vnu7gJ5WT4RFd/9OMrRBk3+0EGmgYkOVWLNDXePw/HdDq+CWRT0axiXo4U3OQvG+F6bLx8l2yN83KhmVEuLSlWzApx/RfM35YlZwUh/K2A8NI7AzWghyyAwABadtvbuYc7j2LEZzrES7eRgAgDo014oxBqCmCz2pmG670IRxCMKxiOwmpHkmRNqbSBuOUJDEzwMqCAk3+2xS2+APBhzNkq7VKYQsH/eBps9A2whc9Pgvd2l0lOSL+XdhF2BjxNI6vm4YlRm89OBlB+nGQjTekZbFIYOTigRbO0QBWVa1EXSsxJe9Y26bViW17cUzwgPMc4kRlhfW7qovudeKH3b2aL3wXIXKdpaXQQl76jVFJxst/f5DakBZJD0ncVvRcm9UfLwgMC3YD/n/cLiaoJldlv5ksGFgqBMIpIhoWE50MWEjFNg6VFw4dN4L6HcdPjKIhr0UG5G23x6uFEFXY20w+SQqcphXU7Q1l49LfO6JNtyLSrD+mJVqWLDhhVGEdzhiZA9w6PeClOIPKIpkOs3Bc+TQL0+KeKJ4sf0EdXR7XABO6fymFPAxdOgYm43obLsieGMteqPntSGJVAx9P0ZLW3FvKFX5y0wy3BHw"}}';
				var message = "dfspiughoTestNachrichtwoepsg!%&(/%&$/i";
				var privKey, pubKey, crypto;

				step(function loadDeps() {
					require.wrap(["crypto/publicKey", "crypto/privateKey", "crypto/crypto"], this);
				}, h.sF(function (PublicKey, PrivateKey, c) {
					crypto = c;
					pubKey = new PublicKey(keyJSON);
					privKey = new PrivateKey(keyJSON, password);
					privKey.setID(5);
					pubKey.setID(5);

					crypto.asymEncryptText(pubKey, message, this);
				}), h.sF(function (sk, encrypted) {
					crypto.decryptText(privKey, encrypted, sk[5], this);
				}), h.sF(function (decrypted) {
					expect(decrypted).to.be(message);
					this();
				}), done);
			});

			it("multiple symmetric encrypt", function (done) {
				var message = "dfspiughoTestNachrichtwoepsg!%&(/%&$/i";
				var sk = [];
				var crypto;

				step(function loadDeps() {
					require.wrap(["crypto/sessionKey", "crypto/crypto"], this);
				}, h.sF(function (SessionKey, c) {
					crypto = c;
					var i;
					for (i = 0; i < 5; i += 1) {
						sk.push(new SessionKey());
					}

					crypto.symEncryptText(sk, message, this);
				}), h.sF(function (encrypted) {
					var i;
					for (i = 0; i < sk.length; i += 1) {
						crypto.symDecryptText(sk[i], encrypted[i], this.parallel());
					}
				}), h.sF(function (decrypted) {
					var i;
					for (i = 0; i < sk.length; i += 1) {
						expect(decrypted[i]).to.be(message);
					}

					this();
				}), done);
			});

			it("encrypt session Key", function (done) {
				var keyJSON = '{"ee":"10001","n":"740d8ef1913de35f9e923b7da0c0102424501bd723644d5fbc55ab00c560d03eb977f7a2a06633c62fbe040c9db8ca81e34cd1ff7453c0bbb32b1c0ab4999fb80643df2fd5b7d0184ceee7398e2e56402245d48a751f0cd186ea7c61ac39ae6a4d22bde9007ba1f9452330b448386be61da649c876f7cad821ce7c03ee9aec0f","id":"null","priv":{"iv":"CQrUG7UmUM5PLFXG19GMzA","v":1,"iter":1000,"ks":128,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"lNepFJwzi1A","ct":"nykmwHQGJVU/Kk1FiovB3fZytKIaFXGrqvXAfnr2wqGl7+07yGEk8r/bSk6Hy49QX4Zolde7dcHWAog3VXKw9A0WGv/epiMpXx84UmFEOg9GzzAtBSqi+36LIO4VjAl5Zbuam5L4VYzMXuiXfOx96SsqR50pwcogLubzSRBQrZGP6zu8Z0juZySJU5AbgLiR/fgLsWR1OkQhmlYbYOKDvjuFRDZnlBfuQz+aJEiDK11WSReKIGQL/4pLPehWIwT/LH1+ukloEFIhEC/k9C3xI5VrupxFrKcrz/Vnu7gJ5WT4RFd/9OMrRBk3+0EGmgYkOVWLNDXePw/HdDq+CWRT0axiXo4U3OQvG+F6bLx8l2yN83KhmVEuLSlWzApx/RfM35YlZwUh/K2A8NI7AzWghyyAwABadtvbuYc7j2LEZzrES7eRgAgDo014oxBqCmCz2pmG670IRxCMKxiOwmpHkmRNqbSBuOUJDEzwMqCAk3+2xS2+APBhzNkq7VKYQsH/eBps9A2whc9Pgvd2l0lOSL+XdhF2BjxNI6vm4YlRm89OBlB+nGQjTekZbFIYOTigRbO0QBWVa1EXSsxJe9Y26bViW17cUzwgPMc4kRlhfW7qovudeKH3b2aL3wXIXKdpaXQQl76jVFJxst/f5DakBZJD0ncVvRcm9UfLwgMC3YD/n/cLiaoJldlv5ksGFgqBMIpIhoWE50MWEjFNg6VFw4dN4L6HcdPjKIhr0UG5G23x6uFEFXY20w+SQqcphXU7Q1l49LfO6JNtyLSrD+mJVqWLDhhVGEdzhiZA9w6PeClOIPKIpkOs3Bc+TQL0+KeKJ4sf0EdXR7XABO6fymFPAxdOgYm43obLsieGMteqPntSGJVAx9P0ZLW3FvKFX5y0wy3BHw"}}';
				var SessionKey;
				var privKey, pubKey, crypto;

				step(function loadDeps() {
					require.wrap(["crypto/publicKey", "crypto/privateKey", "crypto/sessionKey", "crypto/crypto"], this);
				}, h.sF(function (PublicKey, PrivateKey, sk, c) {
					SessionKey = sk;
					crypto = c;
					pubKey = new PublicKey(keyJSON);
					privKey = new PrivateKey(keyJSON, password);
					privKey.setID(5);
					pubKey.setID(5);

					var sessionKey = new SessionKey();

					crypto.encryptSessionKey(pubKey, sessionKey, this);
				}), h.sF(function (encryptedSK) {
					var sk = new SessionKey(encryptedSK);
					sk.decryptKey(privKey, this);
				}), h.sF(function (decrypted) {
					expect(decrypted).to.be.ok();
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
});*/