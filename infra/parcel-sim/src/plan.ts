// Turn an owner's goals for one parcel into an extraction plan: what the steward will build and when, what it
// costs, and what the owner gets, projected in the sim from the parcel's actual state.
import { BUILDABLE, DAY, DEFAULT_CONFIG, MAX_HARVESTERS, TOTAL_ALCHEMICAS, typeOf, value } from './rules.ts';
import { score, simulate, type LogEntry, type PolicyFactory } from './episode.ts';
import { claimOnly } from './policies/baselines.ts';
import { heuristic } from './policies/heuristic.ts';
import { planner } from './policies/planner.ts';
import { createWorld, harvestRate } from './world.ts';
import type { Alch, ParcelSize, Placed, Policy, SimConfig, World } from './types.ts';

export const ALCHEMICA = ['FUD', 'FOMO', 'ALPHA', 'KEK'] as const;

/** A parcel as the chain reports it (the shape a parcel reader fills in). */
export type ParcelState = {
  parcelId?: string;
  size: ParcelSize;
  /** survey rounds done, 0-10 */
  surveyRound: number;
  /** alchemica surveyed and not yet claimed */
  remaining: Alch;
  installations: Placed[];
};

/**
 * extract: claim with what is equipped, build nothing.
 * budget: build and upgrade from the owner's budget only (no reinvesting), then extract.
 * max: also reinvest a share of every claim, and keep building while it pays back within the horizon.
 */
export type Mode = 'extract' | 'budget' | 'max';

export type Goal = {
  alchemica: [boolean, boolean, boolean, boolean];
  mode: Mode;
  /** alchemica the owner sends the steward up front */
  budget: Alch;
  /** share of each claim sent back to the steward; only used in max mode */
  reinvestShare: number;
  horizonDays: number;
  /** plan as if the owner surveys the remaining rounds now, at their expected yield */
  surveyRest: boolean;
};

export type PlanStep = { day: number; action: string; cost: Alch; readyDay: number };
export type DayPoint = { day: number; ownerNet: number; ratePerDay: Alch; remaining: Alch };

export type Plan = {
  parcel: ParcelState;
  goal: Goal;
  /** Realm diamond action rights the owner must whitelist the steward for */
  rights: number[];
  warnings: string[];
  /** remaining alchemica the plan works from, and whether part of it is an estimate */
  startRemaining: Alch;
  estimated: boolean;
  steps: PlanStep[];
  /** day the layout stops changing (last build or upgrade done) */
  finalLayoutDay: number | null;
  finalLayout: string[];
  /** harvester count against the size cap, and each harvester's level against the highest level that exists */
  harvesters: { used: number; max: number; levels: number[]; topLevel: number };
  /** harvest lost because reservoirs were full at claim time */
  wasted: Alch;
  startRatePerDay: Alch;
  endRatePerDay: Alch;
  extracted: Alch;
  spent: Alch;
  fundedByOwner: Alch;
  /** steward budget left unspent at the end; goes back to the owner */
  leftoverBudget: Alch;
  /** what the owner ends with in FUD-equivalent: harvest − everything sent to the steward + steward's leftover budget */
  ownerNet: number;
  /** the same parcel claimed as-is with no building */
  extractOnlyNet: number;
  /** first day the plan's owner net passes extract-only for good */
  breakEvenDay: number | null;
  /** day each alchemica on the parcel runs out, if within the horizon */
  runOutDay: (number | null)[];
  /** last day to survey more rounds before something the parcel harvests runs dry; null if nothing does or no rounds are left */
  surveyBy: number | null;
  series: DayPoint[];
};

/** Expected yield of the survey rounds not done yet (round 0 releases 25%, rounds 1-9 75%/9 each, mean 1x). */
export function expectedUnsurveyed(size: ParcelSize, surveyRound: number): Alch {
  return TOTAL_ALCHEMICAS[size].map((total) => {
    let sum = 0;
    for (let r = surveyRound; r < 10; r++) sum += r === 0 ? total / 4 : (total * 0.75) / 9;
    return sum;
  }) as Alch;
}

/** World built from the parcel's chain state rather than a fresh survey. */
function worldFor(parcel: ParcelState, goal: Goal, config: SimConfig): World {
  const world = createWorld(config, 1);
  const extra = goal.surveyRest ? expectedUnsurveyed(parcel.size, parcel.surveyRound) : [0, 0, 0, 0];
  world.placed = parcel.installations.map((p) => ({ ...p }));
  world.alchemicaRemaining = parcel.remaining.map((r, i) => r + extra[i]) as Alch;
  world.currentRound = goal.surveyRest ? 10 : parcel.surveyRound;
  world.nextSurveyAt = Infinity;
  return world;
}

export function configFor(parcel: ParcelState, goal: Goal): SimConfig {
  return {
    ...DEFAULT_CONFIG,
    size: parcel.size,
    horizonDays: goal.horizonDays,
    starting: parcel.installations,
    startingBudget: goal.mode === 'extract' ? [0, 0, 0, 0] : [...goal.budget],
    reinvestShare: goal.mode === 'max' ? goal.reinvestShare : 0,
    surveyEveryDays: 0,
    maxSurveyRounds: 10,
    goalAlchemica: goal.alchemica,
  };
}

/** Run a policy on the parcel, recording owner net, rate and remaining alchemica once a day. */
function project(make: PolicyFactory, parcel: ParcelState, goal: Goal, config: SimConfig) {
  const world = worldFor(parcel, goal, config);
  const w = config.valueWeights;
  const series: DayPoint[] = [];
  const point = (): DayPoint => ({
    day: Math.floor(world.time / DAY),
    ownerNet: value(world.stats.harvested, w) - value(world.stats.fundedByOwner, w) + value(world.budget, w),
    ratePerDay: harvestRate(world),
    remaining: [...world.alchemicaRemaining],
  });
  const inner = make(1);
  const recorder: Policy = {
    name: inner.name,
    act(obs, legal) {
      if (series.length === 0 || series[series.length - 1].day < Math.floor(world.time / DAY)) series.push(point());
      return inner.act(obs, legal);
    },
  };
  const log: LogEntry[] = [];
  simulate(world, config, recorder, world.horizon, log);
  series.push(point());
  return { world, log, score: score(world, config), series };
}

/** Highest level any harvester upgrades to on Base. */
function topHarvesterLevel(): number {
  let top = 0;
  for (const t of BUILDABLE) {
    if (t.kind !== 'harvester') continue;
    let cur = t;
    while (cur.nextLevelId !== 0) cur = typeOf(cur.nextLevelId);
    top = Math.max(top, cur.level);
  }
  return top;
}

export function makePlan(parcel: ParcelState, goal: Goal): Plan {
  const config = configFor(parcel, goal);
  const warnings: string[] = [];
  const chosen = goal.alchemica.map((on, i) => (on ? ALCHEMICA[i] : null)).filter(Boolean);
  const harvesterTypes = parcel.installations.map((p) => typeOf(p.typeId)).filter((t) => t.kind === 'harvester');

  if (parcel.surveyRound === 0 && !goal.surveyRest)
    warnings.push('Parcel has never been surveyed: nothing can be equipped or claimed until the owner surveys it (owner-only).');
  else if (parcel.surveyRound < 10 && !goal.surveyRest)
    warnings.push(`Surveyed ${parcel.surveyRound} of 10 rounds: the plan only counts alchemica found so far. Surveying the rest (owner-only) adds about ${expectedUnsurveyed(parcel.size, parcel.surveyRound).map((v, i) => `${Math.round(v).toLocaleString('en-US')} ${ALCHEMICA[i]}`).join(', ')}.`);
  if (goal.surveyRest && parcel.surveyRound < 10)
    warnings.push(`Assumes the owner surveys the remaining ${10 - parcel.surveyRound} rounds now; their yield is an estimate (each round lands between 60% and about 2x of average).`);
  if (goal.mode === 'extract' && harvesterTypes.length === 0)
    warnings.push('Extract only, but the parcel has no harvesters: nothing will be extracted. Choose budget or max mode, or equip harvesters first.');
  if (goal.mode === 'extract' && chosen.length < 4)
    warnings.push('Claims always collect every alchemica type the parcel is harvesting; the choice of types only limits what gets built.');
  if (!parcel.installations.some((p) => typeOf(p.typeId).kind === 'altar') && goal.mode !== 'extract')
    warnings.push('No altar equipped: the steward cannot equip harvesters or reservoirs without one, and equipping an altar is outside its rights.');

  const brain: PolicyFactory = goal.mode === 'extract' ? claimOnly : planner(heuristic(config.valueWeights, config.blockTimeSec), config);
  const run = project(brain, parcel, goal, config);
  const { series } = run;
  const baseline = goal.mode === 'extract' ? run : project(claimOnly, parcel, { ...goal, mode: 'extract' }, configFor(parcel, { ...goal, mode: 'extract' }));

  const steps: PlanStep[] = [];
  let finalLayoutDay: number | null = null;
  // Replay the log to name what each build/upgrade was at the time it happened.
  const layout = new Map(parcel.installations.map((p) => [`${p.x},${p.y}`, p.typeId]));
  for (const e of run.log) {
    if (!e.ok || (e.action.kind !== 'build' && e.action.kind !== 'upgrade')) continue;
    const day = e.t / DAY;
    if (e.action.kind === 'build') {
      const t = typeOf(e.action.typeId);
      layout.set(`${e.action.x},${e.action.y}`, t.id);
      steps.push({ day, action: `build ${t.name} at (${e.action.x},${e.action.y})`, cost: t.alchemicaCost, readyDay: day });
      finalLayoutDay = day;
    } else {
      const key = `${e.action.x},${e.action.y}`;
      const cur = typeOf(layout.get(key)!);
      const next = typeOf(cur.nextLevelId);
      layout.set(key, next.id);
      const readyDay = day + (next.craftTime * config.blockTimeSec) / DAY;
      steps.push({ day, action: `upgrade ${cur.name} at (${key}) to level ${next.level}`, cost: next.alchemicaCost, readyDay });
      finalLayoutDay = Math.max(finalLayoutDay ?? 0, readyDay);
    }
  }

  const runOutDay = series[0].remaining.map((start, i) => {
    if (start <= 0) return null;
    const hit = series.find((p) => p.remaining[i] <= 1e-9);
    return hit ? hit.day : null;
  });
  // Only alchemica the parcel actually harvests at some point stops output when it runs out.
  const harvested = (i: number) => series[0].ratePerDay[i] > 0 || harvestRate(run.world)[i] > 0;
  const drying = runOutDay.map((d, i) => (d !== null && harvested(i) ? d : null));
  const firstDry = drying.reduce<number | null>((min, d) => (d !== null && (min === null || d < min) ? d : min), null);
  const roundsLeft = goal.surveyRest ? 0 : 10 - parcel.surveyRound;
  const surveyBy = firstDry !== null && roundsLeft > 0 ? firstDry : null;
  const dryList = drying.map((d, i) => (d !== null ? `${ALCHEMICA[i]} runs out on day ${d}` : null)).filter(Boolean).join(', ');
  if (surveyBy !== null)
    warnings.push(`Survey before day ${surveyBy}: ${dryList}, and that output stops. ${roundsLeft} survey round${roundsLeft > 1 ? 's' : ''} left (owner-only).`);
  else if (firstDry !== null)
    warnings.push(`${dryList}; the parcel is fully surveyed, so that output stops for good.`);

  let breakEvenDay: number | null = null;
  if (goal.mode !== 'extract') {
    const base = new Map(baseline.series.map((p) => [p.day, p.ownerNet]));
    for (let k = series.length - 1; k >= 0; k--) {
      if (series[k].ownerNet + 1e-6 < (base.get(series[k].day) ?? -Infinity)) break;
      breakEvenDay = series[k].day;
    }
  }

  const s = run.world.stats;
  return {
    parcel,
    goal,
    rights: goal.mode === 'extract' ? [1] : [1, 2, 6],
    warnings,
    startRemaining: series[0].remaining,
    estimated: goal.surveyRest && parcel.surveyRound < 10,
    steps,
    finalLayoutDay,
    finalLayout: run.world.placed.map((p) => `${typeOf(p.typeId).name} at (${p.x},${p.y})`),
    harvesters: {
      used: run.world.placed.filter((p) => typeOf(p.typeId).kind === 'harvester').length,
      max: MAX_HARVESTERS[parcel.size],
      levels: run.world.placed.map((p) => typeOf(p.typeId)).filter((t) => t.kind === 'harvester').map((t) => t.level),
      topLevel: topHarvesterLevel(),
    },
    wasted: s.wasted,
    startRatePerDay: series[0].ratePerDay,
    endRatePerDay: harvestRate(run.world),
    extracted: s.harvested,
    spent: s.spent,
    fundedByOwner: s.fundedByOwner,
    leftoverBudget: [...run.world.budget],
    ownerNet: run.score.ownerNet,
    extractOnlyNet: baseline.score.ownerNet,
    breakEvenDay,
    runOutDay,
    surveyBy,
    series,
  };
}
