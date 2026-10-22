import { featurize } from './features.ts';
import { options, optionsKey, REPLAN_EVERY } from './planner.ts';
import type { PolicyFactory } from '../episode.ts';
import type { Action, Observation, Policy, SimConfig, World } from '../types.ts';

/**
 * Scores one candidate action: standardized features → tanh → tanh → one number. A softmax over the candidates
 * (wait plus every legal build and upgrade) picks the action, so the same small net handles any number of options.
 */
export type Net = {
  mean: number[];
  std: number[];
  w1: number[][];
  b1: number[];
  w2: number[][];
  b2: number[];
  w3: number[];
  b3: number;
};

export type Activations = { x: number[]; h1: number[]; h2: number[]; score: number };

export function forward(net: Net, raw: number[]): Activations {
  const x = raw.map((v, i) => (v - net.mean[i]) / net.std[i]);
  const h1 = net.w1.map((row, j) => Math.tanh(row.reduce((s, w, i) => s + w * x[i], net.b1[j])));
  const h2 = net.w2.map((row, j) => Math.tanh(row.reduce((s, w, i) => s + w * h1[i], net.b2[j])));
  const score = net.w3.reduce((s, w, i) => s + w * h2[i], net.b3);
  return { x, h1, h2, score };
}

/** Candidates the net chooses between, in the order training labels index them. */
export function candidates(legal: Action[]): Action[] {
  return [{ kind: 'wait' }, ...options(legal)];
}

/**
 * The trained steward. Claims like every other policy, and only re-decides when the planner would have
 * (options changed, or a week passed), so it is asked the same questions it was trained on.
 */
export function model(net: Net, config: SimConfig): PolicyFactory {
  return () => {
    let lastKey = '';
    let lastPlanAt = -Infinity;
    return {
      name: 'model',
      act(obs: Observation, legal: Action[]): Action {
        const world = obs.world as World;
        const claim = legal.find((a) => a.kind === 'claim');
        if (claim && obs.available.some((a) => a > 0)) return claim;

        const key = optionsKey(world, legal);
        if (options(legal).length === 0 || (key === lastKey && world.time - lastPlanAt < REPLAN_EVERY)) return { kind: 'wait' };
        lastKey = key;
        lastPlanAt = world.time;

        const cands = candidates(legal);
        const scores = featurize(world, cands, config).map((f) => forward(net, f).score);
        return cands[scores.indexOf(Math.max(...scores))];
      },
    } satisfies Policy;
  };
}
