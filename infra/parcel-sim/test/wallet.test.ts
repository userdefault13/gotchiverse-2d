import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { keccak256 } from '../src/keccak.ts';
import { addressOf, castAddress, encryptKeystore, parseAbraLs } from '../src/wallet.ts';

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

test('keccak256: Ethereum test vectors, including a multi-block input', () => {
  assert.equal(hex(keccak256(new Uint8Array())), 'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
  assert.equal(hex(keccak256(Buffer.from('abc'))), '4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45');
  assert.equal(hex(keccak256(Buffer.alloc(200, 0xa3))).length, 64);
});

test('address of a private key: key 1 is the well-known 0x7e5f…5bdf', () => {
  assert.equal(addressOf(Buffer.from('00'.repeat(31) + '01', 'hex')), '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf');
});

test('keystore: cast opens what we write and signs as the same address', async () => {
  const key = randomBytes(32);
  const dir = mkdtempSync(join(tmpdir(), 'ks-test-'));
  try {
    const ks = encryptKeystore(key, 'test-password', 1 << 12);
    writeFileSync(join(dir, 'ks'), JSON.stringify(ks));
    const opened = await castAddress(join(dir, 'ks'), 'test-password');
    assert.equal(opened.toLowerCase(), addressOf(key));
    assert.equal('0x' + ks.address, addressOf(key));
    await assert.rejects(castAddress(join(dir, 'ks'), 'wrong-password'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('abra ls: var names, and only the plain EVM_ADDRESS value', () => {
  const out = [
    'EVM_ADDRESS                0x2127AA7265D573Aa467f1D73554D17890b872E76  ',
    'EVM_PRIVATE_KEY            0x12••••••••••ab  [secret]',
    'PAY_TO_ADDRESS             0x2127AA7265D573Aa467f1D73554D17890b872E76  ',
  ].join('\n');
  assert.deepEqual(parseAbraLs(out), { keys: ['EVM_ADDRESS', 'EVM_PRIVATE_KEY', 'PAY_TO_ADDRESS'], address: '0x2127AA7265D573Aa467f1D73554D17890b872E76' });
});
