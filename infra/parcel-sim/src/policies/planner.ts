import { DAY } from '../rules.ts';
import { apply } from '../step.ts';
import { capacity, harvestRate } from '../world.ts';
import { score, simulate, type PolicyFactory } from '../episode.ts';
import type { Action, Observation, Policy, SimConfig, World } from '../types.ts';

/** How far each rollout plays forward; production after that is valued at the end rate for the days left. */
const ROLLOUT_DAYS = 120;
/** Re-plan at least this often even if the affordable options look the same. */
export const REPLAN_EVERY = 7 * DAY;

/** Owner value a rollout ended on, plus what the final layout keeps producing until the horizon or the parcel runs dry. */
function rolloutValue(world: World, config: SimConfig): number {
  const daysLeft = Math.max(0, world.horizon - world.time) / DAY;
  const rate = harvestRate(world);
  const cap = capacity(world);
  let future = 0;
  for (let i = 0; i < 4; i++) {
    const banked = Math.min(rate[i], cap[i] * 3) * daysLeft;
    future += Math.min(banked, world.alchemicaRemaining[i]) * config.valueWeights[i];
  }
  return score(world, config).ownerNet + future;
}

/** One candidate per build type (the legal list already picked its spot) and per upgradeable installation. */
export function options(legal: Action[]): Action[] {
  return legal.filter((a) => a.kind === 'build' || a.kind === 'upgrade');
}

export function optionsKey(world: World, legal: Action[]): string {
  const opts = options(legal).map((a) => (a.kind === 'build' ? `b${a.typeId}` : a.kind === 'upgrade' ? `u${a.x},${a.y}` : ''));
  return `${opts.join()}|${world.placed.map((p) => p.typeId).join()}|${world.upgradeQueue.length}`;
}

/**
 * Rollout planner: for each build or upgrade it could make now, play the base policy forward in a copy of the sim
 * and keep the option with the best owner value. Catches multi-step payoffs the base policy can't see, such as a
 * FOMO reservoir that unlocks FOMO harvesting and with it all the idle FUD.
 *
 * Rollouts re-seed the copy's randomness so future survey results stay unknown, and every option shares that seed.
 */
export function planner(base: PolicyFactory, config: SimConfig): PolicyFactory {
  return (seed) => {
    const own = base(seed);
    let lastKey = '';
    let lastPlanAt = -Infinity;
    return {
      name: `planner(${own.name})`,
      act(obs: Observation, legal: Action[]): Action {
        const world = obs.world as World;
        const claim = legal.find((a) => a.kind === 'claim');
        if (claim && obs.available.some((a) => a > 0)) return claim;

        const opts = options(legal);
        const key = optionsKey(world, legal);
        if (opts.length === 0 || (key === lastKey && world.time - lastPlanAt < REPLAN_EVERY)) return { kind: 'wait' };
        lastKey = key;
        lastPlanAt = world.time;

        const rolloutSeed = (world.rngState ^ 0x5bd1e995) >>> 0;
        const until = world.time + ROLLOUT_DAYS * DAY;
        const evaluate = (first: Action | null): number => {
          const copy = structuredClone(world);
          copy.rngState = rolloutSeed;
          if (first && !apply(copy, first, config).ok) return -Infinity;
          simulate(copy, config, base(seed), until);
          return rolloutValue(copy, config);
        };

        let best: Action | null = null;
        let bestValue = evaluate(null);
        for (const opt of opts) {
          const v = evaluate(opt);
          if (v > bestValue + 1e-6) {
            best = opt;
            bestValue = v;
          }
        }
        // Nothing beat following the base policy, so do what it would do now.
        return best ?? own.act(obs, legal);
      },
    } satisfies Policy;
  };
}
