/*
 * Copyright (c) 2003-2005  Tom Wu (tjw@cs.Stanford.EDU) 
 * All Rights Reserved.
 *
 * Modified by Recurity Labs GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
 * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
 * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
 *
 * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
 * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
 * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
 * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
 * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * In addition, the following condition applies:
 *
 * All redistributions must retain an intact copy of this copyright notice
 * and disclaimer.
 */
// Extended JavaScript BN functions, required for RSA private ops.

// Version 1.1: new BigInteger("0", 10) returns "proper" zero
// Version 1.2: square() API, isProbablePrime fix
	define(['crypto/jsbn'], function (BigInteger) {
	// (public)
	function bnClone() { var r = nbi(); this.copyTo(r); return r; }

	// (public) return value as integer
	function bnIntValue() {
	  if(this.s < 0) {
		if(this.t == 1) return this[0]-this.DV;
		else if(this.t == 0) return -1;
	  }
	  else if(this.t == 1) return this[0];
	  else if(this.t == 0) return 0;
	  // assumes 16 < DB < 32
	  return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
	}

	// (public) return value as byte
	function bnByteValue() { return (this.t==0)?this.s:(this[0]<<24)>>24; }

	// (public) return value as short (assumes DB>=16)
	function bnShortValue() { return (this.t==0)?this.s:(this[0]<<16)>>16; }

	// (protected) return x s.t. r^x < DV
	function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

	// (public) 0 if this == 0, 1 if this > 0
	function bnSigNum() {
	  if(this.s < 0) return -1;
	  else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
	  else return 1;
	}

	// (protected) convert to radix string
	function bnpToRadix(b) {
	  if(b == null) b = 10;
	  if(this.signum() == 0 || b < 2 || b > 36) return "0";
	  var cs = this.chunkSize(b);
	  var a = Math.pow(b,cs);
	  var d = nbv(a), y = nbi(), z = nbi(), r = "";
	  this.divRemTo(d,y,z);
	  while(y.signum() > 0) {
		r = (a+z.intValue()).toString(b).substr(1) + r;
		y.divRemTo(d,y,z);
	  }
	  return z.intValue().toString(b) + r;
	}

	// (protected) convert from radix string
	function bnpFromRadix(s,b) {
	  this.fromInt(0);
	  if(b == null) b = 10;
	  var cs = this.chunkSize(b);
	  var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
	  for(var i = 0; i < s.length; ++i) {
		var x = intAt(s,i);
		if(x < 0) {
		  if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
		  continue;
		}
		w = b*w+x;
		if(++j >= cs) {
		  this.dMultiply(d);
		  this.dAddOffset(w,0);
		  j = 0;
		  w = 0;
		}
	  }
	  if(j > 0) {
		this.dMultiply(Math.pow(b,j));
		this.dAddOffset(w,0);
	  }
	  if(mi) BigInteger.ZERO.subTo(this,this);
	}

	// (protected) alternate constructor
	function bnpFromNumber(a,b,c) {
	  if("number" == typeof b) {
		// new BigInteger(int,int,RNG)
		if(a < 2) this.fromInt(1);
		else {
		  this.fromNumber(a, c);
		  this.makePrime(a, b);
		}
	  }
	  else {
		// new BigInteger(int,RNG)
		var x = new Array(), t = a&7;
		x.length = (a>>3)+1;
		b.nextBytes(x);
		if(t > 0) x[0] &= ((1<<t)-1); else x[0] = 0;
		this.fromString(x,256);
	  }
	}

	function bnMakePrime (a, b, steps) {
		var counter = 0;
		if(!this.testBit(a-1))	// force MSB set
			this.bitwiseTo(BigInteger.ONE.shiftLeft(a-1),op_or,this);

		if(this.isEven())
			this.dAddOffset(1,0); // force odd

		while(!this.isProbablePrime(b)) {
			counter ++;
			if (typeof steps === "number") {
				if (counter > steps) {
					return false;
				}
			}
			this.dAddOffset(2,0);
			if(this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a-1),this);
		}

		return true;
	}

	// (public) convert to bigendian byte array
	function bnToByteArray() {
	  var i = this.t, r = new Array();
	  r[0] = this.s;
	  var p = this.DB-(i*this.DB)%8, d, k = 0;
	  if(i-- > 0) {
		if(p < this.DB && (d = this[i]>>p) != (this.s&this.DM)>>p)
		  r[k++] = d|(this.s<<(this.DB-p));
		while(i >= 0) {
		  if(p < 8) {
			d = (this[i]&((1<<p)-1))<<(8-p);
			d |= this[--i]>>(p+=this.DB-8);
		  }
		  else {
			d = (this[i]>>(p-=8))&0xff;
			if(p <= 0) { p += this.DB; --i; }
		  }
		  //if((d&0x80) != 0) d |= -256;
		  //if(k == 0 && (this.s&0x80) != (d&0x80)) ++k;
		  if(k > 0 || d != this.s) r[k++] = d;
		}
	  }
	  return r;
	}

	function bnEquals(a) { return(this.compareTo(a)==0); }
	function bnMin(a) { return(this.compareTo(a)<0)?this:a; }
	function bnMax(a) { return(this.compareTo(a)>0)?this:a; }

	// (protected) r = this op a (bitwise)
	function bnpBitwiseTo(a,op,r) {
	  var i, f, m = Math.min(a.t,this.t);
	  for(i = 0; i < m; ++i) r[i] = op(this[i],a[i]);
	  if(a.t < this.t) {
		f = a.s&this.DM;
		for(i = m; i < this.t; ++i) r[i] = op(this[i],f);
		r.t = this.t;
	  }
	  else {
		f = this.s&this.DM;
		for(i = m; i < a.t; ++i) r[i] = op(f,a[i]);
		r.t = a.t;
	  }
	  r.s = op(this.s,a.s);
	  r.clamp();
	}

	// (public) this & a
	function op_and(x,y) { return x&y; }
	function bnAnd(a) { var r = nbi(); this.bitwiseTo(a,op_and,r); return r; }

	// (public) this | a
	function op_or(x,y) { return x|y; }
	function bnOr(a) { var r = nbi(); this.bitwiseTo(a,op_or,r); return r; }

	// (public) this ^ a
	function op_xor(x,y) { return x^y; }
	function bnXor(a) { var r = nbi(); this.bitwiseTo(a,op_xor,r); return r; }

	// (public) this & ~a
	function op_andnot(x,y) { return x&~y; }
	function bnAndNot(a) { var r = nbi(); this.bitwiseTo(a,op_andnot,r); return r; }

	// (public) ~this
	function bnNot() {
	  var r = nbi();
	  for(var i = 0; i < this.t; ++i) r[i] = this.DM&~this[i];
	  r.t = this.t;
	  r.s = ~this.s;
	  return r;
	}

	// (public) this << n
	function bnShiftLeft(n) {
	  var r = nbi();
	  if(n < 0) this.rShiftTo(-n,r); else this.lShiftTo(n,r);
	  return r;
	}

	// (public) this >> n
	function bnShiftRight(n) {
	  var r = nbi();
	  if(n < 0) this.lShiftTo(-n,r); else this.rShiftTo(n,r);
	  return r;
	}

	// return index of lowest 1-bit in x, x < 2^31
	function lbit(x) {
	  if(x == 0) return -1;
	  var r = 0;
	  if((x&0xffff) == 0) { x >>= 16; r += 16; }
	  if((x&0xff) == 0) { x >>= 8; r += 8; }
	  if((x&0xf) == 0) { x >>= 4; r += 4; }
	  if((x&3) == 0) { x >>= 2; r += 2; }
	  if((x&1) == 0) ++r;
	  return r;
	}

	// (public) returns index of lowest 1-bit (or -1 if none)
	function bnGetLowestSetBit() {
	  for(var i = 0; i < this.t; ++i)
		if(this[i] != 0) return i*this.DB+lbit(this[i]);
	  if(this.s < 0) return this.t*this.DB;
	  return -1;
	}

	// return number of 1 bits in x
	function cbit(x) {
	  var r = 0;
	  while(x != 0) { x &= x-1; ++r; }
	  return r;
	}

	// (public) return number of set bits
	function bnBitCount() {
	  var r = 0, x = this.s&this.DM;
	  for(var i = 0; i < this.t; ++i) r += cbit(this[i]^x);
	  return r;
	}

	// (public) true iff nth bit is set
	function bnTestBit(n) {
	  var j = Math.floor(n/this.DB);
	  if(j >= this.t) return(this.s!=0);
	  return((this[j]&(1<<(n%this.DB)))!=0);
	}

	// (protected) this op (1<<n)
	function bnpChangeBit(n,op) {
	  var r = BigInteger.ONE.shiftLeft(n);
	  this.bitwiseTo(r,op,r);
	  return r;
	}

	// (public) this | (1<<n)
	function bnSetBit(n) { return this.changeBit(n,op_or); }

	// (public) this & ~(1<<n)
	function bnClearBit(n) { return this.changeBit(n,op_andnot); }

	// (public) this ^ (1<<n)
	function bnFlipBit(n) { return this.changeBit(n,op_xor); }

	// (protected) r = this + a
	function bnpAddTo(a,r) {
	  var i = 0, c = 0, m = Math.min(a.t,this.t);
	  while(i < m) {
		c += this[i]+a[i];
		r[i++] = c&this.DM;
		c >>= this.DB;
	  }
	  if(a.t < this.t) {
		c += a.s;
		while(i < this.t) {
		  c += this[i];
		  r[i++] = c&this.DM;
		  c >>= this.DB;
		}
		c += this.s;
	  }
	  else {
		c += this.s;
		while(i < a.t) {
		  c += a[i];
		  r[i++] = c&this.DM;
		  c >>= this.DB;
		}
		c += a.s;
	  }
	  r.s = (c<0)?-1:0;
	  if(c > 0) r[i++] = c;
	  else if(c < -1) r[i++] = this.DV+c;
	  r.t = i;
	  r.clamp();
	}

	// (public) this + a
	function bnAdd(a) { var r = nbi(); this.addTo(a,r); return r; }

	// (public) this - a
	function bnSubtract(a) { var r = nbi(); this.subTo(a,r); return r; }

	// (public) this * a
	function bnMultiply(a) { var r = nbi(); this.multiplyTo(a,r); return r; }

	// (public) this^2
	function bnSquare() { var r = nbi(); this.squareTo(r); return r; }

	// (public) this / a
	function bnDivide(a) { var r = nbi(); this.divRemTo(a,r,null); return r; }

	// (public) this % a
	function bnRemainder(a) { var r = nbi(); this.divRemTo(a,null,r); return r; }

	// (public) [this/a,this%a]
	function bnDivideAndRemainder(a) {
	  var q = nbi(), r = nbi();
	  this.divRemTo(a,q,r);
	  return new Array(q,r);
	}

	// (protected) this *= n, this >= 0, 1 < n < DV
	function bnpDMultiply(n) {
	  this[this.t] = this.am(0,n-1,this,0,0,this.t);
	  ++this.t;
	  this.clamp();
	}

	// (protected) this += n << w words, this >= 0
	function bnpDAddOffset(n,w) {
	  if(n == 0) return;
	  while(this.t <= w) this[this.t++] = 0;
	  this[w] += n;
	  while(this[w] >= this.DV) {
		this[w] -= this.DV;
		if(++w >= this.t) this[this.t++] = 0;
		++this[w];
	  }
	}

	// A "null" reducer
	function NullExp() {}
	function nNop(x) { return x; }
	function nMulTo(x,y,r) { x.multiplyTo(y,r); }
	function nSqrTo(x,r) { x.squareTo(r); }

	NullExp.prototype.convert = nNop;
	NullExp.prototype.revert = nNop;
	NullExp.prototype.mulTo = nMulTo;
	NullExp.prototype.sqrTo = nSqrTo;

	// (public) this^e
	function bnPow(e) { return this.exp(e,new NullExp()); }

	// (protected) r = lower n words of "this * a", a.t <= n
	// "this" should be the larger one if appropriate.
	function bnpMultiplyLowerTo(a,n,r) {
	  var i = Math.min(this.t+a.t,n);
	  r.s = 0; // assumes a,this >= 0
	  r.t = i;
	  while(i > 0) r[--i] = 0;
	  var j;
	  for(j = r.t-this.t; i < j; ++i) r[i+this.t] = this.am(0,a[i],r,i,0,this.t);
	  for(j = Math.min(a.t,n); i < j; ++i) this.am(0,a[i],r,i,0,n-i);
	  r.clamp();
	}

	// (protected) r = "this * a" without lower n words, n > 0
	// "this" should be the larger one if appropriate.
	function bnpMultiplyUpperTo(a,n,r) {
	  --n;
	  var i = r.t = this.t+a.t-n;
	  r.s = 0; // assumes a,this >= 0
	  while(--i >= 0) r[i] = 0;
	  for(i = Math.max(n-this.t,0); i < a.t; ++i)
		r[this.t+i-n] = this.am(n-i,a[i],r,0,0,this.t+i-n);
	  r.clamp();
	  r.drShiftTo(1,r);
	}

	// Barrett modular reduction
	function Barrett(m) {
	  // setup Barrett
	  this.r2 = nbi();
	  this.q3 = nbi();
	  BigInteger.ONE.dlShiftTo(2*m.t,this.r2);
	  this.mu = this.r2.divide(m);
	  this.m = m;
	}

	function barrettConvert(x) {
	  if(x.s < 0 || x.t > 2*this.m.t) return x.mod(this.m);
	  else if(x.compareTo(this.m) < 0) return x;
	  else { var r = nbi(); x.copyTo(r); this.reduce(r); return r; }
	}

	function barrettRevert(x) { return x; }

	// x = x mod m (HAC 14.42)
	function barrettReduce(x) {
	  x.drShiftTo(this.m.t-1,this.r2);
	  if(x.t > this.m.t+1) { x.t = this.m.t+1; x.clamp(); }
	  this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3);
	  this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);
	  while(x.compareTo(this.r2) < 0) x.dAddOffset(1,this.m.t+1);
	  x.subTo(this.r2,x);
	  while(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
	}

	// r = x^2 mod m; x != r
	function barrettSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

	// r = x*y mod m; x,y != r
	function barrettMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

	Barrett.prototype.convert = barrettConvert;
	Barrett.prototype.revert = barrettRevert;
	Barrett.prototype.reduce = barrettReduce;
	Barrett.prototype.mulTo = barrettMulTo;
	Barrett.prototype.sqrTo = barrettSqrTo;

	// (public) this^e % m (HAC 14.85)
	function bnModPow(e,m) {
	  var i = e.bitLength(), k, r = nbv(1), z;
	  if(i <= 0) return r;
	  else if(i < 18) k = 1;
	  else if(i < 48) k = 3;
	  else if(i < 144) k = 4;
	  else if(i < 768) k = 5;
	  else k = 6;
	  if(i < 8)
		z = new Classic(m);
	  else if(m.isEven())
		z = new Barrett(m);
	  else
		z = new Montgomery(m);

	  // precomputation
	  var g = new Array(), n = 3, k1 = k-1, km = (1<<k)-1;
	  g[1] = z.convert(this);
	  if(k > 1) {
		var g2 = nbi();
		z.sqrTo(g[1],g2);
		while(n <= km) {
		  g[n] = nbi();
		  z.mulTo(g2,g[n-2],g[n]);
		  n += 2;
		}
	  }

	  var j = e.t-1, w, is1 = true, r2 = nbi(), t;
	  i = nbits(e[j])-1;
	  while(j >= 0) {
		if(i >= k1) w = (e[j]>>(i-k1))&km;
		else {
		  w = (e[j]&((1<<(i+1))-1))<<(k1-i);
		  if(j > 0) w |= e[j-1]>>(this.DB+i-k1);
		}

		n = k;
		while((w&1) == 0) { w >>= 1; --n; }
		if((i -= n) < 0) { i += this.DB; --j; }
		if(is1) {	// ret == 1, don't bother squaring or multiplying it
		  g[w].copyTo(r);
		  is1 = false;
		}
		else {
		  while(n > 1) { z.sqrTo(r,r2); z.sqrTo(r2,r); n -= 2; }
		  if(n > 0) z.sqrTo(r,r2); else { t = r; r = r2; r2 = t; }
		  z.mulTo(r2,g[w],r);
		}

		while(j >= 0 && (e[j]&(1<<i)) == 0) {
		  z.sqrTo(r,r2); t = r; r = r2; r2 = t;
		  if(--i < 0) { i = this.DB-1; --j; }
		}
	  }
	  return z.revert(r);
	}

	// (public) gcd(this,a) (HAC 14.54)
	function bnGCD(a) {
	  var x = (this.s<0)?this.negate():this.clone();
	  var y = (a.s<0)?a.negate():a.clone();
	  if(x.compareTo(y) < 0) { var t = x; x = y; y = t; }
	  var i = x.getLowestSetBit(), g = y.getLowestSetBit();
	  if(g < 0) return x;
	  if(i < g) g = i;
	  if(g > 0) {
		x.rShiftTo(g,x);
		y.rShiftTo(g,y);
	  }
	  while(x.signum() > 0) {
		if((i = x.getLowestSetBit()) > 0) x.rShiftTo(i,x);
		if((i = y.getLowestSetBit()) > 0) y.rShiftTo(i,y);
		if(x.compareTo(y) >= 0) {
		  x.subTo(y,x);
		  x.rShiftTo(1,x);
		}
		else {
		  y.subTo(x,y);
		  y.rShiftTo(1,y);
		}
	  }
	  if(g > 0) y.lShiftTo(g,y);
	  return y;
	}

	// (protected) this % n, n < 2^26
	function bnpModInt(n) {
	  if(n <= 0) return 0;
	  var d = this.DV%n, r = (this.s<0)?n-1:0;
	  if(this.t > 0)
		if(d == 0) r = this[0]%n;
		else for(var i = this.t-1; i >= 0; --i) r = (d*r+this[i])%n;
	  return r;
	}

	// (public) 1/this % m (HAC 14.61)
	function bnModInverse(m) {
	  var ac = m.isEven();
	  if((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
	  var u = m.clone(), v = this.clone();
	  var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
	  while(u.signum() != 0) {
		while(u.isEven()) {
		  u.rShiftTo(1,u);
		  if(ac) {
			if(!a.isEven() || !b.isEven()) { a.addTo(this,a); b.subTo(m,b); }
			a.rShiftTo(1,a);
		  }
		  else if(!b.isEven()) b.subTo(m,b);
		  b.rShiftTo(1,b);
		}
		while(v.isEven()) {
		  v.rShiftTo(1,v);
		  if(ac) {
			if(!c.isEven() || !d.isEven()) { c.addTo(this,c); d.subTo(m,d); }
			c.rShiftTo(1,c);
		  }
		  else if(!d.isEven()) d.subTo(m,d);
		  d.rShiftTo(1,d);
		}
		if(u.compareTo(v) >= 0) {
		  u.subTo(v,u);
		  if(ac) a.subTo(c,a);
		  b.subTo(d,b);
		}
		else {
		  v.subTo(u,v);
		  if(ac) c.subTo(a,c);
		  d.subTo(b,d);
		}
	  }
	  if(v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
	  if(d.compareTo(m) >= 0) return d.subtract(m);
	  if(d.signum() < 0) d.addTo(m,d); else return d;
	  if(d.signum() < 0) return d.add(m); else return d;
	}

	var lowprimes = [2,  3,  5,  7, 11, 13, 17, 19, 23, 29,  31, 37, 41, 43, 47, 53, 59, 61, 67, 71,  73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997, 1009, 1013, 1019, 1021, 1031, 1033, 1039, 1049, 1051, 1061, 1063, 1069, 1087, 1091, 1093, 1097, 1103, 1109, 1117, 1123, 1129, 1151, 1153, 1163, 1171, 1181, 1187, 1193, 1201, 1213, 1217, 1223, 1229, 1231, 1237, 1249, 1259, 1277, 1279, 1283, 1289, 1291, 1297, 1301, 1303, 1307, 1319, 1321, 1327, 1361, 1367, 1373, 1381, 1399, 1409, 1423, 1427, 1429, 1433, 1439, 1447, 1451, 1453, 1459, 1471, 1481, 1483, 1487, 1489, 1493, 1499, 1511, 1523, 1531, 1543, 1549, 1553, 1559, 1567, 1571, 1579, 1583, 1597, 1601, 1607, 1609, 1613, 1619, 1621, 1627, 1637, 1657, 1663, 1667, 1669, 1693, 1697, 1699, 1709, 1721, 1723, 1733, 1741, 1747, 1753, 1759, 1777, 1783, 1787, 1789, 1801, 1811, 1823, 1831, 1847, 1861, 1867, 1871, 1873, 1877, 1879, 1889, 1901, 1907, 1913, 1931, 1933, 1949, 1951, 1973, 1979, 1987, 1993, 1997, 1999, 2003, 2011, 2017, 2027, 2029, 2039, 2053, 2063, 2069, 2081, 2083, 2087, 2089, 2099, 2111, 2113, 2129, 2131, 2137, 2141, 2143, 2153, 2161, 2179, 2203, 2207, 2213, 2221, 2237, 2239, 2243, 2251, 2267, 2269, 2273, 2281, 2287, 2293, 2297, 2309, 2311, 2333, 2339, 2341, 2347, 2351, 2357, 2371, 2377, 2381, 2383, 2389, 2393, 2399, 2411, 2417, 2423, 2437, 2441, 2447, 2459, 2467, 2473, 2477, 2503, 2521, 2531, 2539, 2543, 2549, 2551, 2557, 2579, 2591, 2593, 2609, 2617, 2621, 2633, 2647, 2657, 2659, 2663, 2671, 2677, 2683, 2687, 2689, 2693, 2699, 2707, 2711, 2713, 2719, 2729, 2731, 2741, 2749, 2753, 2767, 2777, 2789, 2791, 2797, 2801, 2803, 2819, 2833, 2837, 2843, 2851, 2857, 2861, 2879, 2887, 2897, 2903, 2909, 2917, 2927, 2939, 2953, 2957, 2963, 2969, 2971, 2999, 3001, 3011, 3019, 3023, 3037, 3041, 3049, 3061, 3067, 3079, 3083, 3089, 3109, 3119, 3121, 3137, 3163, 3167, 3169, 3181, 3187, 3191, 3203, 3209, 3217, 3221, 3229, 3251, 3253, 3257, 3259, 3271, 3299, 3301, 3307, 3313, 3319, 3323, 3329, 3331, 3343, 3347, 3359, 3361, 3371, 3373, 3389, 3391, 3407, 3413, 3433, 3449, 3457, 3461, 3463, 3467, 3469, 3491, 3499, 3511, 3517, 3527, 3529, 3533, 3539, 3541, 3547, 3557, 3559, 3571, 3581, 3583, 3593, 3607, 3613, 3617, 3623, 3631, 3637, 3643, 3659, 3671, 3673, 3677, 3691, 3697, 3701, 3709, 3719, 3727, 3733, 3739, 3761, 3767, 3769, 3779, 3793, 3797, 3803, 3821, 3823, 3833, 3847, 3851, 3853, 3863, 3877, 3881, 3889, 3907, 3911, 3917, 3919, 3923, 3929, 3931, 3943, 3947, 3967, 3989, 4001, 4003, 4007, 4013, 4019, 4021, 4027, 4049, 4051, 4057, 4073, 4079, 4091, 4093, 4099, 4111, 4127, 4129, 4133, 4139, 4153, 4157, 4159, 4177, 4201, 4211, 4217, 4219, 4229, 4231, 4241, 4243, 4253, 4259, 4261, 4271, 4273, 4283, 4289, 4297, 4327, 4337, 4339, 4349, 4357, 4363, 4373, 4391, 4397, 4409, 4421, 4423, 4441, 4447, 4451, 4457, 4463, 4481, 4483, 4493, 4507, 4513, 4517, 4519, 4523, 4547, 4549, 4561, 4567, 4583, 4591, 4597, 4603, 4621, 4637, 4639, 4643, 4649, 4651, 4657, 4663, 4673, 4679, 4691, 4703, 4721, 4723, 4729, 4733, 4751, 4759, 4783, 4787, 4789, 4793, 4799, 4801, 4813, 4817, 4831, 4861, 4871, 4877, 4889, 4903, 4909, 4919, 4931, 4933, 4937, 4943, 4951, 4957, 4967, 4969, 4973, 4987, 4993, 4999, 5003, 5009, 5011, 5021, 5023, 5039, 5051, 5059, 5077, 5081, 5087, 5099, 5101, 5107, 5113, 5119, 5147, 5153, 5167, 5171, 5179, 5189, 5197, 5209, 5227, 5231, 5233, 5237, 5261, 5273, 5279, 5281, 5297, 5303, 5309, 5323, 5333, 5347, 5351, 5381, 5387, 5393, 5399, 5407, 5413, 5417, 5419, 5431, 5437, 5441, 5443, 5449, 5471, 5477, 5479, 5483, 5501, 5503, 5507, 5519, 5521, 5527, 5531, 5557, 5563, 5569, 5573, 5581, 5591, 5623, 5639, 5641, 5647, 5651, 5653, 5657, 5659, 5669, 5683, 5689, 5693, 5701, 5711, 5717, 5737, 5741, 5743, 5749, 5779, 5783, 5791, 5801, 5807, 5813, 5821, 5827, 5839, 5843, 5849, 5851, 5857, 5861, 5867, 5869, 5879, 5881, 5897, 5903, 5923, 5927, 5939, 5953, 5981, 5987, 6007, 6011, 6029, 6037, 6043, 6047, 6053, 6067, 6073, 6079, 6089, 6091, 6101, 6113, 6121, 6131, 6133, 6143, 6151, 6163, 6173, 6197, 6199, 6203, 6211, 6217, 6221, 6229, 6247, 6257, 6263, 6269, 6271, 6277, 6287, 6299, 6301, 6311, 6317, 6323, 6329, 6337, 6343, 6353, 6359, 6361, 6367, 6373, 6379, 6389, 6397, 6421, 6427, 6449, 6451, 6469, 6473, 6481, 6491, 6521, 6529, 6547, 6551, 6553, 6563, 6569, 6571, 6577, 6581, 6599, 6607, 6619, 6637, 6653, 6659, 6661, 6673, 6679, 6689, 6691, 6701, 6703, 6709, 6719, 6733, 6737, 6761, 6763, 6779, 6781, 6791, 6793, 6803, 6823, 6827, 6829, 6833, 6841, 6857, 6863, 6869, 6871, 6883, 6899, 6907, 6911, 6917, 6947, 6949, 6959, 6961, 6967, 6971, 6977, 6983, 6991, 6997, 7001, 7013, 7019, 7027, 7039, 7043, 7057, 7069, 7079, 7103, 7109, 7121, 7127, 7129, 7151, 7159, 7177, 7187, 7193, 7207, 7211, 7213, 7219, 7229, 7237, 7243, 7247, 7253, 7283, 7297, 7307, 7309, 7321, 7331, 7333, 7349, 7351, 7369, 7393, 7411, 7417, 7433, 7451, 7457, 7459, 7477, 7481, 7487, 7489, 7499, 7507, 7517, 7523, 7529, 7537, 7541, 7547, 7549, 7559, 7561, 7573, 7577, 7583, 7589, 7591, 7603, 7607, 7621, 7639, 7643, 7649, 7669, 7673, 7681, 7687, 7691, 7699, 7703, 7717, 7723, 7727, 7741, 7753, 7757, 7759, 7789, 7793, 7817, 7823, 7829, 7841, 7853, 7867, 7873, 7877, 7879, 7883, 7901, 7907, 7919];
	var lplim = (1<<26)/lowprimes[lowprimes.length-1];

	// (public) test primality with certainty >= 1-.5^t
	function bnIsProbablePrime(t) {
	  var i, x = this.abs();
	  if(x.t == 1 && x[0] <= lowprimes[lowprimes.length-1]) {
		for(i = 0; i < lowprimes.length; ++i)
		  if(x[0] == lowprimes[i]) return true;
		return false;
	  }
	  if(x.isEven()) return false;
	  i = 1;
	  while(i < lowprimes.length) {
		var m = lowprimes[i], j = i+1;
		while(j < lowprimes.length && m < lplim) m *= lowprimes[j++];
		m = x.modInt(m);
		while(i < j) if(m%lowprimes[i++] == 0) return false;
	  }
	  return x.millerRabin(t);
	}

	/* added by Recurity Labs */

	function nbits(x) {
		var n = 1, t;
		if ((t = x >>> 16) != 0) {
			x = t;
			n += 16;
		}
		if ((t = x >> 8) != 0) {
			x = t;
			n += 8;
		}
		if ((t = x >> 4) != 0) {
			x = t;
			n += 4;
		}
		if ((t = x >> 2) != 0) {
			x = t;
			n += 2;
		}
		if ((t = x >> 1) != 0) {
			x = t;
			n += 1;
		}
		return n;
	}

	/**
	 * convert an array of integers(0.255) to a string 
	 * @param [Array [Integer 0..255]] array of (binary) integers to convert
	 * @return [String] string representation of the array
	 */
	var bin2str = function(bin) {
		var result = [];
		for (var i = 0; i < bin.length; i++) {
			result.push(String.fromCharCode(bin[i]));
		}
		return result.join('');
	};

	function bnToMPI () {
		var ba = this.toByteArray();
		var size = (ba.length-1)*8+nbits(ba[0]);
		var result = "";
		result += String.fromCharCode((size & 0xFF00) >> 8);
		result += String.fromCharCode(size & 0xFF);
		result += bin2str(ba);
		return result;
	}
	/* END of addition */

	// (protected) true if probably prime (HAC 4.24, Miller-Rabin)
	function bnpMillerRabin(t) {
	  var n1 = this.subtract(BigInteger.ONE);
	  var k = n1.getLowestSetBit();
	  if(k <= 0) return false;
	  var r = n1.shiftRight(k);
	  t = (t+1)>>1;
	  if(t > lowprimes.length) t = lowprimes.length;
	  var a = nbi();
	  for(var i = 0; i < t; ++i) {
		//Pick bases at random, instead of starting at 2
		a.fromInt(lowprimes[Math.floor(Math.random()*lowprimes.length)]);
		var y = a.modPow(r,this);
		if(y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
		  var j = 1;
		  while(j++ < k && y.compareTo(n1) != 0) {
			y = y.modPowInt(2,this);
			if(y.compareTo(BigInteger.ONE) == 0) return false;
		  }
		  if(y.compareTo(n1) != 0) return false;
		}
	  }
	  return true;
	}

	// protected
	BigInteger.prototype.chunkSize = bnpChunkSize;
	BigInteger.prototype.toRadix = bnpToRadix;
	BigInteger.prototype.fromRadix = bnpFromRadix;
	BigInteger.prototype.fromNumber = bnpFromNumber;
	BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
	BigInteger.prototype.changeBit = bnpChangeBit;
	BigInteger.prototype.addTo = bnpAddTo;
	BigInteger.prototype.dMultiply = bnpDMultiply;
	BigInteger.prototype.dAddOffset = bnpDAddOffset;
	BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
	BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
	BigInteger.prototype.modInt = bnpModInt;
	BigInteger.prototype.millerRabin = bnpMillerRabin;

	// public
	BigInteger.prototype.makePrime = bnMakePrime;
	BigInteger.prototype.clone = bnClone;
	BigInteger.prototype.intValue = bnIntValue;
	BigInteger.prototype.byteValue = bnByteValue;
	BigInteger.prototype.shortValue = bnShortValue;
	BigInteger.prototype.signum = bnSigNum;
	BigInteger.prototype.toByteArray = bnToByteArray;
	BigInteger.prototype.equals = bnEquals;
	BigInteger.prototype.min = bnMin;
	BigInteger.prototype.max = bnMax;
	BigInteger.prototype.and = bnAnd;
	BigInteger.prototype.or = bnOr;
	BigInteger.prototype.xor = bnXor;
	BigInteger.prototype.andNot = bnAndNot;
	BigInteger.prototype.not = bnNot;
	BigInteger.prototype.shiftLeft = bnShiftLeft;
	BigInteger.prototype.shiftRight = bnShiftRight;
	BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
	BigInteger.prototype.bitCount = bnBitCount;
	BigInteger.prototype.testBit = bnTestBit;
	BigInteger.prototype.setBit = bnSetBit;
	BigInteger.prototype.clearBit = bnClearBit;
	BigInteger.prototype.flipBit = bnFlipBit;
	BigInteger.prototype.add = bnAdd;
	BigInteger.prototype.subtract = bnSubtract;
	BigInteger.prototype.multiply = bnMultiply;
	BigInteger.prototype.divide = bnDivide;
	BigInteger.prototype.remainder = bnRemainder;
	BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
	BigInteger.prototype.modPow = bnModPow;
	BigInteger.prototype.modInverse = bnModInverse;
	BigInteger.prototype.pow = bnPow;
	BigInteger.prototype.gcd = bnGCD;
	BigInteger.prototype.isProbablePrime = bnIsProbablePrime;
	BigInteger.prototype.toMPI = bnToMPI;

	// JSBN-specific extension
	BigInteger.prototype.square = bnSquare;
});