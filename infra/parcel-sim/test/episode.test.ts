import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../src/rules.ts';
import { replay, runEpisode } from '../src/episode.ts';
import { claimOnly, random } from '../src/policies/baselines.ts';
import { heuristic } from '../src/policies/heuristic.ts';
import { planner } from '../src/policies/planner.ts';
import { surveyAmount } from '../src/rng.ts';

const config = { ...DEFAULT_CONFIG, horizonDays: 30 };
const steward = heuristic(config.valueWeights, config.blockTimeSec);

test('same seed and policy give the same run', () => {
  const a = runEpisode(random, config, 7);
  const b = runEpisode(random, config, 7);
  assert.deepEqual(a.world, b.world);
  assert.deepEqual(a.log, b.log);
});

test('replaying a log reproduces the final state', () => {
  for (const make of [random, steward]) {
    const ep = runEpisode(make, config, 3);
    assert.deepEqual(replay(ep), ep.world);
  }
});

test('survey amounts average the contract target with a 60% floor', () => {
  let state = 1;
  let sum = 0;
  let min = Infinity;
  for (let i = 0; i < 5000; i++) {
    const [v, next] = surveyAmount(1000, state);
    state = next;
    sum += v;
    min = Math.min(min, v);
  }
  assert.equal(min, 600);
  assert.ok(Math.abs(sum / 5000 - 1000) < 50);
});

test('heuristic beats claim-only on owner net over 90 days', () => {
  const full = DEFAULT_CONFIG;
  const seeds = [1, 2, 3, 4, 5];
  const mean = (make: typeof claimOnly) => seeds.reduce((n, s) => n + runEpisode(make, full, s).score.ownerNet, 0) / seeds.length;
  assert.ok(mean(heuristic(full.valueWeights, full.blockTimeSec)) > mean(claimOnly));
});

test('planner never does worse than its base heuristic, beats it over a year, and replays exactly', () => {
  const year = { ...DEFAULT_CONFIG, horizonDays: 365 };
  for (const config of [DEFAULT_CONFIG, year]) {
    const base = heuristic(config.valueWeights, config.blockTimeSec);
    const ep = runEpisode(planner(base, config), config, 1);
    const baseNet = runEpisode(base, config, 1).score.ownerNet;
    assert.ok(config === year ? ep.score.ownerNet > baseNet : ep.score.ownerNet >= baseNet);
    assert.deepEqual(replay(ep), ep.world);
  }
});
