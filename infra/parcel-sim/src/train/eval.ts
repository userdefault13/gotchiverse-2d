// Score the model against the heuristic and the planner on seeds it never trained on, each with its own
// horizon, budget and parcel size from trainingConfig, on all cores.
// Usage: node src/train/eval.ts [--model models/steward.json] [--seeds 64] [--first-seed 900001] [--workers <cpus>]
import { readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { parseArgs } from 'node:util';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { runEpisode, type PolicyFactory } from '../episode.ts';
import { heuristic } from '../policies/heuristic.ts';
import { model, type Net } from '../policies/model.ts';
import { planner } from '../policies/planner.ts';
import { trainingConfig } from './configs.ts';

type Result = { seed: number; size: number; days: number; budget: number; net: Record<string, number>; ms: Record<string, number> };
const POLICIES = ['heuristic', 'planner', 'model'];

function score(seed: number, net: Net): Result {
  const config = trainingConfig(seed);
  const h = heuristic(config.valueWeights, config.blockTimeSec);
  const makes: PolicyFactory[] = [h, planner(h, config), model(net, config)];
  const r: Result = { seed, size: config.size, days: config.horizonDays, budget: config.startingBudget[0] / 1000, net: {}, ms: {} };
  makes.forEach((make, i) => {
    const t = Date.now();
    r.net[POLICIES[i]] = runEpisode(make, config, seed).score.ownerNet;
    r.ms[POLICIES[i]] = Date.now() - t;
  });
  return r;
}

if (!isMainThread) {
  const net = JSON.parse(readFileSync(workerData.model, 'utf8')) as Net;
  for (const seed of workerData.seeds as number[]) parentPort!.postMessage(score(seed, net));
} else {
  const { values } = parseArgs({
    options: {
      model: { type: 'string', default: 'models/steward.json' },
      seeds: { type: 'string', default: '64' },
      'first-seed': { type: 'string', default: '900001' },
      workers: { type: 'string', default: String(availableParallelism()) },
    },
  });
  const all = Array.from({ length: Number(values.seeds) }, (_, i) => Number(values['first-seed']) + i);
  const workers = Math.min(Number(values.workers), all.length);
  const results: Result[] = [];
  await Promise.all(
    Array.from(
      { length: workers },
      (_, w) =>
        new Promise<void>((resolve, reject) => {
          const seeds = all.filter((_, i) => i % workers === w);
          const worker = new Worker(new URL(import.meta.url), { workerData: { seeds, model: values.model } });
          worker.on('message', (r: Result) => results.push(r));
          worker.on('error', reject);
          worker.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`worker exited ${code}`))));
        }),
    ),
  );
  results.sort((a, b) => a.seed - b.seed);

  const mean = (f: (r: Result) => number) => results.reduce((n, r) => n + f(r), 0) / results.length;
  console.log(`${results.length} unseen seeds, 30-730 days, 0.25x-4x budget, humble and reasonable parcels (${values.model})`);
  console.table(
    POLICIES.map((p) => ({
      policy: p,
      'mean owner net': Math.round(mean((r) => r.net[p])),
      'share of planner': +(mean((r) => r.net[p]) / mean((r) => r.net.planner)).toFixed(3),
      'beats planner': results.filter((r) => r.net[p] > r.net.planner + 1).length,
      'below heuristic': results.filter((r) => r.net[p] < r.net.heuristic - 1).length,
      'ms per game': Math.round(mean((r) => r.ms[p])),
    })),
  );
  const gap = (r: Result) => r.net.model - r.net.planner;
  console.log('largest shortfalls vs planner:');
  console.table(
    [...results]
      .sort((a, b) => gap(a) - gap(b))
      .slice(0, 5)
      .map((r) => ({ seed: r.seed, size: r.size, days: r.days, budget: `${r.budget.toFixed(2)}x`, ...Object.fromEntries(POLICIES.map((p) => [p, Math.round(r.net[p])])) })),
  );
}
