// The steward wizard, run when the parcel-steward template is applied to a bot (GotchiBot's `templates apply` runs it),
// or by the owner any time to give a steward more parcels. One run sets up one steward end to end:
//
//   1. wallet     its own x402 wallet in abra project <name> plus an encrypted keystore (wallet.ts; Touch ID once)
//   2. parcels    which of the owner's parcels it gets and their goal; parcels another steward holds are flagged
//   3. gotchi     the owner's gotchi every claim pays out to
//   4. sign       opens the Aarcade Steward tab with all of it filled in; the owner signs in their browser wallet:
//                 create this steward's whitelist (only the steward on it), then grant the rights
//   5. confirm    watches Base until the whitelist and rights are in place
//   6. save       writes stewards/<name>/parcel-goals.json with every parcel "live": false (shadow)
//   7. gas        waits for the owner to send the steward a little Base ETH, then runs act check on each parcel
//
// Several stewards can exist; each has its own wallet, keystore, whitelist and goals file, and a parcel's rights point
// at exactly one whitelist, so a parcel belongs to one steward at a time. Re-running is safe: it reuses the wallet,
// the whitelist and the goals, and merges new parcels in.
//
// Usage: node src/steward-setup.ts --agent <bot id>     (steward name parcel-steward-<bot id>)
//        node src/steward-setup.ts --name <steward name> [--owner 0x…] [--site https://aarcadeghst.com] [--no-open]
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parseGoals, RIGHTS, type Goals, type ParcelGoal } from './act.ts';
import { AAVEGOTCHI_DIAMOND, assertAddress, callAt, callRealm, cast, fromWei, ints, isAddress, isUint, pool, RPC, sameAddress } from './chain.ts';
import type { Mode } from './plan.ts';
import { ensureWallet, STEWARD_NAME } from './wallet.ts';

const SIM = dirname(dirname(fileURLToPath(import.meta.url)));
export const STEWARDS_DIR = join(SIM, 'stewards');
export const goalsPath = (name: string) => join(STEWARDS_DIR, name, 'parcel-goals.json');
const WHITELIST_ONLY = 2;
const POLL_MS = 5000;

export type Whitelist = { id: string; owner: string; name: string; members: string[] };
export type Right = { mode: number; whitelistId: string };

/** cast's `getWhitelist` output: (owner, "name", [members]). */
export function parseWhitelist(id: string, out: string): Whitelist {
  const addrs = out.match(/0x[0-9a-fA-F]{40}/g) ?? [];
  return { id, owner: addrs[0] ?? '', name: out.match(/"((?:[^"\\]|\\.)*)"/)?.[1] ?? '', members: addrs.slice(1) };
}

/** Parcel ids from a "7565, 9919 10523" style answer, keeping only ones the owner has; "all" takes every one. */
export function pickParcels(answer: string, owned: string[]): { ids: string[]; unknown: string[] } {
  if (answer.trim().toLowerCase() === 'all') return { ids: [...owned], unknown: [] };
  const asked = [...new Set(answer.split(/[\s,]+/).filter(Boolean))];
  return { ids: asked.filter((a) => owned.includes(a)), unknown: asked.filter((a) => !owned.includes(a)) };
}

/** The site mode a goal needs: extract only claims; budget and max also equip and upgrade. */
export const siteMode = (mode: Mode) => (mode === 'extract' ? 'extract' : 'build');

/** The Aarcade Steward tab with this steward, its parcels and mode filled in, for the owner to sign. */
export function signUrl(site: string, steward: string, parcels: string[], mode: Mode, whitelistName: string): string {
  const u = new URL('/mypaarcel', site);
  u.searchParams.set('tab', 'steward');
  u.searchParams.set('steward', steward);
  u.searchParams.set('parcels', parcels.join(','));
  u.searchParams.set('mode', siteMode(mode));
  u.searchParams.set('wl', whitelistName);
  return u.toString();
}

/** Parcels whose rights for this mode don't yet all point at the whitelist. */
export function unsettled(parcels: string[], mode: Mode, whitelistId: string, rights: Map<string, Right>): string[] {
  return parcels.filter((id) =>
    RIGHTS[mode].some((a) => {
      const r = rights.get(`${id}:${a}`);
      return r?.mode !== WHITELIST_ONLY || r.whitelistId !== whitelistId;
    }),
  );
}

/** The registered stewards: every stewards/<name>/parcel-goals.json. */
export function stewards(): Goals[] {
  if (!existsSync(STEWARDS_DIR)) return [];
  return readdirSync(STEWARDS_DIR)
    .filter((n) => STEWARD_NAME.test(n) && existsSync(goalsPath(n)))
    .map((n) => parseGoals(readFileSync(goalsPath(n), 'utf8')));
}

export async function ownedParcels(owner: string): Promise<string[]> {
  return ints(await callRealm('tokenIdsOfOwner(address)(uint256[])', owner)).map(String).sort((a, b) => Number(a) - Number(b));
}

export async function readRights(parcels: string[]): Promise<Map<string, Right>> {
  const out = new Map<string, Right>();
  if (!parcels.length) return out;
  const ids = parcels.flatMap((id) => [1, 2, 6].map(() => id));
  const acts = parcels.flatMap(() => ['1', '2', '6']);
  const list = (xs: string[]) => `[${xs.join(',')}]`;
  const [modes, wls] = await Promise.all([
    callRealm('getParcelsAccessRights(uint256[],uint256[])(uint256[])', list(ids), list(acts)).then(ints),
    callRealm('getParcelsAccessRightsWhitelistIds(uint256[],uint256[])(uint256[])', list(ids), list(acts)).then(ints),
  ]);
  ids.forEach((id, i) => out.set(`${id}:${acts[i]}`, { mode: Number(modes[i]), whitelistId: String(wls[i]) }));
  return out;
}

async function readWhitelist(id: string): Promise<Whitelist> {
  return parseWhitelist(id, await callAt(AAVEGOTCHI_DIAMOND, 'getWhitelist(uint32)((address,string,address[]))', [id]));
}

/** The owner's whitelists whose only member is the steward; checks a known id first, else scans them all. */
export async function stewardWhitelist(owner: string, steward: string, known?: string): Promise<Whitelist | null> {
  const fits = (w: Whitelist) => sameAddress(w.owner, owner) && w.members.length === 1 && sameAddress(w.members[0], steward);
  if (known) {
    const w = await readWhitelist(known).catch(() => null);
    if (w && fits(w)) return w;
  }
  const count = Number(ints(await callAt(AAVEGOTCHI_DIAMOND, 'getWhitelistsLength()(uint256)'))[0]);
  const all = await pool(Array.from({ length: count }, (_, i) => String(count - i)), 8, (id) => readWhitelist(id).catch(() => null));
  return all.find((w): w is Whitelist => !!w && fits(w)) ?? null;
}

export async function ownerGotchis(owner: string): Promise<string[]> {
  const ids = ints(await callAt(AAVEGOTCHI_DIAMOND, 'tokenIdsOfOwner(address)(uint32[])', [owner])).map(String);
  const lent = await pool(ids, 8, (id) => callAt(AAVEGOTCHI_DIAMOND, 'isAavegotchiLent(uint32)(bool)', [id]).catch(() => 'true'));
  return ids.filter((_, i) => lent[i] === 'false');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function openBrowser(url: string): boolean {
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  return spawnSync(opener, [url], { stdio: 'ignore' }).status === 0;
}

function runAct(args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(SIM, 'src', 'act.ts'), ...args], { stdio: 'inherit', cwd: SIM });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      agent: { type: 'string' },
      name: { type: 'string' },
      owner: { type: 'string' },
      site: { type: 'string', default: process.env.AARCADE_SITE || 'https://aarcadeghst.com' },
      'no-open': { type: 'boolean', default: false },
    },
  });
  const name = values.name ?? (values.agent ? `parcel-steward-${values.agent}` : '');
  if (!STEWARD_NAME.test(name)) {
    console.error('usage: steward-setup.ts --agent <bot id> | --name <steward name>   (letters, digits, _ . - only)');
    process.exit(1);
  }
  if (!process.stdin.isTTY) {
    console.log(`The steward wizard needs the owner at the keyboard (Touch ID, browser signing). Ask them to run:`);
    console.log(`  cd ${SIM} && node src/steward-setup.ts --name ${name}`);
    process.exit(2);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (q: string, def = '') => (await rl.question(def ? `${q} [${def}] ` : `${q} `)).trim() || def;
  const existing = existsSync(goalsPath(name)) ? parseGoals(readFileSync(goalsPath(name), 'utf8')) : null;
  const others = stewards().filter((s) => s.name !== name);

  console.log(`\n━━ Steward ${name} ━━\n\n1. Wallet`);
  const steward = await ensureWallet(name, name, true, `cd ${SIM} && node src/steward-setup.ts --name ${name}`);
  if (existing && !sameAddress(existing.steward, steward)) throw new Error(`${goalsPath(name)} names steward ${existing.steward}, but abra project ${name} holds ${steward}`);
  console.log(`   ✓ ${steward}`);

  let owner = values.owner ?? existing?.owner ?? '';
  while (!isAddress(owner)) owner = await ask('\nParcel owner wallet (0x…):', others[0]?.owner ?? '');
  assertAddress(owner, 'owner address');
  if (sameAddress(owner, steward)) throw new Error('the owner and the steward must be different wallets');

  console.log(`\n2. Parcels`);
  const owned = await ownedParcels(owner);
  if (!owned.length) throw new Error(`${owner} owns no parcels on Base`);
  const rights = await readRights(owned);
  const holder = new Map<string, string>();
  for (const s of others) for (const id of Object.keys(s.parcels)) holder.set(id, s.name);
  const mine = new Set(Object.keys(existing?.parcels ?? {}));
  for (const id of owned) {
    const tag = mine.has(id) ? `this steward (${existing!.parcels[id].mode})` : holder.has(id) ? `held by ${holder.get(id)}` : 'free';
    const claim = rights.get(`${id}:1`);
    console.log(`   ${id.padEnd(6)} ${tag}${claim?.mode === WHITELIST_ONLY ? `, claim → whitelist #${claim.whitelistId}` : ''}`);
  }
  let ids: string[] = [];
  while (!ids.length) {
    const picked = pickParcels(await ask('Parcels for this steward (ids, comma separated, or "all"):', [...mine].join(',')), owned);
    if (picked.unknown.length) console.log(`   not yours: ${picked.unknown.join(', ')}`);
    ids = picked.ids;
  }
  const taken = ids.filter((id) => holder.has(id));
  if (taken.length && (await ask(`   ${taken.join(', ')} belong to another steward; signing moves them here. Continue? (y/n)`, 'n')) !== 'y') {
    ids = ids.filter((id) => !holder.has(id));
    if (!ids.length) throw new Error('no parcels left to assign');
  }

  const modeAnswer = await ask('Goal for these parcels: extract (claim only), budget (build from a budget) or max (reinvest claims):', 'extract');
  if (!['extract', 'budget', 'max'].includes(modeAnswer)) throw new Error('goal must be extract, budget or max');
  const mode = modeAnswer as Mode;
  const alchemicaAnswer = await ask('Alchemica to build for (all, or fud,fomo,alpha,kek):', 'all');
  const alchemica = ['fud', 'fomo', 'alpha', 'kek'].map((a) => alchemicaAnswer === 'all' || alchemicaAnswer.split(',').includes(a)) as ParcelGoal['alchemica'];
  if (!alchemica.some(Boolean)) throw new Error('pick at least one alchemica');
  let budget: ParcelGoal['budget'] = [0, 0, 0, 0];
  let reinvestShare = 0;
  if (mode !== 'extract') {
    const b = (await ask('Budget per parcel, FUD,FOMO,ALPHA,KEK (you send it to the steward):', '0,0,0,0')).split(',').map(Number);
    if (b.length !== 4 || b.some((v) => !(v >= 0))) throw new Error('budget needs 4 amounts');
    budget = b as ParcelGoal['budget'];
  }
  if (mode === 'max') reinvestShare = Number(await ask('Share of each claim to reinvest (0-1):', '0.5'));
  if (!(reinvestShare >= 0 && reinvestShare <= 1)) throw new Error('reinvest share must be 0-1');

  console.log(`\n3. Harvest gotchi`);
  const gotchis = await ownerGotchis(owner);
  if (!gotchis.length) throw new Error(`${owner} has no unlent gotchi to receive claims`);
  let gotchiId = '';
  while (!gotchis.includes(gotchiId)) gotchiId = await ask(`Gotchi that receives the harvest (${gotchis.slice(0, 12).join(', ')}${gotchis.length > 12 ? ', …' : ''}):`, existing?.gotchiId ?? gotchis[0]);

  console.log(`\n4. Sign in your browser`);
  let whitelist = await stewardWhitelist(owner, steward, existing?.whitelistId);
  const pending = whitelist ? unsettled(ids, mode, whitelist.id, rights) : ids;
  if (!pending.length) console.log(`   ✓ whitelist #${whitelist!.id} and rights already in place`);
  else {
    const url = signUrl(values.site!, steward, ids, mode, name);
    console.log(`   Connect ${owner} on the Steward tab and sign:`);
    if (!whitelist) console.log(`     - Create whitelist "${name}" with only the steward`);
    console.log(`     - Grant ${mode === 'extract' ? 'claim' : 'claim, equip, upgrade'} on ${ids.length} parcel(s)`);
    console.log(`   ${url}`);
    if (values['no-open'] || !openBrowser(url)) console.log('   (open that link in the browser that has your wallet)');

    console.log(`\n5. Waiting for Base (Ctrl-C to stop; re-run to resume)`);
    let shown = '';
    for (;;) {
      whitelist = whitelist ?? (await stewardWhitelist(owner, steward));
      const left = whitelist ? unsettled(ids, mode, whitelist.id, await readRights(ids)) : ids;
      const line = !whitelist ? '   … waiting for the whitelist' : left.length ? `   ✓ whitelist #${whitelist.id}; waiting for rights on ${left.join(', ')}` : '';
      if (!line) break;
      if (line !== shown) console.log((shown = line));
      await sleep(POLL_MS);
    }
    console.log(`   ✓ whitelist #${whitelist!.id} holds only the steward, and every parcel's rights point at it`);
  }

  console.log(`\n6. Goals`);
  const today = new Date().toISOString().slice(0, 10);
  const parcels = { ...(existing?.parcels ?? {}) };
  for (const id of ids) {
    parcels[id] = { alchemica, mode, budget, reinvestShare, horizonDays: 365, since: parcels[id]?.since ?? today, live: parcels[id]?.live ?? false };
  }
  const goals: Goals = { name, owner, steward, gotchiId, whitelistId: whitelist!.id, parcels };
  parseGoals(JSON.stringify(goals));
  mkdirSync(dirname(goalsPath(name)), { recursive: true });
  writeFileSync(goalsPath(name), JSON.stringify(goals, null, 2) + '\n');
  for (const s of others) {
    const moved = ids.filter((id) => s.parcels[id]);
    if (!moved.length) continue;
    for (const id of moved) delete s.parcels[id];
    writeFileSync(goalsPath(s.name), JSON.stringify(s, null, 2) + '\n');
    console.log(`   moved ${moved.join(', ')} off ${s.name}`);
  }
  console.log(`   ✓ ${goalsPath(name)}: ${ids.length} parcel(s), all shadow ("live": false) until you switch them on`);

  console.log(`\n7. Gas`);
  let eth = fromWei(ints(await cast(['balance', steward, '--rpc-url', RPC]))[0]);
  if (eth === 0) {
    console.log(`   Send ${steward} about 0.0005 ETH on Base for gas. Waiting… (Ctrl-C to finish later)`);
    while (eth === 0) {
      await sleep(POLL_MS);
      eth = fromWei(ints(await cast(['balance', steward, '--rpc-url', RPC]))[0]);
    }
  }
  console.log(`   ✓ ${eth.toFixed(6)} ETH`);
  rl.close();

  console.log(`\n━━ Checks ━━`);
  const rel = `stewards/${name}/parcel-goals.json`;
  for (const id of ids) await runAct(['check', '--goals', rel, '--parcel', id]);
  if (mode !== 'extract') console.log(`\nSend the steward each parcel's budget (${budget.join(', ')} FUD, FOMO, ALPHA, KEK).`);
  if (mode === 'max') console.log(`Max mode pulls reinvest from your wallet: sign the allowance from  node src/steward.ts allowance --goals ${rel}`);
  console.log(`\nThe steward shadows these parcels (simulates, never sends). To go live on one, set "live": true on it in ${rel}.`);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!);
if (isMain) await main();
