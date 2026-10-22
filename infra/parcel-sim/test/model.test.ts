import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../src/rules.ts';
import { replay, runEpisode } from '../src/episode.ts';
import { legalActions } from '../src/step.ts';
import { createWorld } from '../src/world.ts';
import { featurize } from '../src/policies/features.ts';
import { candidates, model, type Net } from '../src/policies/model.ts';

const rich = { ...DEFAULT_CONFIG, startingBudget: [1e5, 1e5, 1e5, 1e5] as [number, number, number, number] };

test('every candidate gets a feature row of the same length', () => {
  const world = createWorld(rich, 1);
  const cands = candidates(legalActions(world));
  assert.ok(cands.some((a) => a.kind === 'build') && cands.some((a) => a.kind === 'upgrade'));
  const rows = featurize(world, cands, rich);
  assert.equal(rows.length, cands.length);
  assert.ok(rows.every((r) => r.length === rows[0].length && r.every(Number.isFinite)));
});

test('a model policy runs, plays legal moves and replays exactly', () => {
  const n = featurize(createWorld(rich, 1), [{ kind: 'wait' }], rich)[0].length;
  const H = 4;
  // Hand-set net that scores builds above waiting: weight only on the "build" one-hot.
  const buildIndex = n - 17 + 1;
  const net: Net = {
    mean: new Array(n).fill(0),
    std: new Array(n).fill(1),
    w1: Array.from({ length: H }, (_, j) => Array.from({ length: n }, (_, i) => (j === 0 && i === buildIndex ? 1 : 0))),
    b1: new Array(H).fill(0),
    w2: Array.from({ length: H }, (_, j) => Array.from({ length: H }, (_, i) => (j === 0 && i === 0 ? 1 : 0))),
    b2: new Array(H).fill(0),
    w3: [1, 0, 0, 0],
    b3: 0,
  };
  const ep = runEpisode(model(net, rich), { ...rich, horizonDays: 30 }, 2);
  assert.ok(ep.world.stats.builds > 0);
  assert.equal(ep.world.stats.rejected, 0);
  assert.deepEqual(replay(ep), ep.world);
});
