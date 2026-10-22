// Base mainnet through Foundry's cast: contract addresses, input checks and output parsing shared by the readers
// and the steward. RPC: $BASE_MAINNET_RPC or https://mainnet.base.org. Needs ~/.foundry/bin/cast (or cast on PATH).
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { promisify } from 'node:util';

export const CHAIN_ID = 8453;
export const REALM_DIAMOND = '0x4B0040c3646D3c44B8a28Ad7055cfCF536c05372';
export const INSTALLATION_DIAMOND = '0xebba5b725A2889f7f089a6cAE0246A32cad4E26b';
/** Gotchis and whitelists live here. */
export const AAVEGOTCHI_DIAMOND = '0xA99c4B08201F2913Db8D28e71d020c4298F29dBF';
export const RPC = process.env.BASE_MAINNET_RPC || 'https://mainnet.base.org';
export const CAST = existsSync(`${homedir()}/.foundry/bin/cast`) ? `${homedir()}/.foundry/bin/cast` : 'cast';

const run = promisify(execFile);

export const isAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a);
export const isUint = (n: string) => /^\d+$/.test(n);
export const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function assertAddress(a: string, what = 'address'): string {
  if (!isAddress(a)) throw new Error(`not an ${what}: ${a}`);
  return a;
}

export function assertUint(n: string, what = 'number'): string {
  if (!isUint(n)) throw new Error(`not a ${what}: ${n}`);
  return n;
}

/** Run cast with arguments only (no shell), extra env merged in. */
export async function cast(args: string[], env?: Record<string, string>): Promise<string> {
  const { stdout } = await run(CAST, args, { maxBuffer: 64 << 20, env: env ? { ...process.env, ...env } : process.env });
  return stdout.trim();
}

/** Read-only call; with `from` it simulates the call as that sender. */
export async function callAt(to: string, sig: string, args: string[] = [], from?: string): Promise<string> {
  return cast(['call', to, sig, ...args, ...(from ? ['--from', from] : []), '--rpc-url', RPC]);
}

export const callRealm = (sig: string, ...args: string[]) => callAt(REALM_DIAMOND, sig, args);

/** cast prints big numbers as "5923571039370000000000 [5.923e21]"; keep the exact digits. */
export const ints = (s: string): bigint[] => [...s.replace(/\[[\d.e+-]+\]/g, '').matchAll(/\d+/g)].map((m) => BigInt(m[0]));
export const fromWei = (v: bigint) => Number(v) / 1e18;

/** Run at most `limit` reads at once so a public RPC doesn't rate-limit us. */
export async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}
