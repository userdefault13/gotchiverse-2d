import { CLAIM_COOLDOWN, DAY, TOTAL_ALCHEMICAS, typeOf } from './rules.ts';
import { surveyAmount } from './rng.ts';
import type { Alch, Observation, SimConfig, World } from './types.ts';

export const zero = (): Alch => [0, 0, 0, 0];

export function createWorld(config: SimConfig, seed: number): World {
  const world: World = {
    seed,
    time: 0,
    horizon: config.horizonDays * DAY,
    size: config.size,
    placed: config.starting.map((p) => ({ ...p })),
    upgradeQueue: [],
    currentRound: 0,
    nextSurveyAt: 0,
    alchemicaRemaining: zero(),
    unclaimed: zero(),
    lastUpdate: zero(),
    lastClaimedAt: -CLAIM_COOLDOWN,
    budget: [...config.startingBudget],
    stats: {
      harvested: zero(),
      fundedByOwner: [...config.startingBudget],
      spent: zero(),
      wasted: zero(),
      claims: 0,
      builds: 0,
      upgrades: 0,
      rejected: 0,
      rejectReasons: {},
    },
    rngState: seed >>> 0,
    goalAlchemica: config.goalAlchemica ?? [true, true, true, true],
  };
  // The owner surveys before handing the parcel over: round 0, or every round when surveyEveryDays is 0.
  survey(world, config);
  while (config.surveyEveryDays === 0 && world.currentRound < config.maxSurveyRounds) survey(world, config);
  return world;
}

export function harvestRate(world: World): Alch {
  const r = zero();
  for (const p of world.placed) {
    const t = typeOf(p.typeId);
    if (t.kind === 'harvester') r[t.alchemicaType] += t.harvestRate;
  }
  return r;
}

/** LibAlchemica.calculateTotalCapacity: sum of equipped reservoir capacities */
export function capacity(world: World): Alch {
  const c = zero();
  for (const p of world.placed) {
    const t = typeOf(p.typeId);
    if (t.kind === 'reservoir') c[t.alchemicaType] += t.capacity;
  }
  return c;
}

function sinceLastUpdate(world: World, i: number, rate: Alch): number {
  return (rate[i] * (world.time - world.lastUpdate[i])) / DAY;
}

/** LibAlchemica.getAvailableAlchemica */
export function available(world: World): Alch {
  const rate = harvestRate(world);
  const cap = capacity(world);
  const a = zero();
  for (let i = 0; i < 4; i++) {
    if (world.alchemicaRemaining[i] === 0) continue;
    a[i] = Math.min(world.unclaimed[i] + sinceLastUpdate(world, i, rate), cap[i]);
  }
  return a;
}

/** LibAlchemica.settleUnclaimedAlchemica: called before a harvester or reservoir changes the rate or capacity */
export function settle(world: World, i: number): void {
  const rate = harvestRate(world);
  const cap = capacity(world)[i];
  const total = world.unclaimed[i] + sinceLastUpdate(world, i, rate);
  if (total > cap) world.stats.wasted[i] += total - cap;
  world.unclaimed[i] = Math.min(total, cap);
  world.lastUpdate[i] = world.time;
}

export function altarLevel(world: World): number {
  for (const p of world.placed) {
    const t = typeOf(p.typeId);
    if (t.kind === 'altar') return t.level;
  }
  return 0;
}

/** Sum of upgradeQueueBoost of equipped installations (altar gives 1, maakers add more). */
export function upgradeQueueCapacity(world: World): number {
  return world.placed.reduce((n, p) => n + typeOf(p.typeId).upgradeQueueBoost, 0);
}

/** LibRealm.updateRemainingAlchemica: round 0 releases 25%, each later round 75%/9. No boosts. */
export function survey(world: World, config: SimConfig): void {
  const round = world.currentRound;
  for (let i = 0; i < 4; i++) {
    const [base, next] = surveyAmount(TOTAL_ALCHEMICAS[world.size][i], world.rngState);
    world.rngState = next;
    world.alchemicaRemaining[i] += round === 0 ? base / 4 : (base - base / 4) / 9;
  }
  world.currentRound++;
  const more = world.currentRound < config.maxSurveyRounds && config.surveyEveryDays > 0;
  world.nextSurveyAt = more ? world.time + config.surveyEveryDays * DAY : Infinity;
}

export function observe(world: World): Observation {
  return {
    world,
    available: available(world),
    capacity: capacity(world),
    harvestRate: harvestRate(world),
    canClaimAt: world.lastClaimedAt + CLAIM_COOLDOWN,
  };
}
