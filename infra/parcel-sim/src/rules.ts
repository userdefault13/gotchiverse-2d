// On-chain rules for the parcel steward, ported from the verified Base facets:
//   AlchemicaFacet + LibAlchemica + LibRealm + BinomialRandomizer  @ 0x2402A574331404A32F42d9B02D053f5FBD37E064
//   RealmFacet (equipInstallation)                                   @ 0xfe2E4027667D699D3224eE59d5E234a6Ef07F754
//   InstallationUpgradeFacet + LibInstallation                       @ 0xd5403D05e3984A3e6C41ed92E8180E87B42715dB
import fixtures from './fixtures/installations.json' with { type: 'json' };
import type { Alch, InstallationKind, InstallationType, ParcelSize, SimConfig } from './types.ts';

export const DAY = 86_400;

/** LibAlchemica.claimAvailableAlchemica: "8 hours claim cooldown" */
export const CLAIM_COOLDOWN = 8 * 3600;

/** Longest a plain wait can skip, so policies get to act while harvest accrues between scheduled events. */
export const DECISION_TICK = 3600;

/** AppStorage.sol HUMBLE/REASONABLE/SPACIOUS/PAARTNER width and height, via LibRealm.getWidths/getHeights */
export const GRID: Record<ParcelSize, { w: number; h: number }> = {
  0: { w: 8, h: 8 },
  1: { w: 16, h: 16 },
  2: { w: 32, h: 64 },
  3: { w: 64, h: 32 },
  4: { w: 64, h: 64 },
};

/** LibAlchemica.addHarvesterAllowed */
export const MAX_HARVESTERS: Record<ParcelSize, number> = { 0: 4, 1: 16, 2: 128, 3: 128, 4: 256 };

/** RealmFacet.getTotalAlchemicas() on Base, per parcel size, in whole alchemica */
export const TOTAL_ALCHEMICAS: Record<ParcelSize, Alch> = {
  0: [28_473, 14_237, 7_118, 2_847],
  1: [113_893, 56_947, 28_473, 11_389],
  2: [911_145, 455_573, 227_786, 91_115],
  3: [911_145, 455_573, 227_786, 91_115],
  4: [1_822_290, 911_145, 455_573, 182_229],
};

const KINDS: Record<number, InstallationKind> = { 0: 'altar', 1: 'harvester', 2: 'reservoir', 6: 'maaker' };

type FixtureType = (typeof fixtures.types)[number];

function toType(t: FixtureType): InstallationType {
  return {
    id: t.id,
    name: t.name,
    kind: KINDS[t.installationType] ?? 'other',
    level: t.level,
    alchemicaType: t.alchemicaType,
    width: t.width,
    height: t.height,
    craftTime: t.craftTime,
    nextLevelId: t.nextLevelId,
    alchemicaCost: t.alchemicaCost as Alch,
    harvestRate: t.harvestRate,
    capacity: t.capacity,
    prerequisites: [t.prerequisites[0] ?? 0, t.prerequisites[1] ?? 0],
    upgradeQueueBoost: t.upgradeQueueBoost,
    deprecated: t.deprecated,
  };
}

/** Installation types read from the Base Installation diamond, deprecated ones included since old parcels still have them. */
export const TYPES: Map<number, InstallationType> = new Map(fixtures.types.map((t) => [t.id, toType(t)]));

export function typeOf(id: number): InstallationType {
  const t = TYPES.get(id);
  if (!t) throw new Error(`unknown installation type ${id}`);
  return t;
}

/** Level-1 harvester and reservoir types the steward may craft and equip (RealmFacet: "Can only equip lvl 1"). */
export const BUILDABLE: InstallationType[] = [...TYPES.values()].filter(
  (t) => !t.deprecated && t.level === 1 && (t.kind === 'harvester' || t.kind === 'reservoir'),
);

/**
 * Value of each alchemica for building, relative to FUD: its share of all altar/harvester/reservoir recipe costs
 * divided by its share of total supply. FOMO comes out scarcest for building, KEK and ALPHA are rare but little used.
 */
export function recipeWeights(): Alch {
  const demand: Alch = [0, 0, 0, 0];
  for (const t of TYPES.values()) {
    if (t.deprecated || (t.kind !== 'altar' && t.kind !== 'harvester' && t.kind !== 'reservoir')) continue;
    for (let i = 0; i < 4; i++) demand[i] += t.alchemicaCost[i];
  }
  const supply = TOTAL_ALCHEMICAS[0];
  const totalDemand = demand.reduce((a, b) => a + b, 0);
  const totalSupply = supply.reduce((a, b) => a + b, 0);
  const scarcity = demand.map((d, i) => d / totalDemand / (supply[i] / totalSupply));
  return scarcity.map((s) => s / scarcity[0]) as Alch;
}

export const ALTAR_L1 = 10;
export const FUD_HARVESTER_L1 = 56;
export const FUD_RESERVOIR_L1 = 92;

export const DEFAULT_CONFIG: SimConfig = {
  size: 0,
  horizonDays: 90,
  starting: [
    { typeId: ALTAR_L1, x: 0, y: 0 },
    { typeId: FUD_RESERVOIR_L1, x: 2, y: 0 },
    { typeId: FUD_HARVESTER_L1, x: 4, y: 0 },
  ],
  startingBudget: [1000, 500, 100, 20],
  reinvestShare: 0.5,
  surveyEveryDays: 0,
  maxSurveyRounds: 10,
  blockTimeSec: 2,
  valueWeights: recipeWeights(),
};

export function value(a: Alch, weights: Alch): number {
  return a[0] * weights[0] + a[1] * weights[1] + a[2] * weights[2] + a[3] * weights[3];
}
