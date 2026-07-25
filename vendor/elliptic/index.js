// Security-hardened, dependency-free replacement for the `elliptic` package.
//
// The upstream `elliptic` package is intentionally avoided (see the `**/elliptic`
// resolution in package.json). This shim reimplements the subset of elliptic's
// `ec('secp256k1')` API that our dependency tree actually uses, backed by the
// audited `@noble/secp256k1` (group operations, signing, recovery) and `bn.js`
// (field/scalar arithmetic via its built-in `k256` reduction context).
//
// It must satisfy two very different consumers:
//   1. High-level web3 libs that call keyFromPrivate/keyFromPublic/sign/derive.
//   2. The `secp256k1` npm package's pure-JS fallback (`lib/elliptic.js`), which
//      is what runs in the browser and needs the full `ec.curve` (n/p/b/g/red),
//      the `BN` class (via `ec.curve.n.constructor`), and curve-point math.

const secp = require('@noble/secp256k1');
const BN = require('bn.js');
const { createHmac, createHash } = require('crypto');

// secp256k1 domain parameters.
const N_HEX = 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141';
const P_HEX = 'fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f';
const GX_HEX = '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const GY_HEX = '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8';

const RED = BN.red('k256');
const N = new BN(N_HEX, 16);
const N_BIG = BigInt('0x' + N_HEX);

// @noble v1 requires a synchronous HMAC-SHA256 for signSync/RFC6979 nonces.
function ensureHmac() {
  if (!secp.utils.hmacSha256Sync) {
    secp.utils.hmacSha256Sync = (key, ...messages) => {
      const hmac = createHmac('sha256', Buffer.from(key));
      for (const message of messages) hmac.update(Buffer.from(message));
      return Uint8Array.from(hmac.digest());
    };
  }
}
ensureHmac();

const toHex = (bytes) => Buffer.from(bytes).toString('hex');

const toBytes = (value) => {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return Uint8Array.from(value);
  if (typeof value === 'string') {
    const hex = value.startsWith('0x') ? value.slice(2) : value;
    return Uint8Array.from(Buffer.from(hex, 'hex'));
  }
  if (value && typeof value.toArray === 'function') {
    // bn.js BN instance.
    return Uint8Array.from(value.toArray('be', 32));
  }
  if (typeof value === 'bigint') {
    return leftpad(Uint8Array.from(Buffer.from(value.toString(16).padStart(2, '0'), 'hex')), 32);
  }
  return Uint8Array.from(value);
};

function leftpad(u8, len) {
  if (u8.length === len) return u8;
  const out = new Uint8Array(len);
  out.set(u8.subarray(Math.max(0, u8.length - len)), Math.max(0, len - u8.length));
  return out;
}

// Normalize an r/s value (Uint8Array | Array | hex | bn.js BN) to 32 bytes.
function to32(value) {
  if (value instanceof Uint8Array) return leftpad(value, 32);
  if (Array.isArray(value)) return leftpad(Uint8Array.from(value), 32);
  if (typeof value === 'string') {
    const hex = value.startsWith('0x') ? value.slice(2) : value;
    return Uint8Array.from(Buffer.from(hex.padStart(64, '0'), 'hex'));
  }
  if (value && typeof value.toArray === 'function') return Uint8Array.from(value.toArray('be', 32));
  return leftpad(Uint8Array.from(value), 32);
}

// Private key (BN | bytes | hex | Array) -> 32-byte big-endian Uint8Array.
function normPriv(priv) {
  if (priv == null) return undefined;
  if (priv instanceof Uint8Array) return leftpad(priv, 32);
  if (Array.isArray(priv)) return leftpad(Uint8Array.from(priv), 32);
  if (typeof priv === 'string') {
    const hex = priv.startsWith('0x') ? priv.slice(2) : priv;
    return Uint8Array.from(Buffer.from(hex.padStart(64, '0'), 'hex'));
  }
  if (typeof priv.toArray === 'function') return Uint8Array.from(priv.toArray('be', 32));
  return leftpad(Uint8Array.from(priv), 32);
}

const bnToBig = (bn) => BigInt('0x' + (bn.toString(16) || '0'));

// A curve point, coordinate-compatible with elliptic (x/y are reduced bn.js BNs).
class Point {
  constructor(x, y, inf) {
    this.x = x || null;
    this.y = y || null;
    this.inf = !!inf;
  }

  static infinity() {
    return new Point(null, null, true);
  }

  static fromNoble(np) {
    if (!np || (np.equals && np.equals(secp.Point.ZERO))) return Point.infinity();
    let raw;
    try {
      raw = np.toRawBytes(false);
    } catch (err) {
      return Point.infinity();
    }
    const x = new BN(toHex(raw.subarray(1, 33)), 16).toRed(RED);
    const y = new BN(toHex(raw.subarray(33, 65)), 16).toRed(RED);
    return new Point(x, y, false);
  }

  static fromBytes(bytes) {
    return Point.fromNoble(secp.Point.fromHex(toHex(toBytes(bytes))));
  }

  toNoble() {
    if (this.inf) return secp.Point.ZERO;
    const xh = this.x.fromRed().toString(16).padStart(64, '0');
    const yh = this.y.fromRed().toString(16).padStart(64, '0');
    return secp.Point.fromHex('04' + xh + yh);
  }

  add(other) {
    return Point.fromNoble(this.toNoble().add(other.toNoble()));
  }

  mul(k) {
    let scalar = k && typeof k.toArray === 'function' ? bnToBig(k) : BigInt(k);
    scalar = ((scalar % N_BIG) + N_BIG) % N_BIG;
    if (scalar === 0n) return Point.infinity();
    return Point.fromNoble(this.toNoble().multiply(scalar));
  }

  getX() {
    return this.x.fromRed();
  }

  getY() {
    return this.y.fromRed();
  }

  isInfinity() {
    return this.inf;
  }

  eq(other) {
    if (this.inf || other.inf) return this.inf === other.inf;
    return this.getX().cmp(other.getX()) === 0 && this.getY().cmp(other.getY()) === 0;
  }

  encode(enc, compressed) {
    const x = this.getX().toArray('be', 32);
    let out;
    if (compressed) {
      out = [this.getY().isOdd() ? 0x03 : 0x02].concat(x);
    } else {
      out = [0x04].concat(x, this.getY().toArray('be', 32));
    }
    return enc === 'hex' ? Buffer.from(out).toString('hex') : out;
  }

  encodeCompressed(enc) {
    return this.encode(enc, true);
  }
}

const curve = {
  n: N,
  p: new BN(P_HEX, 16),
  red: RED,
  b: new BN(7).toRed(RED),
  g: new Point(new BN(GX_HEX, 16).toRed(RED), new BN(GY_HEX, 16).toRed(RED), false),
};

// Accept a public key as a Point, {x, y} (bn.js BNs), bytes, hex, or Array.
function normPub(pub) {
  if (pub instanceof Point) return pub;
  if (pub && pub.x !== undefined && pub.y !== undefined && typeof pub.x !== 'number') {
    let x = pub.x;
    let y = pub.y;
    if (!x.red) x = x.toRed(RED);
    if (!y.red) y = y.toRed(RED);
    return new Point(x, y, false);
  }
  return Point.fromBytes(pub);
}

function signImpl(privBytes, msg, enc, options) {
  if (enc && typeof enc === 'object' && options === undefined) {
    options = enc;
    enc = undefined;
  }
  options = options || {};
  ensureHmac();
  const canonical = options.canonical !== false;
  const [sig, recid] = secp.signSync(toBytes(msg), privBytes, {
    canonical,
    der: false,
    recovered: true,
  });
  return {
    r: new BN(toHex(sig.subarray(0, 32)), 16),
    s: new BN(toHex(sig.subarray(32, 64)), 16),
    recoveryParam: recid,
  };
}

function verifyImpl(msg, sig, point) {
  const sig64 = new Uint8Array(64);
  sig64.set(to32(sig.r), 0);
  sig64.set(to32(sig.s), 32);
  const pub = point instanceof Point ? point.encode('hex', false) : toHex(toBytes(point));
  try {
    return secp.verify(sig64, toBytes(msg), pub, { strict: false });
  } catch (err) {
    return false;
  }
}

function recoverImpl(msg, sig, recid) {
  const sig64 = new Uint8Array(64);
  sig64.set(to32(sig.r), 0);
  sig64.set(to32(sig.s), 32);
  const raw = secp.recoverPublicKey(toBytes(msg), sig64, recid, false);
  return Point.fromBytes(raw);
}

class KeyPair {
  constructor(options) {
    options = options || {};
    if (options.priv != null) {
      this._privBytes = normPriv(options.priv);
      this.priv = new BN(toHex(this._privBytes), 16);
    }
    if (options.pub) {
      this.pub = normPub(options.pub);
    } else if (this._privBytes) {
      this.pub = Point.fromBytes(secp.getPublicKey(this._privBytes, false));
    }
  }

  getPublic(compact, enc) {
    if (typeof compact === 'string') {
      enc = compact;
      compact = false;
    }
    if (!this.pub && this._privBytes) {
      this.pub = Point.fromBytes(secp.getPublicKey(this._privBytes, false));
    }
    if (enc) return this.pub.encode(enc, !!compact);
    return this.pub;
  }

  getPrivate(enc) {
    return enc === 'hex' ? this.priv.toString(16) : this.priv;
  }

  sign(msg, enc, options) {
    return signImpl(this._privBytes, msg, enc, options);
  }

  verify(msg, sig) {
    return verifyImpl(msg, sig, this.pub);
  }

  derive(pub) {
    return normPub(pub).mul(this.priv).getX();
  }
}

class EC {
  constructor(name) {
    if (name !== 'secp256k1') throw new Error(`Unsupported curve: ${name}`);
    this.curve = curve;
    this.n = curve.n;
    this.nh = curve.n.shrn(1);
    this.g = curve.g;
  }

  keyFromPrivate(priv) {
    return new KeyPair({ priv });
  }

  keyFromPublic(pub) {
    return new KeyPair({ pub });
  }

  keyPair(options) {
    return new KeyPair(options);
  }

  sign(msg, key, enc, options) {
    if (enc && typeof enc === 'object' && options === undefined) {
      options = enc;
      enc = undefined;
    }
    const privBytes = key && key._privBytes ? key._privBytes : normPriv(key);
    return signImpl(privBytes, msg, enc, options);
  }

  verify(msg, sig, key) {
    const point = key instanceof Point ? key : key && key.pub ? key.pub : normPub(key);
    return verifyImpl(msg, sig, point);
  }

  recoverPubKey(msg, sig, recid) {
    return recoverImpl(msg, sig, recid);
  }

  // Only used by secp256k1's ecdh default-hash path.
  hash() {
    const chunks = [];
    return {
      update(data) {
        chunks.push(Buffer.from(data));
        return this;
      },
      digest() {
        return Uint8Array.from(createHash('sha256').update(Buffer.concat(chunks)).digest());
      },
    };
  }
}

module.exports = { ec: EC, curve, curves: { secp256k1: { curve } } };
module.exports.default = module.exports;
