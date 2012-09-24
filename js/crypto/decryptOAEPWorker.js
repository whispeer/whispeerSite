"use strict";

importScripts("jsbn.js", "jsbn2.js", "rsa.js");

var toDecrypt = [];
var toDecryptPriority = [];

self.onmessage = function (event) {
	var c = event.data.c;
	var d = event.data.d;
	var p = event.data.p;
	var q = event.data.q;
	var u = event.data.u;
	var n = event.data.n;
	var l = event.data.l;

	var rsa = new RSA();
	
	rsa.decryptOAEP(c, d, p, q, u, n, l);

	self.postMessage();
};