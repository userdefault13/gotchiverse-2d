import { VeinType, WallReceiverDef, WildNodeDef } from './types';

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
    id: 'iron-vein',
    x: 180000,
    y: 120000,
    veinType: 'iron',
    label: 'Iron Vein',
    remaining: 500,
  },
  {
    id: 'copper-vein',
    x: 195000,
    y: 125000,
    veinType: 'copper',
    label: 'Copper Vein',
    remaining: 500,
  },
  {
    id: 'aluminum-vein',
    x: 165000,
    y: 135000,
    veinType: 'aluminum',
    label: 'Aluminum Vein',
    remaining: 500,
  },
  {
    id: 'cobalt-vein',
    x: 210000,
    y: 110000,
    veinType: 'cobalt',
    label: 'Cobalt Vein',
    remaining: 400,
  },
  {
    id: 'methane-vent',
    x: 150000,
    y: 150000,
    veinType: 'methane',
    label: 'Methane Vent',
    remaining: 400,
  },
  {
    id: 'noxious-vent',
    x: 160000,
    y: 160000,
    veinType: 'noxious',
    label: 'Noxious Vent',
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
  antennaLinkRangePx: 8000,
  maxAntennas: 3,
  /** Yield Fields — only source of mined alchemica cargo (craft power) */
  gatherAmount: { fud: 8, fomo: 4, alpha: 2, kek: 2 },
  oreGatherAmount: 4,
  gasGatherAmount: 3,
  interactRadiusPx: 2000,
  attackRangePx: 2500,
  enemyHitDamage: 25,
  factionDamageHp: 25,
  pollutionPerChannelSpill: 1,
  /** Local offline enemy seed near mineral veins */
  enemyHp: 100,
};

export type FoundryRemoteConfig = {
  enableParcelFoundryPoC: boolean;
  antennaLinkRangePx: number;
  maxAntennasPerPlayer: number;
  wildNodes: WildNodeDef[];
  wallReceivers: WallReceiverDef[];
};

const VEIN_TYPES: VeinType[] = ['yield', 'iron', 'copper', 'aluminum', 'cobalt', 'methane', 'noxious'];

function parseVeinType(raw: string | undefined): VeinType {
  if (raw && (VEIN_TYPES as string[]).includes(raw)) return raw as VeinType;
  return 'yield';
}

export async function fetchFoundryConfig(apiBase?: string): Promise<FoundryRemoteConfig | null> {
  if (!apiBase) return null;
  try {
    const res = await fetch(`${apiBase.replace(/\/$/, '')}/foundry/config`);
    if (!res.ok) return null;
    const raw = (await res.json()) as FoundryRemoteConfig & {
      nodes?: Array<{ id: string; x: number; y: number; veinType: string; remaining?: number; label?: string }>;
    };
    const nodeList = raw.wildNodes?.length ? raw.wildNodes : raw.nodes || [];
    return {
      enableParcelFoundryPoC: Boolean(raw.enableParcelFoundryPoC),
      antennaLinkRangePx: raw.antennaLinkRangePx ?? FOUNDRY_DEFAULTS.antennaLinkRangePx,
      maxAntennasPerPlayer: raw.maxAntennasPerPlayer ?? FOUNDRY_DEFAULTS.maxAntennas,
      wildNodes: nodeList.map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        veinType: parseVeinType(n.veinType),
        label: n.label || n.id,
        remaining: n.remaining ?? 500,
      })),
      wallReceivers: raw.wallReceivers || FOUNDRY_WALL_RECEIVERS,
    };
  } catch {
    return null;
  }
}
