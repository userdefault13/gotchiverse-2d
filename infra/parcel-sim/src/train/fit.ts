// Train the steward net to pick what the planner picked (imitation), in plain TypeScript.
// Usage: node src/train/fit.ts [--data data/planner.jsonl,data/dagger.jsonl] [--out models/steward.json] [--epochs 40] [--hidden 32]
// Seeds ending in 0 are held out to check the net generalizes; the epoch with the best held-out accuracy is saved.
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { nextRandom } from '../rng.ts';
import { forward, type Net } from '../policies/model.ts';
import type { Sample } from './gen.ts';

const { values } = parseArgs({
  options: {
    data: { type: 'string', default: 'data/planner.jsonl' },
    out: { type: 'string', default: 'models/steward.json' },
    epochs: { type: 'string', default: '40' },
    hidden: { type: 'string', default: '32' },
    lr: { type: 'string', default: '0.003' },
    batch: { type: 'string', default: '64' },
  },
});

const samples: Sample[] = [];
for (const path of values.data!.split(','))
  for await (const line of createInterface({ input: createReadStream(path) })) if (line) samples.push(JSON.parse(line));
const train = samples.filter((s) => s.seed % 10 !== 0);
const held = samples.filter((s) => s.seed % 10 === 0);
if (held.length === 0) throw new Error('no held-out decisions: include some seeds ending in 0');
const inputs = samples[0].f[0].length;
const H = Number(values.hidden);
console.log(`${samples.length} decisions (${train.length} train, ${held.length} held out), ${inputs} features`);

let rng = 12345;
const rand = () => {
  const [r, next] = nextRandom(rng);
  rng = next;
  return r;
};
const init = (n: number, fanIn: number) => Array.from({ length: n }, () => (rand() * 2 - 1) * Math.sqrt(6 / (fanIn + H)));

// Standardize on the training rows; constant features get std 1 so they pass through as 0.
const rows = train.flatMap((s) => s.f);
const mean = Array.from({ length: inputs }, (_, i) => rows.reduce((n, r) => n + r[i], 0) / rows.length);
const std = mean.map((m, i) => Math.sqrt(rows.reduce((n, r) => n + (r[i] - m) ** 2, 0) / rows.length) || 1);

const net: Net = {
  mean,
  std,
  w1: Array.from({ length: H }, () => init(inputs, inputs)),
  b1: new Array(H).fill(0),
  w2: Array.from({ length: H }, () => init(H, H)),
  b2: new Array(H).fill(0),
  w3: init(H, H),
  b3: 0,
};

// Adam works on one flat parameter vector; flat/unflat convert between it and the net's layers.
type Grads = { w1: number[][]; b1: number[]; w2: number[][]; b2: number[]; w3: number[]; b3: number };
const zeros = (): Grads => ({
  w1: net.w1.map((r) => r.map(() => 0)),
  b1: net.b1.map(() => 0),
  w2: net.w2.map((r) => r.map(() => 0)),
  b2: net.b2.map(() => 0),
  w3: net.w3.map(() => 0),
  b3: 0,
});
const flat = (g: Grads) => [
  ...g.w1.flat(),
  ...g.b1,
  ...g.w2.flat(),
  ...g.b2,
  ...g.w3,
  g.b3,
];
const unflat = (v: number[]) => {
  let k = 0;
  for (const r of net.w1) for (let i = 0; i < r.length; i++) r[i] = v[k++];
  for (let i = 0; i < H; i++) net.b1[i] = v[k++];
  for (const r of net.w2) for (let i = 0; i < r.length; i++) r[i] = v[k++];
  for (let i = 0; i < H; i++) net.b2[i] = v[k++];
  for (let i = 0; i < H; i++) net.w3[i] = v[k++];
  net.b3 = v[k++];
};

/** Softmax cross-entropy over one decision's candidates; adds gradients into g and returns the loss. */
function backprop(s: Sample, g: Grads): number {
  const acts = s.f.map((f) => forward(net, f));
  const max = Math.max(...acts.map((a) => a.score));
  const exp = acts.map((a) => Math.exp(a.score - max));
  const z = exp.reduce((n, e) => n + e, 0);
  acts.forEach((a, j) => {
    const ds = exp[j] / z - (j === s.y ? 1 : 0);
    g.b3 += ds;
    const dh2 = a.h2.map((h, i) => {
      g.w3[i] += ds * h;
      return ds * net.w3[i] * (1 - h * h);
    });
    const dh1 = new Array(H).fill(0);
    for (let k = 0; k < H; k++) {
      g.b2[k] += dh2[k];
      for (let i = 0; i < H; i++) {
        g.w2[k][i] += dh2[k] * a.h1[i];
        dh1[i] += dh2[k] * net.w2[k][i];
      }
    }
    for (let i = 0; i < H; i++) {
      const d = dh1[i] * (1 - a.h1[i] * a.h1[i]);
      g.b1[i] += d;
      for (let n = 0; n < inputs; n++) g.w1[i][n] += d * a.x[n];
    }
  });
  return -Math.log(exp[s.y] / z);
}

function accuracy(set: Sample[]): number {
  let right = 0;
  for (const s of set) {
    const scores = s.f.map((f) => forward(net, f).score);
    if (scores.indexOf(Math.max(...scores)) === s.y) right++;
  }
  return right / set.length;
}

const lr = Number(values.lr);
const batch = Number(values.batch);
let params = flat(net);
const m = params.map(() => 0);
const v = params.map(() => 0);
let step = 0;
let best = { acc: -1, net: structuredClone(net), epoch: 0 };
const order = train.map((_, i) => i);
const waitShare = held.filter((s) => s.y === 0).length / held.length;
// Most decisions are waits, so also track how often the net matches the planner when it did build or upgrade.
const heldBuilds = held.filter((s) => s.y !== 0);
console.log(`held-out baseline (always wait): ${(waitShare * 100).toFixed(1)}%`);

for (let epoch = 1; epoch <= Number(values.epochs); epoch++) {
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let loss = 0;
  for (let b = 0; b < order.length; b += batch) {
    const g = zeros();
    const idx = order.slice(b, b + batch);
    for (const i of idx) loss += backprop(train[i], g);
    const grad = flat(g).map((x) => x / idx.length);
    step++;
    params = params.map((p, k) => {
      m[k] = 0.9 * m[k] + 0.1 * grad[k];
      v[k] = 0.999 * v[k] + 0.001 * grad[k] ** 2;
      const mh = m[k] / (1 - 0.9 ** step);
      const vh = v[k] / (1 - 0.999 ** step);
      return p - (lr * mh) / (Math.sqrt(vh) + 1e-8);
    });
    unflat(params);
  }
  const acc = accuracy(held);
  const builds = accuracy(heldBuilds);
  if (acc > best.acc) best = { acc, net: structuredClone(net), epoch };
  console.log(
    `epoch ${epoch}: loss ${(loss / train.length).toFixed(4)}, train ${(accuracy(train) * 100).toFixed(1)}%, ` +
      `held out ${(acc * 100).toFixed(1)}% (on planner builds/upgrades ${(builds * 100).toFixed(1)}%)`,
  );
}

mkdirSync(dirname(values.out!), { recursive: true });
writeFileSync(values.out!, JSON.stringify(best.net) + '\n');
console.log(`saved epoch ${best.epoch} (held out ${(best.acc * 100).toFixed(1)}%) to ${values.out}`);
