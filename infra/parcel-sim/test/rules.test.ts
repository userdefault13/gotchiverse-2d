import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALTAR_L1, CLAIM_COOLDOWN, DAY, DEFAULT_CONFIG, FUD_HARVESTER_L1, FUD_RESERVOIR_L1, typeOf } from '../src/rules.ts';
import { apply } from '../src/step.ts';
import { available, createWorld } from '../src/world.ts';
import type { Action, SimConfig } from '../src/types.ts';

const FOMO_HARVESTER_L1 = 65;
const rich: SimConfig = { ...DEFAULT_CONFIG, startingBudget: [1e6, 1e6, 1e6, 1e6] };

function rejects(config: SimConfig, actions: Action[], reason: string) {
  const world = createWorld(config, 1);
  const last = actions.pop()!;
  for (const a of actions) assert.equal(apply(world, a, config).ok, true, JSON.stringify(a));
  assert.deepEqual(apply(world, last, config), { ok: false, reason });
}

test('claim: 8 hour cooldown', () => {
  const world = createWorld(DEFAULT_CONFIG, 1);
  assert.equal(apply(world, { kind: 'claim' }, DEFAULT_CONFIG).ok, true);
  world.time += CLAIM_COOLDOWN - 1;
  assert.deepEqual(apply(world, { kind: 'claim' }, DEFAULT_CONFIG), { ok: false, reason: '8 hours claim cooldown' });
  world.time += 1;
  assert.equal(apply(world, { kind: 'claim' }, DEFAULT_CONFIG).ok, true);
});

test('accrual is capped by reservoir capacity and the overflow counts as wasted', () => {
  const world = createWorld(DEFAULT_CONFIG, 1);
  apply(world, { kind: 'claim' }, DEFAULT_CONFIG);
  world.time += 2 * DAY; // 4.2/day for 2 days = 8.4, one L1 reservoir holds 5
  assert.equal(available(world)[0], typeOf(FUD_RESERVOIR_L1).capacity);
  apply(world, { kind: 'claim' }, DEFAULT_CONFIG);
  assert.equal(world.stats.harvested[0], 5);
  assert.ok(Math.abs(world.stats.wasted[0] - 3.4) < 1e-9);
});

test('claim sends the reinvest share back to the bot budget', () => {
  const world = createWorld(DEFAULT_CONFIG, 1);
  apply(world, { kind: 'claim' }, DEFAULT_CONFIG);
  world.time += CLAIM_COOLDOWN;
  const before = world.budget[0];
  apply(world, { kind: 'claim' }, DEFAULT_CONFIG);
  assert.ok(Math.abs(world.budget[0] - before - world.stats.harvested[0] * DEFAULT_CONFIG.reinvestShare) < 1e-9);
});

test('build: only level-1 harvesters and reservoirs', () => {
  rejects(rich, [{ kind: 'build', typeId: ALTAR_L1, x: 6, y: 6 }], 'not a buildable level-1 harvester or reservoir');
  rejects(rich, [{ kind: 'build', typeId: typeOf(FUD_HARVESTER_L1).nextLevelId, x: 6, y: 6 }], 'not a buildable level-1 harvester or reservoir');
});

test('build: harvester needs a reservoir of its alchemica', () => {
  rejects(rich, [{ kind: 'build', typeId: FOMO_HARVESTER_L1, x: 6, y: 6 }], 'Must equip reservoir of type');
});

test('build: placement bounds and overlap', () => {
  rejects(rich, [{ kind: 'build', typeId: FUD_HARVESTER_L1, x: 7, y: 0 }], 'x exceeding width');
  rejects(rich, [{ kind: 'build', typeId: FUD_HARVESTER_L1, x: 0, y: 7 }], 'y exceeding height');
  rejects(rich, [{ kind: 'build', typeId: FUD_HARVESTER_L1, x: 1, y: 1 }], 'Invalid spot');
});

test('build: humble parcels allow 4 harvesters', () => {
  const builds: Action[] = [
    { kind: 'build', typeId: FUD_HARVESTER_L1, x: 6, y: 0 },
    { kind: 'build', typeId: FUD_HARVESTER_L1, x: 0, y: 2 },
    { kind: 'build', typeId: FUD_HARVESTER_L1, x: 2, y: 2 },
    { kind: 'build', typeId: FUD_HARVESTER_L1, x: 4, y: 2 },
  ];
  rejects(rich, builds, 'Too many harvesters');
});

test('build: needs budget', () => {
  rejects({ ...DEFAULT_CONFIG, startingBudget: [0, 0, 0, 0] }, [{ kind: 'build', typeId: FUD_HARVESTER_L1, x: 6, y: 0 }], 'insufficient budget');
});

test('upgrade: altar tech tree is checked before queue capacity', () => {
  // Harvester L2 needs altar L2; LibInstallation.checkUpgrade fails on that before the queue check.
  rejects(rich, [{ kind: 'upgrade', x: 4, y: 0 }], 'Altar Tech Tree Reqs not met');
  rejects(rich, [{ kind: 'upgrade', x: 0, y: 0 }, { kind: 'upgrade', x: 0, y: 0 }], 'already in upgrade queue');
});

test('upgrade: the altar gives a queue of one', () => {
  const config = { ...rich, starting: [{ typeId: typeOf(ALTAR_L1).nextLevelId, x: 0, y: 0 }, ...rich.starting.slice(1)] };
  rejects(config, [{ kind: 'upgrade', x: 2, y: 0 }, { kind: 'upgrade', x: 4, y: 0 }], 'upgrade queue full');
});

test('upgrade finishes after craftTime blocks and changes the rate', () => {
  const world = createWorld(rich, 1);
  assert.equal(apply(world, { kind: 'upgrade', x: 0, y: 0 }, rich).ok, true);
  const readyAt = world.upgradeQueue[0].readyAt;
  assert.equal(readyAt, typeOf(typeOf(ALTAR_L1).nextLevelId).craftTime * rich.blockTimeSec);
  while (world.time < readyAt) apply(world, { kind: 'wait' }, rich);
  assert.equal(typeOf(world.placed[0].typeId).level, 2);
  assert.equal(apply(world, { kind: 'upgrade', x: 4, y: 0 }, rich).ok, true);
});
