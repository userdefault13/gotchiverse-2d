import { DAY, MAX_HARVESTERS, TOTAL_ALCHEMICAS, typeOf, value } from '../rules.ts';
import { altarLevel, capacity, harvestRate, upgradeQueueCapacity } from '../world.ts';
import { bankable } from './heuristic.ts';
import type { Action, InstallationType, Placed, SimConfig, World } from '../types.ts';

const KINDS = ['wait', 'build', 'upgrade'] as const;
const TARGETS = ['harvester', 'reservoir', 'altar'] as const;

/** What the parcel and budget look like now, shared by every candidate action. */
export function stateFeatures(world: World, config: SimConfig): number[] {
  const rate = harvestRate(world);
  const cap = capacity(world);
  const total = TOTAL_ALCHEMICAS[world.size];
  const harvesters = world.placed.filter((p) => typeOf(p.typeId).kind === 'harvester').length;
  return [
    (world.horizon - world.time) / DAY / 365,
    world.time / DAY / 365,
    ...world.budget.map((b) => Math.log1p(b)),
    ...rate.map((r) => Math.log1p(r)),
    ...cap.map((c) => Math.log1p(c)),
    ...world.alchemicaRemaining.map((r, i) => r / total[i]),
    altarLevel(world),
    harvesters / MAX_HARVESTERS[world.size],
    world.upgradeQueue.length / Math.max(1, upgradeQueueCapacity(world)),
    world.size,
  ];
}

/** The installation an action would add or turn into, and the layout after it. */
function target(world: World, action: Action): { t: InstallationType; after: Placed[] } | null {
  if (action.kind === 'build') {
    return { t: typeOf(action.typeId), after: [...world.placed, { typeId: action.typeId, x: action.x, y: action.y }] };
  }
  if (action.kind === 'upgrade') {
    const p = world.placed.find((q) => q.x === action.x && q.y === action.y)!;
    const t = typeOf(typeOf(p.typeId).nextLevelId);
    return { t, after: world.placed.map((q) => (q === p ? { ...q, typeId: t.id } : q)) };
  }
  return null;
}

/** What one candidate does: its kind, what it builds, what it costs, and how fast it pays back on its own. */
export function actionFeatures(world: World, action: Action, config: SimConfig, baseBankable: number): number[] {
  const kind = KINDS.map((k) => (action.kind === k ? 1 : 0));
  const tgt = target(world, action);
  if (!tgt) return [...kind, ...new Array(14).fill(0)];
  const { t, after } = tgt;
  const w = config.valueWeights;
  const cost = value(t.alchemicaCost, w);
  const daysLeft = (world.horizon - world.time) / DAY;
  const gain = bankable(after, world, w) - baseBankable;
  const payback = cost > 0 ? (gain * daysLeft) / cost : 0;
  const budgetShare = Math.max(...t.alchemicaCost.map((c, i) => (c > 0 ? c / Math.max(world.budget[i], 1e-9) : 0)));
  return [
    ...kind,
    ...TARGETS.map((k) => (t.kind === k ? 1 : 0)),
    ...[0, 1, 2, 3].map((i) => (t.kind !== 'altar' && t.alchemicaType === i ? 1 : 0)),
    t.level,
    Math.log1p(cost),
    Math.min(budgetShare, 1),
    Math.log1p(t.harvestRate),
    Math.log1p(t.capacity),
    Math.log1p(Math.max(0, payback)),
    gain > 0 ? 1 : 0,
  ];
}

/** One feature row per candidate: state features followed by that candidate's action features. */
export function featurize(world: World, candidates: Action[], config: SimConfig): number[][] {
  const s = stateFeatures(world, config);
  const base = bankable(world.placed, world, config.valueWeights);
  return candidates.map((a) => [...s, ...actionFeatures(world, a, config, base)]);
}
