import crypto from 'crypto';

const nonces = new Map<string, { nonce: string; expiresAt: number }>();
const TTL_MS = 10 * 60 * 1000;

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

export function issueNonce(address: string): string {
  const key = normalizeAddress(address);
  const nonce = crypto.randomBytes(16).toString('hex');
  nonces.set(key, { nonce, expiresAt: Date.now() + TTL_MS });
  return nonce;
}

export function peekNonce(address: string): string | null {
  const key = normalizeAddress(address);
  const entry = nonces.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    nonces.delete(key);
    return null;
  }
  return entry.nonce;
}

export function consumeNonce(address: string, nonce: string): boolean {
  const key = normalizeAddress(address);
  const entry = nonces.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    nonces.delete(key);
    return false;
  }
  if (entry.nonce !== nonce) return false;
  nonces.delete(key);
  return true;
}

export function buildSignMessage(address: string, nonce: string): string {
  return [
    'Gotchiverse REALM login',
    `Address: ${address}`,
    `Nonce: ${nonce}`,
  ].join('\n');
}
