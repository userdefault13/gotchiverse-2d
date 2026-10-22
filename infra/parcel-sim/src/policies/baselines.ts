import { nextRandom } from '../rng.ts';
import type { Policy } from '../types.ts';
import type { PolicyFactory } from '../episode.ts';

/** Picks a random legal action half the time, otherwise waits. */
export const random: PolicyFactory = (seed) => {
  let state = (seed ^ 0x9e3779b9) >>> 0;
  const roll = () => {
    const [r, next] = nextRandom(state);
    state = next;
    return r;
  };
  return {
    name: 'random',
    act(_obs, legal) {
      const moves = legal.filter((a) => a.kind !== 'wait');
      if (moves.length === 0 || roll() < 0.5) return { kind: 'wait' };
      return moves[Math.floor(roll() * moves.length)];
    },
  };
};

/** Claims every time the cooldown allows and never builds: what an owner gets from a claim bot alone. */
export const claimOnly: PolicyFactory = () =>
  ({
    name: 'claim-only',
    act(_obs, legal) {
      return legal.find((a) => a.kind === 'claim') ?? { kind: 'wait' };
    },
  }) satisfies Policy;

/** Claims once a day, like an owner checking in each morning. */
export const dailyClaim: PolicyFactory = () =>
  ({
    name: 'daily-claim',
    act(obs, legal) {
      const claim = legal.find((a) => a.kind === 'claim');
      const sinceLast = obs.world.time - obs.world.lastClaimedAt;
      if (claim && sinceLast >= 86_400) return claim;
      return { kind: 'wait', until: obs.world.lastClaimedAt + 86_400 };
    },
  }) satisfies Policy;
