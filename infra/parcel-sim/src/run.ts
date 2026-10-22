// Run every policy over the same seeds and print a ranking.
// Usage: node src/run.ts [--seeds 20] [--first-seed 1] [--days 90] [--size 0] [--model models/steward.json] [--export runs.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { DEFAULT_CONFIG } from './rules.ts';
import { runEpisode, type Episode, type PolicyFactory, type Score } from './episode.ts';
import { claimOnly, dailyClaim, random } from './policies/baselines.ts';
import { heuristic } from './policies/heuristic.ts';
import { model } from './policies/model.ts';
import { planner } from './policies/planner.ts';
import type { ParcelSize, SimConfig } from './types.ts';

const { values } = parseArgs({
  options: {
    seeds: { type: 'string', default: '20' },
    'first-seed': { type: 'string', default: '1' },
    days: { type: 'string', default: String(DEFAULT_CONFIG.horizonDays) },
    size: { type: 'string', default: String(DEFAULT_CONFIG.size) },
    model: { type: 'string' },
    export: { type: 'string' },
  },
});

const config: SimConfig = { ...DEFAULT_CONFIG, horizonDays: Number(values.days), size: Number(values.size) as ParcelSize };
const seeds = Array.from({ length: Number(values.seeds) }, (_, i) => i + Number(values['first-seed']));
const steward = heuristic(config.valueWeights, config.blockTimeSec);
const policies: PolicyFactory[] = [random, dailyClaim, claimOnly, steward, planner(steward, config)];
if (values.model) policies.push(model(JSON.parse(readFileSync(values.model, 'utf8')), config));

const episodes: Episode[] = [];
const rows = policies.map((make) => {
  const runs = seeds.map((seed) => runEpisode(make, config, seed));
  episodes.push(...runs);
  const mean = (k: keyof Score) => runs.reduce((n, r) => n + r.score[k], 0) / runs.length;
  const stat = (k: 'claims' | 'builds' | 'upgrades' | 'rejected') => runs.reduce((n, r) => n + r.world.stats[k], 0) / runs.length;
  return {
    policy: runs[0].policy,
    ownerNet: mean('ownerNet'),
    harvested: mean('harvested'),
    spent: mean('spent'),
    wasted: mean('wasted'),
    endRatePerDay: mean('endRatePerDay'),
    claims: stat('claims'),
    builds: stat('builds'),
    upgrades: stat('upgrades'),
    rejected: stat('rejected'),
  };
});

rows.sort((a, b) => b.ownerNet - a.ownerNet);
console.log(`parcel size ${config.size}, ${config.horizonDays} days, ${seeds.length} seeds, values in FUD-equivalent (weights ${config.valueWeights.join('/')})`);
console.table(
  rows.map((r) => ({
    policy: r.policy,
    'owner net': Math.round(r.ownerNet),
    harvested: Math.round(r.harvested),
    spent: Math.round(r.spent),
    wasted: Math.round(r.wasted),
    'end rate/day': +r.endRatePerDay.toFixed(1),
    claims: Math.round(r.claims),
    builds: +r.builds.toFixed(1),
    upgrades: +r.upgrades.toFixed(1),
    rejected: Math.round(r.rejected),
  })),
);

if (values.export) {
  writeFileSync(values.export, JSON.stringify(episodes.map(({ world, ...ep }) => ({ ...ep, stats: world.stats }))) + '\n');
  console.log(`wrote ${episodes.length} episodes to ${values.export}`);
}
