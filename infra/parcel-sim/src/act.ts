// The steward's hands: read one parcel from Base, let the plan's brain pick the next action, turn it into
// transactions, check every guard, and simulate them from the steward's address. Sends only when told to.
//
// Usage: node src/act.ts check --goals stewards/<name>/parcel-goals.json --parcel 44113
//          guards only: chain, parcel owner, pinned gotchi, access rights, steward balances
//        node src/act.ts next --goals stewards/<name>/parcel-goals.json --parcel 44113 [--send]
//          the next action and its transactions, simulated. --send also needs "live": true on the parcel's goal
//          (the owner's switch), DRY_RUN=0 and the steward's encrypted keystore: by default the one the steward wizard
//          writes (~/.foundry/keystores/<name>) with its password from STEWARD_KEYSTORE_PASSWORD, i.e.
//            DRY_RUN=0 abra run <name> -k STEWARD_KEYSTORE_PASSWORD -- node src/act.ts next … --send
//          ETH_KEYSTORE / ETH_PASSWORD (password file) override it. A raw key in the environment is refused: cast
//          only takes one on its command line.
//
// Goals file, one per steward (written by steward-setup.ts; several stewards can each hold their own parcels):
//   { "name": "parcel-steward-owned-3033", "owner": "0x…", "steward": "0x…", "gotchiId": "1234", "whitelistId": "70",
//     "parcels": { "44113": { "alchemica": [true,true,true,true], "mode": "max", "budget": [1000,500,100,20],
//                             "reinvestShare": 0.5, "horizonDays": 365, "since": "2026-10-21", "live": false } } }
// Spending per parcel is capped by its budget plus what max mode pulled back; steward-ledger.json next to the goals
// file keeps what was spent, claimed and pulled.
//
// Max mode: the owner approves the steward to pull alchemica from the owner's wallet (steward.ts allowance). After
// each claim the steward records what the claim minted (AlchemicaClaimed events), and pulls exactly reinvestShare of
// it with transferFrom, never more. Pulled alchemica raises that parcel's budget.
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  AAVEGOTCHI_DIAMOND,
  assertAddress,
  assertUint,
  callAt,
  callRealm,
  cast,
  CHAIN_ID,
  fromWei,
  ints,
  INSTALLATION_DIAMOND,
  REALM_DIAMOND,
  RPC,
  sameAddress,
} from './chain.ts';
import { configFor, type Goal, type Mode } from './plan.ts';
import { claimOnly } from './policies/baselines.ts';
import { heuristic } from './policies/heuristic.ts';
import { planner } from './policies/planner.ts';
import { readParcel, type ParcelInfo } from './read-parcel.ts';
import { DEFAULT_ACCOUNT, keystorePath, PASSWORD_VAR, STEWARD_NAME } from './wallet.ts';
import { CLAIM_COOLDOWN, DAY, typeOf } from './rules.ts';
import { legalActions } from './step.ts';
import { createWorld, observe } from './world.ts';
import type { Action, Alch, World } from './types.ts';

const BLOCK_SEC = 2;
const ALCHEMICA = ['FUD', 'FOMO', 'ALPHA', 'KEK'];
/** Realm action rights per mode: 1 claim, 2 equip installations, 6 upgrade installations. */
export const RIGHTS: Record<Mode, number[]> = { extract: [1], budget: [1, 2, 6], max: [1, 2, 6] };

/** `live` is the owner's switch: without it the steward only shadows (simulates) on this parcel. */
export type ParcelGoal = Omit<Goal, 'surveyRest'> & { since: string; live?: boolean };
/** name: the steward's abra project and keystore account (default parcel-steward); whitelistId: its steward-only whitelist. */
export type Goals = { name: string; owner: string; steward: string; gotchiId: string; whitelistId?: string; parcels: Record<string, ParcelGoal> };
export type Ledger = {
  spent: Record<string, Alch>;
  /** minted to the owner by the steward's own claims */
  claimed?: Record<string, Alch>;
  /** reinvest pulled from the owner (max mode) */
  pulled?: Record<string, Alch>;
  entries: { at: string; parcel: string; action: string; tx: string; cost: Alch; claimed?: Alch; pulled?: Alch }[];
};
/** Don't spend gas pulling less than this much reinvest (FUD-equivalent). */
export const REINVEST_MIN_VALUE = 25;
/** Recipe weights, the same scale the plan scores in. */
const WEIGHTS: Alch = [1, 2.12, 1.49, 1.73];
const ALCHEMICA_CLAIMED = '0xcd37debf8c15afccf3b196a970f20863139e242a2d78e43638a536d375cf4adb';

export type Step = {
  label: string;
  to: string;
  sig: string;
  args: string[];
  /** alchemica this step takes from the steward, charged to the parcel's budget once it lands */
  cost: Alch;
  /** reinvest this step pulls from the owner, added to the parcel's budget once it lands */
  pull?: Alch;
};
export type Reinvest = { kind: 'reinvest'; amounts: Alch };
export type Finalize = { kind: 'finalize'; indexes: number[] };
export type Next =
  | { kind: 'act'; action: Action | Finalize | Reinvest; steps: Step[]; why: string }
  | { kind: 'wait'; why: string; until: number | null };

/** What the steward holds, read from chain, that turns an action into transactions. */
export type Wallet = {
  alchemica: string[];
  balance: bigint[];
  /** ERC-20 allowance to the Installation diamond, which takes the alchemica for crafts and upgrades */
  allowance: bigint[];
  /** level-1 installations already crafted and sitting in the steward's wallet */
  held: Map<number, number>;
  /** what the owner lets the steward pull for reinvesting, and holds */
  ownerAllowance: bigint[];
  ownerBalance: bigint[];
};

export function parseGoals(text: string): Goals {
  const g = JSON.parse(text) as Goals;
  g.name = g.name ?? DEFAULT_ACCOUNT;
  if (!STEWARD_NAME.test(g.name)) throw new Error('name takes letters, digits, _ . - only');
  if (g.whitelistId !== undefined) g.whitelistId = assertUint(String(g.whitelistId), 'whitelist id');
  assertAddress(g.owner, 'owner address');
  assertAddress(g.steward, 'steward address');
  assertUint(String(g.gotchiId), 'gotchi id');
  g.gotchiId = String(g.gotchiId);
  for (const [id, p] of Object.entries(g.parcels ?? {})) {
    assertUint(id, 'parcel id');
    if (!['extract', 'budget', 'max'].includes(p.mode)) throw new Error(`parcel ${id}: mode must be extract, budget or max`);
    if (!Array.isArray(p.alchemica) || p.alchemica.length !== 4 || !p.alchemica.some(Boolean)) throw new Error(`parcel ${id}: alchemica needs 4 booleans, one true`);
    if (!Array.isArray(p.budget) || p.budget.length !== 4 || p.budget.some((b) => !(b >= 0))) throw new Error(`parcel ${id}: budget needs 4 amounts`);
    if (!(p.horizonDays > 0)) throw new Error(`parcel ${id}: horizonDays must be positive`);
    if (Number.isNaN(Date.parse(p.since))) throw new Error(`parcel ${id}: since must be a date`);
    if (!(p.reinvestShare >= 0 && p.reinvestShare <= 1)) throw new Error(`parcel ${id}: reinvestShare must be 0-1`);
    if (p.live !== undefined && typeof p.live !== 'boolean') throw new Error(`parcel ${id}: live must be true or false`);
  }
  return g;
}

export function budgetLeft(goal: ParcelGoal, ledger: Ledger, id: string): Alch {
  if (goal.mode === 'extract') return [0, 0, 0, 0];
  const spent = ledger.spent[id] ?? zero();
  const pulled = ledger.pulled?.[id] ?? zero();
  return goal.budget.map((b, i) => Math.max(0, b + pulled[i] - spent[i])) as Alch;
}

/** Reinvest the owner still owes this parcel: reinvestShare of what the steward's claims minted, less what was pulled. */
export function reinvestOwed(goal: ParcelGoal, ledger: Ledger, id: string): Alch {
  if (goal.mode !== 'max') return zero();
  const claimed = ledger.claimed?.[id] ?? zero();
  const pulled = ledger.pulled?.[id] ?? zero();
  return claimed.map((c, i) => Math.max(0, c * goal.reinvestShare - pulled[i])) as Alch;
}

/** What can be pulled now: owed, capped by the owner's allowance and balance, rounded down to 1e-6. */
export function pullable(owed: Alch, wallet: Wallet): Alch {
  return owed.map((o, i) => {
    const cap = Math.min(o, fromWei(wallet.ownerAllowance[i]), fromWei(wallet.ownerBalance[i]));
    return Math.floor(cap * 1e6) / 1e6;
  }) as Alch;
}

const valueOf = (a: Alch) => a.reduce((n, v, i) => n + v * WEIGHTS[i], 0);
/** Exact wei for an amount already rounded to 1e-6. */
const toWei = (v: number) => BigInt(Math.round(v * 1e6)) * 10n ** 12n;

/** Amount per alchemica type minted by a claim, from its receipt's AlchemicaClaimed logs. */
export function claimedFromLogs(logs: { address: string; topics: string[]; data: string }[], parcel: string): Alch {
  const out = zero();
  for (const l of logs) {
    if (!sameAddress(l.address, REALM_DIAMOND) || l.topics[0]?.toLowerCase() !== ALCHEMICA_CLAIMED) continue;
    if (BigInt(l.topics[1]) !== BigInt(parcel)) continue;
    out[Number(BigInt(l.topics[3]))] += fromWei(BigInt('0x' + l.data.slice(2, 66)));
  }
  return out;
}

/** The parcel as the sim sees it right now (time 0 = now), with the steward's spendable budget. */
export function liveWorld(p: ParcelInfo, goal: ParcelGoal, budget: Alch, nowSec: number): { world: World; config: ReturnType<typeof configFor> } {
  const daysLeft = Math.max(1, goal.horizonDays - (nowSec - Date.parse(goal.since) / 1000) / DAY);
  const config = configFor(p, { ...goal, horizonDays: daysLeft, surveyRest: false, budget });
  const world = createWorld(config, 1);
  world.placed = p.installations.map((q) => ({ ...q }));
  world.alchemicaRemaining = [...p.remaining];
  world.currentRound = p.surveyRound;
  world.nextSurveyAt = Infinity;
  world.unclaimed = [...p.available];
  world.lastUpdate = [0, 0, 0, 0];
  world.lastClaimedAt = p.lastClaimed > 0 ? p.lastClaimed - nowSec : -CLAIM_COOLDOWN;
  world.upgradeQueue = p.upgradeQueue.map((q) => ({
    x: q.x,
    y: q.y,
    fromTypeId: q.installationId,
    toTypeId: typeOf(q.installationId).nextLevelId,
    readyAt: Math.max(1, (q.readyBlock - p.block) * BLOCK_SEC),
  }));
  return { world, config };
}

/** Pick the next action the way the plan would: claim-only for extract, the rollout planner otherwise. */
export function decide(p: ParcelInfo, goal: ParcelGoal, budget: Alch, nowSec: number, pull: Alch = zero()): Next {
  const ready = p.upgradeQueue.filter((q) => q.readyBlock <= p.block).map((q) => q.index);
  if (ready.length) return { kind: 'act', action: { kind: 'finalize', indexes: ready }, steps: [], why: `${ready.length} queued upgrade(s) finished; finalizing puts them to work` };
  if (goal.mode === 'max' && valueOf(pull) >= REINVEST_MIN_VALUE)
    return { kind: 'act', action: { kind: 'reinvest', amounts: pull }, steps: [], why: `pull the owner's ${goal.reinvestShare * 100}% reinvest of claimed alchemica: ${fmt(pull)}` };

  const { world, config } = liveWorld(p, goal, budget, nowSec);
  const obs = observe(world);
  const claimAt = nowSec + Math.max(0, obs.canClaimAt);
  const brain = goal.mode === 'extract' ? claimOnly : planner(heuristic(config.valueWeights, config.blockTimeSec), config);
  let action = brain(1).act(obs, legalActions(world));
  // A claim with nothing in the reservoirs still costs gas and restarts the 8-hour cooldown.
  if (action.kind === 'claim' && !obs.available.some((a) => a > 1e-9)) action = { kind: 'wait' };
  if (action.kind === 'wait') {
    const canClaim = obs.canClaimAt <= 0;
    const why = canClaim ? 'reservoirs are empty and nothing worth building fits the budget' : 'claim cooldown running and nothing worth building fits the budget';
    return { kind: 'wait', why, until: canClaim ? null : claimAt };
  }
  const why =
    action.kind === 'claim' ? `claim ${obs.available.map((a, i) => (a > 1e-9 ? `${a.toFixed(2)} ${ALCHEMICA[i]}` : null)).filter(Boolean).join(', ')}`
    : action.kind === 'build' ? `build ${typeOf(action.typeId).name} at (${action.x},${action.y})`
    : action.kind === 'upgrade' ? `upgrade ${typeOf(world.placed.find((q) => q.x === action.x && q.y === action.y)!.typeId).name} at (${action.x},${action.y})`
    : '';
  return { kind: 'act', action, steps: [], why };
}

function zero(): Alch {
  return [0, 0, 0, 0];
}
const fmt = (a: Alch) => a.map((v, i) => (v > 1e-9 ? `${+v.toFixed(4)} ${ALCHEMICA[i]}` : null)).filter(Boolean).join(', ') || 'nothing';

function approvals(cost: bigint[], wallet: Wallet): Step[] {
  return cost
    .map((c, i) =>
      c > 0n && wallet.allowance[i] < c
        ? { label: `approve ${fromWei(c)} ${ALCHEMICA[i]} to the Installation diamond`, to: wallet.alchemica[i], sig: 'approve(address,uint256)', args: [INSTALLATION_DIAMOND, c.toString()], cost: zero() }
        : null,
    )
    .filter((s): s is Step => s !== null);
}

/**
 * Transactions for one action. `costs` holds exact on-chain alchemica costs (wei) by installation type.
 * Claims always pass the owner's pinned gotchi: the Realm mints the harvest to that gotchi's owner.
 */
export function stepsFor(
  action: Action | Finalize | Reinvest,
  p: ParcelInfo,
  goals: Goals,
  wallet: Wallet,
  costs: Map<number, bigint[]>,
): Step[] {
  const parcel = p.parcelId!;
  const gotchi = goals.gotchiId;
  const alch = (wei: bigint[]) => wei.map(fromWei) as Alch;
  switch (action.kind) {
    case 'reinvest':
      return action.amounts
        .map((v, i): Step | null =>
          v > 0
            ? { label: `pull ${v} ${ALCHEMICA[i]} reinvest from the owner`, to: wallet.alchemica[i], sig: 'transferFrom(address,address,uint256)', args: [goals.owner, goals.steward, toWei(v).toString()], cost: zero(), pull: action.amounts.map((_, k) => (k === i ? v : 0)) as Alch }
            : null,
        )
        .filter((s): s is Step => s !== null);
    case 'finalize':
      return [{ label: `finalize upgrade(s) ${action.indexes.join(', ')}`, to: INSTALLATION_DIAMOND, sig: 'finalizeUpgrades(uint256[])', args: [`[${action.indexes.join(',')}]`], cost: zero() }];
    case 'claim':
      return [{ label: `claim to gotchi ${gotchi}'s owner`, to: REALM_DIAMOND, sig: 'claimAvailableAlchemica(uint256,uint256,bytes)', args: [parcel, gotchi, '0x'], cost: zero() }];
    case 'build': {
      const t = typeOf(action.typeId);
      const cost = costs.get(t.id)!;
      const steps: Step[] = [];
      if (!(wallet.held.get(t.id) ?? 0)) {
        steps.push(...approvals(cost, wallet));
        steps.push({ label: `craft ${t.name}`, to: INSTALLATION_DIAMOND, sig: 'craftInstallations(uint16[],uint40[])', args: [`[${t.id}]`, '[0]'], cost: alch(cost) });
      }
      steps.push({
        label: `equip ${t.name} at (${action.x},${action.y})`,
        to: REALM_DIAMOND,
        sig: 'equipInstallation(uint256,uint256,uint256,uint256,uint256,bytes)',
        args: [parcel, gotchi, String(t.id), String(action.x), String(action.y), '0x'],
        cost: zero(),
      });
      return steps;
    }
    case 'upgrade': {
      const placed = p.installations.find((q) => q.x === action.x && q.y === action.y)!;
      const cur = typeOf(placed.typeId);
      const next = typeOf(cur.nextLevelId);
      const cost = costs.get(next.id)!;
      return [
        ...approvals(cost, wallet),
        {
          label: `upgrade ${cur.name} at (${action.x},${action.y}) to level ${next.level}`,
          to: INSTALLATION_DIAMOND,
          sig: 'upgradeInstallation((address,uint16,uint16,uint40,bool,uint256,uint256),uint256,bytes,uint40)',
          args: [`(${goals.steward},${action.x},${action.y},0,false,${parcel},${cur.id})`, gotchi, '0x', '0'],
          cost: alch(cost),
        },
      ];
    }
    case 'wait':
      return [];
  }
}

/** Problems that block an action outright. Spending must fit both the parcel's budget left and the wallet. */
export function spendProblems(steps: Step[], left: Alch, wallet: Wallet, goal: ParcelGoal, action: Action | Finalize | Reinvest, owed: Alch = zero()): string[] {
  const problems: string[] = [];
  const pulling = steps.reduce((sum, s) => sum.map((v, i) => v + (s.pull?.[i] ?? 0)) as Alch, zero());
  for (let i = 0; i < 4; i++) if (pulling[i] > owed[i] + 1e-6) problems.push(`pulling ${pulling[i]} ${ALCHEMICA[i]} is more than the owner owes (${owed[i].toFixed(6)})`);
  if (pulling.some((v) => v > 0) && goal.mode !== 'max') problems.push('only max mode pulls reinvest');
  const total = steps.reduce((sum, s) => sum.map((v, i) => v + s.cost[i]) as Alch, zero());
  for (let i = 0; i < 4; i++) {
    if (total[i] > left[i] + 1e-9) problems.push(`${total[i]} ${ALCHEMICA[i]} is over this parcel's budget left (${left[i].toFixed(2)})`);
    if (total[i] > fromWei(wallet.balance[i]) + 1e-9) problems.push(`steward holds ${fromWei(wallet.balance[i]).toFixed(2)} ${ALCHEMICA[i]}, needs ${total[i]}`);
  }
  if (action.kind === 'build' || action.kind === 'upgrade') {
    if (goal.mode === 'extract') problems.push('extract mode never builds or upgrades');
    const typeId = action.kind === 'build' ? action.typeId : undefined;
    if (typeId !== undefined) {
      const t = typeOf(typeId);
      if (t.kind !== 'altar' && !goal.alchemica[t.alchemicaType]) problems.push(`${t.name} is outside the owner's alchemica goal`);
    }
  }
  return problems;
}

// ---- chain I/O ----

export type Check = { ok: boolean; problems: string[]; notes: string[] };

/** Guards that hold for every action: right chain, parcel still the owner's, gotchi pinned to the owner, rights granted. */
export async function check(goals: Goals, p: ParcelInfo, goal: ParcelGoal): Promise<Check> {
  const problems: string[] = [];
  const notes: string[] = [];
  const chain = Number(await cast(['chain-id', '--rpc-url', RPC]));
  if (chain !== CHAIN_ID) problems.push(`RPC is chain ${chain}, not Base (${CHAIN_ID})`);
  if (!sameAddress(p.owner, goals.owner)) problems.push(`parcel ${p.parcelId} is owned by ${p.owner}, not ${goals.owner}`);

  const [gotchiOwner, lent] = await Promise.all([
    callAt(AAVEGOTCHI_DIAMOND, 'ownerOf(uint256)(address)', [goals.gotchiId]).catch(() => 'none'),
    callAt(AAVEGOTCHI_DIAMOND, 'isAavegotchiLent(uint32)(bool)', [goals.gotchiId]).catch(() => 'unknown'),
  ]);
  if (!sameAddress(gotchiOwner, goals.owner)) problems.push(`gotchi ${goals.gotchiId} is owned by ${gotchiOwner}, not the parcel owner: claims would mint the harvest to them`);
  if (lent !== 'false') problems.push(`gotchi ${goals.gotchiId} is lent (or unreadable): claims would mint the harvest to the lending escrow`);

  for (const right of RIGHTS[goal.mode]) {
    try {
      await callRealm('verifyAccessRight(uint256,uint256,uint256,address)', p.parcelId!, goals.gotchiId, String(right), goals.steward);
    } catch {
      problems.push(`steward ${goals.steward} lacks action right ${right} (${{ 1: 'claim', 2: 'equip', 6: 'upgrade' }[right]}) on parcel ${p.parcelId}`);
    }
  }
  const eth = ints(await cast(['balance', goals.steward, '--rpc-url', RPC]))[0];
  if (eth === 0n) problems.push(`steward ${goals.steward} has no ETH for gas`);
  else notes.push(`steward gas: ${fromWei(eth).toFixed(6)} ETH`);
  if (p.mismatches.length || p.unknownTypes.length) notes.push(`parcel layout cross-check: ${JSON.stringify(p.mismatches)} unknown types ${p.unknownTypes}`);
  return { ok: problems.length === 0, problems, notes };
}

export async function readWallet(steward: string, owner: string): Promise<Wallet> {
  const alchemica = (await callRealm('getAlchemicaAddresses()(address[4])')).match(/0x[0-9a-fA-F]{40}/g)!;
  const each = (sig: string, args: string[]) => Promise.all(alchemica.map(async (a) => ints(await callAt(a, sig, args))[0]));
  const [balance, allowance, ownerAllowance, ownerBalance, held] = await Promise.all([
    each('balanceOf(address)(uint256)', [steward]),
    each('allowance(address,address)(uint256)', [steward, INSTALLATION_DIAMOND]),
    each('allowance(address,address)(uint256)', [owner, steward]),
    each('balanceOf(address)(uint256)', [owner]),
    callAt(INSTALLATION_DIAMOND, 'installationsBalances(address)((uint256,uint256)[])', [steward]),
  ]);
  const pairs = ints(held).map(Number);
  const map = new Map<number, number>();
  for (let i = 0; i + 1 < pairs.length; i += 2) map.set(pairs[i], pairs[i + 1]);
  return { alchemica, balance, allowance, held: map, ownerAllowance, ownerBalance };
}

/** Exact alchemica cost (wei) of an installation type, from the Installation diamond. */
export async function chainCost(typeId: number): Promise<bigint[]> {
  const out = await cast([
    'call', INSTALLATION_DIAMOND,
    'getInstallationType(uint256)((uint8,uint8,uint16,uint8,uint8,uint32,uint16,uint8,uint32,uint32,bool,uint256[4],uint256,uint256,uint256[],string,uint256,uint256))',
    String(typeId), '--rpc-url', RPC, '--json',
  ]);
  // Long integers come back as bare JSON numbers; quote them so no digit is lost.
  const t = JSON.parse(out.replace(/(?<![\d."])(\d{16,})(?![\d"])/g, '"$1"'))[0];
  return (t[11] as (string | number)[]).map((v) => BigInt(v));
}

function readLedger(path: string): Ledger {
  const l: Ledger = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { spent: {}, entries: [] };
  l.claimed ??= {};
  l.pulled ??= {};
  return l;
}

/**
 * Point cast at the steward's keystore through the environment (nothing secret on its command line) and return the
 * address it signs as. The password, if it came as STEWARD_KEYSTORE_PASSWORD, goes to a 0600 file that `cleanup` removes.
 */
async function useKeystore(name: string): Promise<{ address: string; cleanup: () => void }> {
  for (const k of ['PRIVATE_KEY', 'EVM_PRIVATE_KEY'])
    if (process.env[k]) throw new Error(`${k} is in the environment: refusing. Inject only the keystore password: abra run ${name} -k ${PASSWORD_VAR} -- …`);
  if (!process.env.ETH_KEYSTORE && !process.env.ETH_KEYSTORE_ACCOUNT) process.env.ETH_KEYSTORE = keystorePath(name);
  if (process.env.ETH_KEYSTORE && !existsSync(process.env.ETH_KEYSTORE)) throw new Error(`no keystore at ${process.env.ETH_KEYSTORE}: run node src/steward-setup.ts --name ${name}`);
  let cleanup = () => {};
  if (!process.env.ETH_PASSWORD) {
    const password = process.env[PASSWORD_VAR];
    if (!password) throw new Error(`no keystore password: set ETH_PASSWORD (a file) or inject it: abra run ${name} -k ${PASSWORD_VAR} -- …`);
    const dir = mkdtempSync(join(tmpdir(), 'steward-'));
    writeFileSync(join(dir, 'pw'), password, { mode: 0o600 });
    process.env.ETH_PASSWORD = join(dir, 'pw');
    cleanup = () => rmSync(dir, { recursive: true, force: true });
  }
  try {
    return { address: await cast(['wallet', 'address']), cleanup };
  } catch (e) {
    cleanup();
    throw e;
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { goals: { type: 'string' }, parcel: { type: 'string' }, send: { type: 'boolean', default: false } },
  });
  const cmd = positionals[0];
  if (!['check', 'next'].includes(cmd) || !values.goals || !values.parcel) {
    console.error('usage: check|next --goals parcel-goals.json --parcel <id> [--send]');
    process.exit(1);
  }
  const goals = parseGoals(readFileSync(values.goals, 'utf8'));
  const id = assertUint(values.parcel, 'parcel id');
  const goal = goals.parcels[id];
  if (!goal) throw new Error(`parcel ${id} has no goal in ${values.goals}`);
  const ledgerPath = join(dirname(values.goals), 'steward-ledger.json');

  const p = await readParcel(id);
  const guard = await check(goals, p, goal);
  console.log(`Parcel ${id} (${goal.mode}), steward ${goals.steward}, owner's gotchi ${goals.gotchiId}, block ${p.block}`);
  for (const n of guard.notes) console.log(`  ${n}`);
  for (const pr of guard.problems) console.log(`! ${pr}`);
  if (cmd === 'check') {
    console.log(guard.ok ? 'all guards pass' : 'blocked');
    process.exit(guard.ok ? 0 : 2);
  }
  if (!guard.ok) {
    console.log('blocked: no action until the problems above are fixed');
    process.exit(2);
  }

  const wallet = await readWallet(goals.steward, goals.owner);
  const ledger = readLedger(ledgerPath);
  const left = budgetLeft(goal, ledger, id);
  const owed = reinvestOwed(goal, ledger, id);
  const pull = pullable(owed, wallet);
  const spendable = left.map((l, i) => Math.min(l, fromWei(wallet.balance[i]))) as Alch;
  const now = Math.floor(Date.now() / 1000);
  const next = decide(p, goal, spendable, now, pull);
  console.log(`budget left: ${left.map((v, i) => `${v.toFixed(2)} ${ALCHEMICA[i]}`).join(', ')}`);
  if (goal.mode === 'max') {
    console.log(`reinvest owed: ${fmt(owed)}; pullable now: ${fmt(pull)}`);
    const short = owed.map((o, i) => (o > fromWei(wallet.ownerAllowance[i]) + 1e-6 ? ALCHEMICA[i] : null)).filter(Boolean);
    if (short.length) console.log(`  owner allowance to the steward is short for ${short.join(', ')}: run steward.ts allowance and have the owner sign`);
  }
  if (next.kind === 'wait') {
    console.log(`next: wait (${next.why})${next.until ? `; claim opens ${new Date(next.until * 1000).toISOString()}` : ''}`);
    return;
  }

  const action = next.action;
  const costs = new Map<number, bigint[]>();
  if (action.kind === 'build') costs.set(action.typeId, await chainCost(action.typeId));
  if (action.kind === 'upgrade') {
    const cur = typeOf(p.installations.find((q) => q.x === action.x && q.y === action.y)!.typeId);
    costs.set(cur.nextLevelId, await chainCost(cur.nextLevelId));
  }
  const steps = stepsFor(action, p, goals, wallet, costs);
  const problems = spendProblems(steps, left, wallet, goal, action, owed);
  console.log(`next: ${next.why}`);
  steps.forEach((s, i) => console.log(`  ${i + 1}. ${s.label}`));
  for (const pr of problems) console.log(`! ${pr}`);
  if (problems.length) process.exit(2);

  const sending = values.send && process.env.DRY_RUN === '0' && goal.live === true;
  if (values.send && process.env.DRY_RUN !== '0') console.log('--send ignored: DRY_RUN is not 0');
  else if (values.send && goal.live !== true) console.log(`--send ignored: parcel ${id} is not live in the goals file (shadow mode)`);
  let cleanupKeystore = () => {};
  if (sending) {
    const signer = await useKeystore(goals.name);
    cleanupKeystore = signer.cleanup;
    if (!sameAddress(signer.address, goals.steward)) {
      cleanupKeystore();
      throw new Error(`keystore address ${signer.address} is not the steward ${goals.steward}`);
    }
  }

  // One run at a time per goals file, so two wakes can't spend the same budget.
  const lock = join(dirname(values.goals), '.steward.lock');
  let fd: number;
  try {
    fd = openSync(lock, 'wx');
  } catch {
    cleanupKeystore();
    throw new Error(`another steward run holds ${lock}; remove it if no run is active`);
  }
  try {
    for (const [i, s] of steps.entries()) {
      try {
        // After a send, a load-balanced RPC can answer from a node that hasn't seen it yet; give it a few tries.
        for (let attempt = 0; ; attempt++) {
          try {
            await callAt(s.to, s.sig, s.args, goals.steward);
            break;
          } catch (e) {
            if (!sending || i === 0 || attempt >= 3) throw e;
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
        console.log(`  ${i + 1}. simulated ok`);
      } catch (e) {
        const reason = (e as { stderr?: string }).stderr?.trim().split('\n').pop() ?? String(e);
        if (!sending && i > 0) {
          console.log(`  ${i + 1}. not simulated: depends on step ${i} landing first`);
          break;
        }
        console.log(`  ${i + 1}. simulation REVERTS: ${reason}`);
        process.exitCode = 2;
        break;
      }
      if (!sending) continue;
      if (s.sig.startsWith('claimAvailableAlchemica')) {
        const owner = await callAt(AAVEGOTCHI_DIAMOND, 'ownerOf(uint256)(address)', [goals.gotchiId]);
        if (!sameAddress(owner, goals.owner)) throw new Error(`gotchi ${goals.gotchiId} changed hands to ${owner}; not claiming`);
      }
      const receipt = JSON.parse(await cast(['send', s.to, s.sig, ...s.args, '--rpc-url', RPC, '--json']));
      const ok = receipt.status === '0x1' || receipt.status === 1 || receipt.status === '1';
      console.log(`  ${i + 1}. sent ${receipt.transactionHash}: ${ok ? 'ok' : 'FAILED'}`);
      const add = (book: Record<string, Alch>, a: Alch) => (book[id] = (book[id] ?? zero()).map((v, k) => v + a[k]) as Alch);
      const entry: Ledger['entries'][number] = { at: new Date().toISOString(), parcel: id, action: s.label, tx: receipt.transactionHash, cost: ok ? s.cost : zero() };
      if (ok && s.cost.some((c) => c > 0)) add(ledger.spent, s.cost);
      if (ok && s.pull) add(ledger.pulled!, (entry.pulled = s.pull));
      if (ok && s.sig.startsWith('claimAvailableAlchemica')) {
        entry.claimed = claimedFromLogs(receipt.logs ?? [], id);
        add(ledger.claimed!, entry.claimed);
        console.log(`     claimed ${fmt(entry.claimed)} to the owner`);
      }
      ledger.entries.push(entry);
      writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
      if (!ok) {
        process.exitCode = 2;
        break;
      }
    }
  } finally {
    closeSync(fd);
    rmSync(lock, { force: true });
    cleanupKeystore();
  }
  if (!sending) console.log('dry run: nothing sent');
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!);
if (isMain) await main();
