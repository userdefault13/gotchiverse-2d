import { DEFAULT_CONFIG } from '../rules.ts';
import { nextRandom } from '../rng.ts';
import type { Alch, ParcelSize, SimConfig } from '../types.ts';

/** Vary horizon (30-730 days), starting budget (0.25x-4x) and parcel size (humble or reasonable) per seed. */
export function trainingConfig(seed: number): SimConfig {
  const [a, s1] = nextRandom((seed ^ 0x27d4eb2f) >>> 0);
  const [b, s2] = nextRandom(s1);
  const [c] = nextRandom(s2);
  const scale = 4 ** (b * 2 - 1);
  return {
    ...DEFAULT_CONFIG,
    size: (c < 0.5 ? 0 : 1) as ParcelSize,
    horizonDays: Math.round(30 + a * 700),
    startingBudget: DEFAULT_CONFIG.startingBudget.map((v) => v * scale) as Alch,
  };
}
