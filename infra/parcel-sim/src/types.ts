/** Alchemica amounts indexed [FUD, FOMO, ALPHA, KEK]. */
export type Alch = [number, number, number, number];

export type InstallationKind = 'altar' | 'harvester' | 'reservoir' | 'maaker' | 'other';

export type InstallationType = {
  id: number;
  name: string;
  kind: InstallationKind;
  level: number;
  /** 0 FUD, 1 FOMO, 2 ALPHA, 3 KEK (index into Alch) */
  alchemicaType: number;
  width: number;
  height: number;
  /** blocks */
  craftTime: number;
  nextLevelId: number;
  alchemicaCost: Alch;
  /** alchemica per day */
  harvestRate: number;
  capacity: number;
  /** [altar level, lodge level] */
  prerequisites: [number, number];
  upgradeQueueBoost: number;
  /** can't be crafted any more, but may still be equipped on old parcels */
  deprecated: boolean;
};

export type Placed = { typeId: number; x: number; y: number };

export type QueuedUpgrade = { x: number; y: number; fromTypeId: number; toTypeId: number; readyAt: number };

/** 0 humble 8x8, 1 reasonable 16x16, 2 spacious vertical 32x64, 3 spacious horizontal 64x32, 4 paartner 64x64 */
export type ParcelSize = 0 | 1 | 2 | 3 | 4;

export type World = {
  seed: number;
  /** seconds since sim start */
  time: number;
  horizon: number;
  size: ParcelSize;
  placed: Placed[];
  upgradeQueue: QueuedUpgrade[];
  currentRound: number;
  nextSurveyAt: number;
  alchemicaRemaining: Alch;
  unclaimed: Alch;
  lastUpdate: Alch;
  lastClaimedAt: number;
  /** alchemica held by the bot account, spent on building */
  budget: Alch;
  stats: Stats;
  rngState: number;
  /** owner goal: alchemica types the steward may build or upgrade harvesters and reservoirs for */
  goalAlchemica: [boolean, boolean, boolean, boolean];
};

export type Stats = {
  /** minted to the parcel owner's gotchi by claims */
  harvested: Alch;
  /** sent from owner to the bot (starting budget + reinvest share) */
  fundedByOwner: Alch;
  spent: Alch;
  /** accrual lost because reservoirs were full */
  wasted: Alch;
  claims: number;
  builds: number;
  upgrades: number;
  rejected: number;
  rejectReasons: Record<string, number>;
};

export type Action =
  | { kind: 'claim' }
  | { kind: 'build'; typeId: number; x: number; y: number }
  | { kind: 'upgrade'; x: number; y: number }
  | { kind: 'wait'; until?: number };

export type SimConfig = {
  size: ParcelSize;
  horizonDays: number;
  /** what the owner already has equipped when the bot is assigned */
  starting: Placed[];
  startingBudget: Alch;
  /** fraction of each claim the owner sends back to the bot */
  reinvestShare: number;
  /** owner surveys the next round this often; 0 = all rounds surveyed before the bot starts (surveying is owner-only) */
  surveyEveryDays: number;
  /** 10 on Base: round 0 releases 25%, rounds 1-9 release 8.3% each; all are released by the diamond owner */
  maxSurveyRounds: number;
  blockTimeSec: number;
  /** relative value of each alchemica for scoring; defaults to recipeWeights() */
  valueWeights: Alch;
  /** owner goal: only develop these alchemica types (claims always collect all four); default all */
  goalAlchemica?: [boolean, boolean, boolean, boolean];
};

export type Observation = {
  world: Readonly<World>;
  available: Alch;
  capacity: Alch;
  harvestRate: Alch;
  canClaimAt: number;
};

export type Policy = {
  name: string;
  act(obs: Observation, legal: Action[]): Action;
};
