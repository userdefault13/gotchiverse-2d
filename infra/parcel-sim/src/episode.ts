import { value } from './rules.ts';
import { apply, legalActions } from './step.ts';
import { createWorld, harvestRate, observe } from './world.ts';
import type { Action, Policy, SimConfig, World } from './types.ts';

/** Non-wait actions allowed at one instant before the runner forces a wait, so a looping policy can't stall the clock. */
const MAX_ACTIONS_PER_INSTANT = 50;

export type PolicyFactory = (seed: number) => Policy;

export type LogEntry = { t: number; action: Action; ok: boolean; reason?: string };

export type Score = {
  /** what the owner ends up with: harvest minus everything sent to the bot, plus the bot's unspent budget */
  ownerNet: number;
  harvested: number;
  spent: number;
  wasted: number;
  /** value per day the parcel produces at the end, capped by 3 claims a day */
  endRatePerDay: number;
};

export type Episode = { policy: string; seed: number; config: SimConfig; world: World; log: LogEntry[]; score: Score };

export function score(world: World, config: SimConfig): Score {
  const w = config.valueWeights;
  const s = world.stats;
  const rate = harvestRate(world);
  const cap = observe(world).capacity;
  const effective = rate.map((r, i) => Math.min(r, cap[i] * 3)) as typeof rate;
  return {
    ownerNet: value(s.harvested, w) - value(s.fundedByOwner, w) + value(world.budget, w),
    harvested: value(s.harvested, w),
    spent: value(s.spent, w),
    wasted: value(s.wasted, w),
    endRatePerDay: value(effective, w),
  };
}

function record(world: World, log: LogEntry[], t: number, action: Action, res: { ok: boolean; reason?: string }): void {
  log.push(res.ok ? { t, action, ok: true } : { t, action, ok: false, reason: res.reason });
  if (!res.ok) {
    world.stats.rejected++;
    world.stats.rejectReasons[res.reason!] = (world.stats.rejectReasons[res.reason!] ?? 0) + 1;
  }
}

export function runEpisode(makePolicy: PolicyFactory, config: SimConfig, seed: number): Episode {
  const world = createWorld(config, seed);
  const policy = makePolicy(seed);
  const log: LogEntry[] = [];
  simulate(world, config, policy, world.horizon, log);
  return { policy: policy.name, seed, config, world, log, score: score(world, config) };
}

/** Let a policy drive an existing world until `until` (or the horizon). Used by episodes and by planner rollouts. */
export function simulate(world: World, config: SimConfig, policy: Policy, until: number, log: LogEntry[] = []): void {
  const end = Math.min(until, world.horizon);
  let burst = 0;
  while (world.time < end) {
    let action = policy.act(observe(world), legalActions(world));
    if (action.kind !== 'wait' && ++burst > MAX_ACTIONS_PER_INSTANT) action = { kind: 'wait' };
    const t = world.time;
    const res = apply(world, action, config);
    record(world, log, t, action, res);
    if (!res.ok) apply(world, { kind: 'wait' }, config);
    if (action.kind === 'wait' || !res.ok) burst = 0;
  }
}

/** Re-apply a logged run with no policy. Deterministic sims must land on the same state. */
export function replay(ep: Pick<Episode, 'seed' | 'config' | 'log'>): World {
  const world = createWorld(ep.config, ep.seed);
  for (const entry of ep.log) {
    const res = apply(world, entry.action, ep.config);
    if (res.ok !== entry.ok) throw new Error(`replay diverged at t=${entry.t}: ${JSON.stringify(entry.action)}`);
    record(world, [], entry.t, entry.action, res);
    if (!res.ok) apply(world, { kind: 'wait' }, ep.config);
  }
  return world;
}
