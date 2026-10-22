// Read parcels from the Realm diamond on Base, read-only, through Foundry's cast.
// Usage: node src/read-parcel.ts --owner 0x...                 list every parcel the address owns
//        node src/read-parcel.ts --parcel 7565 [--out p.json]  one parcel as plan input (see src/plan.ts ParcelState)
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { assertAddress, assertUint, callAt, callRealm as call, cast, fromWei, ints, INSTALLATION_DIAMOND, pool, REALM_DIAMOND, RPC } from './chain.ts';
import { TYPES } from './rules.ts';
import type { ParcelState } from './plan.ts';
import type { Alch, ParcelSize, Placed } from './types.ts';

/** RealmGridFacet getter per parcel size; the grid holds each installation's type id over its footprint, row by row (y), x within a row. */
const GRIDS: Record<ParcelSize, { fn: string; w: number; h: number }> = {
  0: { fn: 'getHumbleGrid', w: 8, h: 8 },
  1: { fn: 'getReasonableGrid', w: 16, h: 16 },
  2: { fn: 'getSpaciousVerticalGrid', w: 32, h: 64 },
  3: { fn: 'getSpaciousHorizontalGrid', w: 64, h: 32 },
  4: { fn: 'getPaartnerGrid', w: 64, h: 64 },
};

export type ParcelInfo = ParcelState & {
  name: string;
  district: number;
  owner: string;
  /** unclaimed alchemica sitting in the parcel's reservoirs */
  available: Alch;
  /** unix seconds, 0 if never claimed */
  lastClaimed: number;
  /** grid cells holding a type id this sim doesn't know (deprecated types) */
  unknownTypes: number[];
  /** installation types where the grid and the Installation diamond's equipped balances disagree */
  mismatches: { typeId: number; grid: number; equipped: number }[];
  /** upgrades queued on the parcel and not finalized yet; `index` is what finalizeUpgrades takes */
  upgradeQueue: QueuedOnChain[];
  /** block the parcel was read at */
  block: number;
};

export type QueuedOnChain = { index: number; owner: string; x: number; y: number; readyBlock: number; installationId: number };

const toAlch = (s: string): Alch => ints(s).map(fromWei) as Alch;

/** getParcelUpgradeQueue prints the queue tuples, then a line with their indexes. */
export function parseUpgradeQueue(out: string): QueuedOnChain[] {
  const [tuples = '', indexes = ''] = out.split('\n');
  const idx = ints(indexes).map(Number);
  const items = [...tuples.matchAll(/\((0x[0-9a-fA-F]{40}), (\d+), (\d+), (\d+), (true|false), (\d+), (\d+)\)/g)];
  return items
    .map((m, i) => ({ index: idx[i], owner: m[1], x: +m[2], y: +m[3], readyBlock: +m[4], claimed: m[5] === 'true', installationId: +m[7] }))
    .filter((q) => !q.claimed)
    .map(({ claimed: _, ...q }) => q);
}

/** Turn the type-id grid ([x][y]) back into installations: the first cell of each footprint, scanning rows top-down, is its origin. */
export function installationsFromGrid(grid: number[][], unknown: Set<number>): Placed[] {
  const claimed = grid.map((col) => col.map(() => false));
  const out: Placed[] = [];
  for (let y = 0; y < grid[0].length; y++)
    for (let x = 0; x < grid.length; x++) {
      const id = grid[x][y];
      if (id === 0 || claimed[x][y]) continue;
      const t = TYPES.get(id);
      if (!t) {
        unknown.add(id);
        claimed[x][y] = true;
        continue;
      }
      for (let dx = 0; dx < t.width; dx++) for (let dy = 0; dy < t.height; dy++) if (grid[x + dx]?.[y + dy] === id) claimed[x + dx][y + dy] = true;
      out.push({ typeId: id, x, y });
    }
  return out;
}

export async function ownedParcels(owner: string): Promise<string[]> {
  assertAddress(owner);
  return ints(await call('tokenIdsOfOwner(address)(uint256[])', owner)).map(String);
}

export async function readParcel(id: string): Promise<ParcelInfo> {
  assertUint(id, 'parcel id');
  const info = await call('getParcelInfo(uint256)((string,string,address,uint256,uint256,uint256,uint256,uint256[4],uint256))', id);
  const m = info.match(/^\("([^"]*)", "([^"]*)", (0x[0-9a-fA-F]{40}), (.*)\)$/s);
  if (!m) throw new Error(`unexpected getParcelInfo output for ${id}: ${info.slice(0, 200)}`);
  const [, name, , owner, rest] = m;
  const [, , size, district] = ints(rest).map(Number);
  const g = GRIDS[size as ParcelSize];
  const [round, remaining, available, lastClaimed, gridOut, balances, queue, block] = await Promise.all([
    call('getParcelCurrentRound(uint256)(uint256)', id),
    call('getRealmAlchemica(uint256)(uint256[4])', id),
    call('getAvailableAlchemica(uint256)(uint256[4])', id),
    call('lastClaimedAlchemica(uint256)(uint256)', id),
    call(`${g.fn}(uint256,uint256)(uint256[${g.w}][${g.h}])`, id, '0'),
    callAt(INSTALLATION_DIAMOND, 'installationBalancesOfToken(address,uint256)((uint256,uint256)[])', [REALM_DIAMOND, id]),
    callAt(INSTALLATION_DIAMOND, 'getParcelUpgradeQueue(uint256)((address,uint16,uint16,uint40,bool,uint256,uint256)[],uint256[])', [id]),
    cast(['block-number', '--rpc-url', RPC]),
  ]);
  const flat = ints(gridOut).map(Number);
  if (flat.length !== g.w * g.h) throw new Error(`grid for ${id} has ${flat.length} cells, expected ${g.w * g.h}`);
  const grid = Array.from({ length: g.w }, (_, x) => Array.from({ length: g.h }, (_, y) => flat[y * g.w + x]));
  const unknown = new Set<number>();
  const installations = installationsFromGrid(grid, unknown);

  // Cross-check the decoded layout against what the Installation diamond says is equipped on the parcel.
  const equipped = new Map<number, number>();
  const pairs = ints(balances).map(Number);
  for (let i = 0; i + 1 < pairs.length; i += 2) equipped.set(pairs[i], pairs[i + 1]);
  const onGrid = new Map<number, number>();
  for (const p of installations) onGrid.set(p.typeId, (onGrid.get(p.typeId) ?? 0) + 1);
  const mismatches = [...new Set([...equipped.keys(), ...onGrid.keys()])]
    .filter((t) => !unknown.has(t) && (equipped.get(t) ?? 0) !== (onGrid.get(t) ?? 0))
    .map((typeId) => ({ typeId, grid: onGrid.get(typeId) ?? 0, equipped: equipped.get(typeId) ?? 0 }));
  return {
    parcelId: id,
    name,
    district,
    owner,
    size: size as ParcelSize,
    surveyRound: Number(ints(round)[0]),
    remaining: toAlch(remaining),
    available: toAlch(available),
    lastClaimed: Number(ints(lastClaimed)[0]),
    installations,
    unknownTypes: [...unknown],
    mismatches,
    upgradeQueue: parseUpgradeQueue(queue),
    block: Number(block),
  };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!);
if (isMain) {
  const { values } = parseArgs({ options: { owner: { type: 'string' }, parcel: { type: 'string' }, out: { type: 'string' } } });
  const SIZES = ['humble', 'reasonable', 'spacious V', 'spacious H', 'paartner'];
  const summarize = (names: string[]) => {
    const counts = new Map<string, number>();
    for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
    return [...counts].map(([n, c]) => (c > 1 ? `${c}× ${n}` : n)).join(', ') || '—';
  };
  const name = (id: number) => TYPES.get(id)?.name.replace(/ Level (\d+)/, ' L$1') ?? `type ${id}`;
  if (values.parcel) {
    const p = await readParcel(values.parcel);
    if (values.out) writeFileSync(values.out, JSON.stringify(p, null, 2) + '\n');
    console.log(JSON.stringify(p, null, 2));
  } else if (values.owner) {
    const ids = await ownedParcels(values.owner);
    const parcels = await pool(ids, 4, readParcel);
    console.log(`${ids.length} parcels owned by ${values.owner}`);
    console.table(
      parcels.map((p) => ({
        id: p.parcelId,
        name: p.name,
        size: SIZES[p.size],
        surveyed: `${p.surveyRound}/10`,
        'remaining FUD/FOMO/ALPHA/KEK': p.remaining.map((v) => Math.round(v)).join(' / '),
        installations: summarize(p.installations.map((i) => name(i.typeId))),
        check: p.mismatches.length || p.unknownTypes.length ? `MISMATCH ${JSON.stringify(p.mismatches)} ${p.unknownTypes}` : 'ok',
      })),
    );
  } else {
    console.error('usage: --owner 0x... | --parcel <id> [--out parcel.json]');
    process.exit(1);
  }
}
