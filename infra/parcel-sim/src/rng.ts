/** mulberry32: small, fast, deterministic. State is a uint32 stored on the World so runs replay exactly. */
export function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), t | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t];
}

/**
 * BinomialRandomizer.calculateAlchemicaSurveyAmount with the contract's constants:
 * 30 rolls at 1/4, right tail cut at 13, floor 60% of average, base 73_000_000, multiplier 1.4.
 * Returns [amount, nextState].
 */
export function surveyAmount(average: number, state: number): [number, number] {
  let rolls = 0;
  let s = state;
  for (let i = 0; i < 30; i++) {
    const [r, next] = nextRandom(s);
    s = next;
    if (r < 0.25) rolls++;
  }
  rolls = Math.min(rolls, 30 - 13);
  let mult = 10_000;
  for (let i = 0; i < rolls; i++) mult = Math.floor((mult * 14_000) / 10_000);
  mult -= 10_000;
  const value = (73_000_000 * mult) / (30 * 10_000) + 60_000_000;
  return [(value * average) / 100_000_000, s];
}
