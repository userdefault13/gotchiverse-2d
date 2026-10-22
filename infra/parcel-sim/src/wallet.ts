// Set up the steward's wallet: an x402 wallet held by abracadabra (EVM_ADDRESS, EVM_PRIVATE_KEY, PAY_TO_ADDRESS),
// plus an encrypted Foundry keystore of the same key so act.ts can sign without the key on any command line.
// The keystore's random password lives in the same abra project as STEWARD_KEYSTORE_PASSWORD.
//
// Usage: node src/wallet.ts status [--project parcel-steward] [--account parcel-steward]
//          what exists: abra project, wallet, keystore, and the wallet's Base balances (ETH, USDC, alchemica)
//        node src/wallet.ts setup  [--project parcel-steward] [--account parcel-steward] [--new]
//          obtain: use the wallet already in the abra project; with --new, generate one there (abra keygen
//          foundry --pay-to; Touch ID) when the project has none. Then build the keystore. Never replaces a wallet.
//
// Live runs then inject only the password, never the key:
//   DRY_RUN=0 abra run parcel-steward -k STEWARD_KEYSTORE_PASSWORD -- node src/act.ts next --goals … --parcel … --send
import { spawn, spawnSync } from 'node:child_process';
import { createCipheriv, createECDH, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { assertAddress, callAt, callRealm, cast, fromWei, ints, RPC, sameAddress } from './chain.ts';
import { keccak256 } from './keccak.ts';

export const DEFAULT_PROJECT = 'parcel-steward';
export const DEFAULT_ACCOUNT = 'parcel-steward';
export const PASSWORD_VAR = 'STEWARD_KEYSTORE_PASSWORD';
export const keystorePath = (account: string) => join(homedir(), '.foundry', 'keystores', account);
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
/** Steward names double as abra project and keystore account names. */
export const STEWARD_NAME = /^[A-Za-z0-9_.-]{1,64}$/;

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

/** Ethereum address of a secp256k1 private key: last 20 bytes of keccak256 of the uncompressed public key. */
export function addressOf(privateKey: Buffer): string {
  const ecdh = createECDH('secp256k1');
  ecdh.setPrivateKey(privateKey);
  return '0x' + hex(keccak256(ecdh.getPublicKey().subarray(1)).subarray(12));
}

/** Web3 Secret Storage v3 (scrypt + aes-128-ctr), the format cast and geth read. */
export function encryptKeystore(privateKey: Buffer, password: string, n = 1 << 18) {
  const salt = randomBytes(32);
  const iv = randomBytes(16);
  const dk = scryptSync(password, salt, 32, { N: n, r: 8, p: 1, maxmem: 512 * 1024 * 1024 });
  const cipher = createCipheriv('aes-128-ctr', dk.subarray(0, 16), iv);
  const ciphertext = Buffer.concat([cipher.update(privateKey), cipher.final()]);
  const mac = keccak256(Buffer.concat([dk.subarray(16, 32), ciphertext]));
  return {
    address: addressOf(privateKey).slice(2),
    crypto: {
      cipher: 'aes-128-ctr',
      cipherparams: { iv: hex(iv) },
      ciphertext: hex(ciphertext),
      kdf: 'scrypt',
      kdfparams: { dklen: 32, n, p: 1, r: 8, salt: hex(salt) },
      mac: hex(mac),
    },
    id: randomUUID(),
    version: 3,
  };
}

/** Address cast decrypts from a keystore file with this password; proves the file is usable. */
export async function castAddress(file: string, password: string): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), 'steward-'));
  const pw = join(dir, 'pw');
  try {
    writeFileSync(pw, password, { mode: 0o600 });
    return await cast(['wallet', 'address'], { ETH_KEYSTORE: file, ETH_PASSWORD: pw });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Plain-text output of an abra command; never used on commands that reveal secrets. */
function abra(args: string[]): { ok: boolean; out: string } {
  const r = spawnSync('abra', args, { encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout + r.stderr).replace(/\x1b\[[0-9;]*m/g, '') };
}

/** Var names in an abra project and the plain (non-secret) EVM_ADDRESS. `abra ls` masks secret values. */
export function parseAbraLs(out: string): { keys: string[]; address: string | null } {
  const keys: string[] = [];
  let address: string | null = null;
  for (const line of out.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s+(\S+)/);
    if (!m) continue;
    keys.push(m[1]);
    if (m[1] === 'EVM_ADDRESS' && /^0x[0-9a-fA-F]{40}$/.test(m[2])) address = m[2];
  }
  return { keys, address };
}

export function projectState(project: string) {
  const projects = abra(['project', 'ls']);
  if (!projects.ok) return { abra: false, exists: false, keys: [] as string[], address: null };
  const exists = projects.out.split('\n').some((l) => l.trim().split(/\s+/)[0] === project);
  if (!exists) return { abra: true, exists, keys: [] as string[], address: null };
  return { abra: true, exists, ...parseAbraLs(abra(['ls', project]).out) };
}

function keystoreAddress(account: string): string | null {
  const file = keystorePath(account);
  if (!existsSync(file)) return null;
  const a = JSON.parse(readFileSync(file, 'utf8')).address;
  return a ? '0x' + String(a).replace(/^0x/, '') : 'unknown';
}

async function balances(address: string) {
  const tokens = (await callRealm('getAlchemicaAddresses()(address[4])')).match(/0x[0-9a-fA-F]{40}/g)!;
  const [eth, usdc, ...alch] = await Promise.all([
    cast(['balance', address, '--rpc-url', RPC]).then((s) => fromWei(ints(s)[0])),
    callAt(USDC, 'balanceOf(address)(uint256)', [address]).then((s) => Number(ints(s)[0]) / 1e6),
    ...tokens.map((t) => callAt(t, 'balanceOf(address)(uint256)', [address]).then((s) => fromWei(ints(s)[0]))),
  ]);
  return { eth, usdc, alch };
}

export async function status(project: string, account: string): Promise<string | null> {
  const p = projectState(project);
  const ks = keystoreAddress(account);
  if (!p.abra) console.log('✗ abra (abracadabra) not found: install it, then run setup');
  else if (!p.exists) console.log(`✗ abra project ${project} doesn't exist yet (setup --new creates it and a wallet)`);
  else {
    const has = (k: string) => p.keys.includes(k);
    console.log(`✓ abra project ${project}`);
    console.log(has('EVM_PRIVATE_KEY') ? `✓ wallet ${p.address ?? '(EVM_ADDRESS missing)'}` : '✗ no wallet (EVM_PRIVATE_KEY) in the project');
    console.log(has('PAY_TO_ADDRESS') ? '✓ PAY_TO_ADDRESS set (x402)' : '· PAY_TO_ADDRESS not set (only needed to receive x402 payments)');
    console.log(has(PASSWORD_VAR) ? `✓ ${PASSWORD_VAR} stored` : `✗ ${PASSWORD_VAR} not stored`);
  }
  if (!ks) console.log(`✗ no keystore at ${keystorePath(account)}`);
  else if (p.address && !sameAddress(ks, p.address)) console.log(`✗ keystore ${keystorePath(account)} is ${ks}, not the project's wallet ${p.address}`);
  else console.log(`✓ keystore ${keystorePath(account)} (${ks})`);
  const address = p.address ?? (ks && ks !== 'unknown' ? ks : null);
  if (address) {
    const b = await balances(address);
    console.log(`  Base balances: ${b.eth.toFixed(6)} ETH (gas), ${b.usdc.toFixed(2)} USDC (x402), ${b.alch.map((v, i) => `${v.toFixed(2)} ${['FUD', 'FOMO', 'ALPHA', 'KEK'][i]}`).join(', ')}`);
  }
  return address;
}

function run(cmd: string, args: string[], input?: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: [input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit'] });
    if (input !== undefined) child.stdin!.end(input);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

/**
 * The wallet in this abra project with its keystore, generating it (Touch ID) when makeNew and the project has none.
 * Returns its address. Never replaces an existing wallet or keystore.
 */
export async function ensureWallet(project: string, account: string, makeNew: boolean, how = `node src/wallet.ts setup --project ${project} --account ${account} --new`): Promise<string> {
  let p = projectState(project);
  if (!p.abra) throw new Error('abra (abracadabra) is not installed or not on PATH');
  if (!p.keys.includes('EVM_PRIVATE_KEY')) {
    if (!makeNew) {
      console.log(`No wallet in abra project ${project}. Either:`);
      console.log(`  - use a wallet you already keep in abra: setup --project <that project>`);
      console.log(`  - generate a new x402 wallet: setup --project ${project} --new`);
      process.exit(2);
    }
    if (!process.stdin.isTTY) {
      console.log(`Generating a wallet needs the owner at the keyboard (Touch ID). Ask them to run:`);
      console.log(`  ${how}`);
      process.exit(2);
    }
    if (!p.exists && (await run('abra', ['project', 'new', project])) !== 0) throw new Error(`abra project new ${project} failed`);
    // keygen overwrites an existing EVM_PRIVATE_KEY; we only get here when the project has none.
    if ((await run('abra', ['keygen', 'foundry', project, '--pay-to'])) !== 0) throw new Error('abra keygen failed');
    p = projectState(project);
  }
  if (!p.address) throw new Error(`project ${project} has EVM_PRIVATE_KEY but no plain EVM_ADDRESS; set it with: abra set ${project} EVM_ADDRESS --no-secret --visible`);
  console.log(`wallet: ${p.address} (abra project ${project})`);

  const ks = keystoreAddress(account);
  if (ks && !sameAddress(ks, p.address)) throw new Error(`${keystorePath(account)} holds ${ks}, not ${p.address}; pick another --account or move that file away yourself`);
  if (!ks || !p.keys.includes(PASSWORD_VAR)) {
    if (ks) throw new Error(`${keystorePath(account)} exists but ${PASSWORD_VAR} is not in ${project}; move the keystore away to rebuild it`);
    // Only the key is injected, only into this one child, which writes the keystore and stores its password.
    const self = fileURLToPath(import.meta.url);
    const code = await run('abra', ['run', project, '-k', 'EVM_PRIVATE_KEY', '--', process.execPath, self, '_keystore', '--project', project, '--account', account, '--expect', p.address]);
    if (code !== 0) throw new Error('building the keystore failed');
  }
  return p.address;
}

async function setup(project: string, account: string, makeNew: boolean) {
  const address = await ensureWallet(project, account, makeNew);
  await status(project, account);
  console.log(`\nTo give this wallet parcels, run the steward wizard instead: node src/steward-setup.ts --name ${project}`);
  console.log(`\nOr by hand:`);
  console.log(`  1. Put "steward": "${address}" in parcel-goals.json and whitelist it (steward.ts rights).`);
  console.log(`  2. Send it a little Base ETH for gas, and the alchemica budget for budget/max parcels.`);
  console.log(`  3. Max mode: the owner signs steward.ts allowance so it can pull its reinvest share.`);
  console.log(`  4. Live runs inject only the keystore password:`);
  console.log(`     DRY_RUN=0 abra run ${project} -k ${PASSWORD_VAR} -- node src/act.ts next --goals parcel-goals.json --parcel <id> --send`);
}

/** Runs inside `abra run -k EVM_PRIVATE_KEY`: write the keystore, prove cast can open it, store the password. */
async function makeKeystore(project: string, account: string, expect: string) {
  const raw = (process.env.EVM_PRIVATE_KEY ?? '').replace(/^0x/, '');
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) throw new Error('EVM_PRIVATE_KEY missing or not 32 bytes of hex');
  const key = Buffer.from(raw, 'hex');
  if (!sameAddress(addressOf(key), expect)) throw new Error(`EVM_PRIVATE_KEY is for ${addressOf(key)}, not ${expect}`);
  const file = keystorePath(account);
  if (existsSync(file)) throw new Error(`${file} already exists`);
  const password = randomBytes(32).toString('hex');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(encryptKeystore(key, password)), { mode: 0o600, flag: 'wx' });
  chmodSync(file, 0o600);
  key.fill(0);
  try {
    const opened = await castAddress(file, password);
    if (!sameAddress(opened, expect)) throw new Error(`cast opened ${opened} from the keystore, expected ${expect}`);
    if ((await run('abra', ['set', project, PASSWORD_VAR, '--stdin'], password)) !== 0) throw new Error(`abra set ${project} ${PASSWORD_VAR} failed`);
    console.log(`keystore ${file} written and opened by cast as ${opened}; password stored as ${project}/${PASSWORD_VAR}`);
  } catch (e) {
    rmSync(file, { force: true });
    throw e;
  }
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!);
if (isMain) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      project: { type: 'string', default: DEFAULT_PROJECT },
      account: { type: 'string', default: DEFAULT_ACCOUNT },
      new: { type: 'boolean', default: false },
      expect: { type: 'string' },
    },
  });
  const { project, account } = values as { project: string; account: string };
  if (!STEWARD_NAME.test(project) || !STEWARD_NAME.test(account)) throw new Error('--project and --account take letters, digits, _ . - only');
  const cmd = positionals[0];
  if (cmd === 'status') await status(project, account);
  else if (cmd === 'setup') await setup(project, account, values.new!);
  else if (cmd === '_keystore') await makeKeystore(project, account, assertAddress(values.expect ?? '', 'expected address'));
  else {
    console.error('usage: status | setup [--new]   [--project parcel-steward] [--account parcel-steward]');
    process.exit(1);
  }
}
