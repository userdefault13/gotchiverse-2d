import { CLAIM_COOLDOWN, DAY, typeOf, value } from '../rules.ts';
import { legalActions } from '../step.ts';
import type { Action, Alch, Observation, Placed, Policy, World } from '../types.ts';
import type { PolicyFactory } from '../episode.ts';

const CLAIMS_PER_DAY = DAY / CLAIM_COOLDOWN;
/** Only build when the return over the remaining horizon beats the cost by this much. */
const PAYBACK_MARGIN = 1.1;
/** Save up instead of buying the best affordable option when an unaffordable one is this much better per alchemica. */
const SAVE_UP_RATIO = 1.5;

/** gain: extra value banked before the horizon or before that alchemica runs out, whichever comes first */
type Candidate = { action: Action; gain: number; cost: number; readyAt: number };

function rateAndCapacity(placed: Placed[]): { rate: Alch; cap: Alch } {
  const rate: Alch = [0, 0, 0, 0];
  const cap: Alch = [0, 0, 0, 0];
  for (const p of placed) {
    const t = typeOf(p.typeId);
    if (t.kind === 'harvester') rate[t.alchemicaType] += t.harvestRate;
    if (t.kind === 'reservoir') cap[t.alchemicaType] += t.capacity;
  }
  return { rate, cap };
}

/** Value per day a layout can actually bank: harvest rate, capped by what reservoirs hold across 3 claims a day. */
export function bankable(placed: Placed[], world: World, weights: Alch): number {
  const { rate, cap } = rateAndCapacity(placed);
  const daily = rate.map((r, i) => (world.alchemicaRemaining[i] > 0 ? Math.min(r, cap[i] * CLAIMS_PER_DAY) : 0)) as Alch;
  return value(daily, weights);
}

/** Value a layout banks over the next `days`, never more than the alchemica left on the parcel. */
function bankedOver(placed: Placed[], world: World, weights: Alch, days: number): number {
  const { rate, cap } = rateAndCapacity(placed);
  let total = 0;
  for (let i = 0; i < 4; i++) total += Math.min(Math.min(rate[i], cap[i] * CLAIMS_PER_DAY) * days, world.alchemicaRemaining[i]) * weights[i];
  return total;
}

/** Extra value a new layout banks from `readyAt` to the horizon, compared with keeping the current one. */
function gainFrom(after: Placed[], world: World, weights: Alch, readyAt: number): number {
  const days = Math.max(0, (world.horizon - readyAt) / DAY);
  return bankedOver(after, world, weights, days) - bankedOver(world.placed, world, weights, days);
}

function candidates(world: World, legal: Action[], weights: Alch, blockTimeSec: number): Candidate[] {
  const out: Candidate[] = [];
  for (const action of legal) {
    if (action.kind === 'build') {
      const t = typeOf(action.typeId);
      const after = [...world.placed, { typeId: t.id, x: action.x, y: action.y }];
      out.push({ action, gain: gainFrom(after, world, weights, world.time), cost: value(t.alchemicaCost, weights), readyAt: world.time });
    } else if (action.kind === 'upgrade') {
      const p = world.placed.find((q) => q.x === action.x && q.y === action.y)!;
      const next = typeOf(typeOf(p.typeId).nextLevelId);
      const after = world.placed.map((q) => (q === p ? { ...q, typeId: next.id } : q));
      let readyAt = world.time + next.craftTime * blockTimeSec;
      let gain = gainFrom(after, world, weights, readyAt);
      let cost = value(next.alchemicaCost, weights);
      if (next.kind === 'altar') {
        // An altar earns nothing itself; value it by the best upgrade it unlocks, paid for together.
        const unlocked = bestUnlockedUpgrade(world, next.level, readyAt, weights, blockTimeSec);
        if (!unlocked) continue;
        gain = unlocked.gain;
        cost += unlocked.cost;
        readyAt = unlocked.readyAt;
      }
      out.push({ action, gain, cost, readyAt });
    }
  }
  return out;
}

function bestUnlockedUpgrade(world: World, altarAfter: number, altarReadyAt: number, weights: Alch, blockTimeSec: number) {
  let best: { gain: number; cost: number; readyAt: number } | null = null;
  for (const p of world.placed) {
    const cur = typeOf(p.typeId);
    if (cur.kind === 'altar' || cur.nextLevelId === 0) continue;
    const next = typeOf(cur.nextLevelId);
    if (next.prerequisites[0] !== altarAfter) continue;
    const readyAt = altarReadyAt + next.craftTime * blockTimeSec;
    const gain = gainFrom(world.placed.map((q) => (q === p ? { ...q, typeId: next.id } : q)), world, weights, readyAt);
    const cost = value(next.alchemicaCost, weights);
    if (!best || gain / cost > best.gain / best.cost) best = { gain, cost, readyAt };
  }
  return best;
}

function worthIt(c: Candidate): boolean {
  return c.gain > c.cost * PAYBACK_MARGIN;
}

const ratio = (c: Candidate) => c.gain / c.cost;

/**
 * Hand-written steward:
 * 1. Claim the moment the 8h cooldown ends (reservoirs are small, so late claims waste harvest).
 * 2. Otherwise buy the build or upgrade that adds the most bankable value per alchemica spent, counting only
 *    what it banks before the horizon or before the parcel runs dry. Altar upgrades are valued by what they unlock.
 * 3. If something much better is only out of budget, wait and save for it.
 */
export function heuristic(weights: Alch, blockTimeSec: number): PolicyFactory {
  return () => {
    // Build/upgrade choices only change after a claim, build, upgrade or survey, so skip re-deciding in between.
    let lastWaitKey = '';
    return {
      name: 'heuristic',
      act(obs: Observation, legal: Action[]): Action {
        const world = obs.world as World;
        const claim = legal.find((a) => a.kind === 'claim');
        if (claim && obs.available.some((a) => a > 0)) return claim;

        const key = stateKey(world);
        if (key === lastWaitKey) return { kind: 'wait' };
        const choice = decide(world, legal, weights, blockTimeSec);
        lastWaitKey = choice.kind === 'wait' ? key : '';
        return choice;
      },
    } satisfies Policy;
  };
}

export function stateKey(world: World): string {
  return `${world.budget.join()}|${world.placed.map((p) => p.typeId).join()}|${world.upgradeQueue.length}|${world.currentRound}`;
}

// What could be built with unlimited budget depends only on the layout, queue and survey round.
const unlimitedCache = new Map<string, Action[]>();

function unlimitedBudgetActions(world: World): Action[] {
  const key = `${world.goalAlchemica}|${world.size}|${world.currentRound}|${world.placed.map((p) => `${p.typeId}@${p.x},${p.y}`).join()}|${world.upgradeQueue.map((u) => `${u.x},${u.y}`).join()}`;
  let actions = unlimitedCache.get(key);
  if (!actions) {
    if (unlimitedCache.size > 50_000) unlimitedCache.clear();
    actions = legalActions({ ...world, budget: [1e15, 1e15, 1e15, 1e15] }).filter((a) => a.kind !== 'claim');
    unlimitedCache.set(key, actions);
  }
  return actions;
}

function decide(world: World, legal: Action[], weights: Alch, blockTimeSec: number): Action {
  const affordable = candidates(world, legal, weights, blockTimeSec).filter(worthIt);
  const all = candidates(world, unlimitedBudgetActions(world), weights, blockTimeSec).filter(worthIt);

  const bestAffordable = affordable.sort((a, b) => ratio(b) - ratio(a))[0];
  const bestOverall = all.sort((a, b) => ratio(b) - ratio(a))[0];
  if (bestOverall && (!bestAffordable || ratio(bestOverall) > ratio(bestAffordable) * SAVE_UP_RATIO)) {
    return { kind: 'wait' };
  }
  return bestAffordable?.action ?? { kind: 'wait' };
}
