// Play the planner on many seeds and record every decision it makes, as training data for the model.
// Usage: node src/train/gen.ts [--seeds 2000] [--first-seed 1] [--workers <cpus>] [--out data/planner.jsonl] [--learner models/steward.json]
// With --learner the trained model drives instead and the planner labels each situation it gets into (DAgger),
// so the next model learns to recover from its own mistakes, not just to follow the planner's path.
// Each line is one decision: { seed, f: feature rows (wait first, then each build/upgrade), y: index chosen }.
// Re-running with the same --out skips seeds already written, so a long run can be resumed.
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { runEpisode } from '../episode.ts';
import { featurize } from '../policies/features.ts';
import { heuristic } from '../policies/heuristic.ts';
import { candidates, model, type Net } from '../policies/model.ts';
import { options, optionsKey, planner, REPLAN_EVERY } from '../policies/planner.ts';
import type { Action, Policy, SimConfig, World } from '../types.ts';
import { trainingConfig } from './configs.ts';

export type Sample = { seed: number; f: number[][]; y: number };

const same = (a: Action, b: Action) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Keeps a sample each time the planner would plan, using the same trigger the model policy uses. The driver's
 * action is played; the label is the teacher's choice (the same thing when the teacher drives). A separate teacher
 * is only asked at those moments, which keeps its own re-plan trigger in step with this one.
 */
function recorded(driver: Policy, teacher: Policy | null, config: SimConfig, seed: number, out: Sample[]): Policy {
  let lastKey = '';
  let lastPlanAt = -Infinity;
  return {
    name: driver.name,
    act(obs, legal) {
      const action = driver.act(obs, legal);
      const world = obs.world as World;
      if (legal.some((a) => a.kind === 'claim') && obs.available.some((a) => a > 0)) return action;
      const key = optionsKey(world, legal);
      if (options(legal).length === 0 || (key === lastKey && world.time - lastPlanAt < REPLAN_EVERY)) return action;
      lastKey = key;
      lastPlanAt = world.time;
      const label = teacher ? teacher.act(obs, legal) : action;
      const cands = candidates(legal);
      const y = cands.findIndex((c) => same(c, label.kind === 'wait' ? { kind: 'wait' } : label));
      if (y >= 0) out.push({ seed, f: featurize(world, cands, config), y });
      return action;
    },
  };
}

function play(seed: number, learner: Net | null): Sample[] {
  const config = trainingConfig(seed);
  const teacher = planner(heuristic(config.valueWeights, config.blockTimeSec), config);
  const samples: Sample[] = [];
  const make = learner
    ? (s: number) => recorded(model(learner, config)(s), teacher(s), config, s, samples)
    : (s: number) => recorded(teacher(s), null, config, s, samples);
  runEpisode(make, config, seed);
  return samples;
}

if (!isMainThread) {
  const learner = workerData.learner ? (JSON.parse(readFileSync(workerData.learner, 'utf8')) as Net) : null;
  for (const seed of workerData.seeds as number[]) parentPort!.postMessage(play(seed, learner));
} else {
  const { values } = parseArgs({
    options: {
      seeds: { type: 'string', default: '2000' },
      'first-seed': { type: 'string', default: '1' },
      workers: { type: 'string', default: String(availableParallelism()) },
      out: { type: 'string', default: 'data/planner.jsonl' },
      learner: { type: 'string' },
    },
  });
  const out = values.out!;
  const done = new Set<number>();
  if (existsSync(out)) {
    for await (const line of createInterface({ input: createReadStream(out) })) if (line) done.add(JSON.parse(line).seed);
  }
  const first = Number(values['first-seed']);
  const todo = Array.from({ length: Number(values.seeds) }, (_, i) => first + i).filter((s) => !done.has(s));
  const workers = Math.min(Number(values.workers), todo.length);
  console.log(`${todo.length} seeds to play (${done.size} already in ${out}) on ${workers} workers`);
  if (todo.length === 0) process.exit(0);

  mkdirSync(dirname(out), { recursive: true });
  const file = createWriteStream(out, { flags: 'a' });
  const started = Date.now();
  let finished = 0;
  let decisions = 0;
  await Promise.all(
    Array.from({ length: workers }, (_, w) => {
      const seeds = todo.filter((_, i) => i % workers === w);
      return new Promise<void>((resolve, reject) => {
        const worker = new Worker(new URL(import.meta.url), { workerData: { seeds, learner: values.learner } });
        worker.on('message', (samples: Sample[]) => {
          for (const s of samples) file.write(JSON.stringify(s) + '\n');
          finished++;
          decisions += samples.length;
          if (finished % 25 === 0 || finished === todo.length) {
            const perSeed = (Date.now() - started) / 1000 / finished;
            const eta = Math.round((perSeed * (todo.length - finished)) / 60);
            console.log(`${finished}/${todo.length} seeds, ${decisions} decisions, ~${eta} min left`);
          }
        });
        worker.on('error', reject);
        worker.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`worker exited ${code}`))));
      });
    }),
  );
  await new Promise((r) => file.end(r));
  console.log(`done in ${Math.round((Date.now() - started) / 1000)}s`);
}
