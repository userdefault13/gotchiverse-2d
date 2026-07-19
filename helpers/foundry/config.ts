import { WallReceiverDef, WildNodeDef } from './types';

/** Demo coords aligned with gotchiverse-realm-server foundry config. */
export const FOUNDRY_DEMO_NODES: WildNodeDef[] = [
  {
    id: 'yield-fields',
    x: 320000,
    y: 140000,
    veinType: 'yield',
    label: 'Yield Fields Vein',
    remaining: 500,
  },
  {
    id: 'defi-desert',
    x: 180000,
    y: 120000,
    veinType: 'desert_salvage',
    label: 'DeFi Desert Dish Salvage',
    remaining: 400,
  },
];

export const FOUNDRY_WALL_RECEIVERS: WallReceiverDef[] = [
  {
    id: 'wall-receiver-south',
    x: 270000,
    y: 230000,
    label: 'South Rim Receiver',
  },
];

export const FOUNDRY_DEFAULTS = {
  antennaLinkRangePx: 80000,
  maxAntennas: 3,
  gatherAmount: { fud: 8, fomo: 4, alpha: 2, kek: 2 },
  salvagePerDesertGather: { antenna: 1, dish: 1, slag: 2 },
  interactRadiusPx: 2000,
  factionDamageHp: 25,
  pollutionPerChannelSpill: 1,
};

export type FoundryRemoteConfig = {
  enableParcelFoundryPoC: boolean;
  antennaLinkRangePx: number;
  maxAntennasPerPlayer: number;
  wildNodes: WildNodeDef[];
  wallReceivers: WallReceiverDef[];
};

export async function fetchFoundryConfig(apiBase?: string): Promise<FoundryRemoteConfig | null> {
  if (!apiBase) return null;
  try {
    const res = await fetch(`${apiBase.replace(/\/$/, '')}/foundry/config`);
    if (!res.ok) return null;
    return (await res.json()) as FoundryRemoteConfig;
  } catch {
    return null;
  }
}
