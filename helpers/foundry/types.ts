export type NetherlinkStatus = 'green' | 'amber' | 'black';

export type VeinType =
  | 'yield'
  | 'iron'
  | 'copper'
  | 'aluminum'
  | 'cobalt'
  | 'methane'
  | 'noxious';

export type MaterialKey =
  | 'ironOre'
  | 'copperOre'
  | 'aluminumOre'
  | 'cobaltOre'
  | 'methane'
  | 'noxiousGas'
  | 'steel'
  | 'copperPlate'
  | 'aluminumPlate'
  | 'cobaltIngot'
  | 'wire'
  | 'bolts'
  | 'nuts'
  | 'screws'
  | 'dishFrame'
  | 'antennaCore'
  | 'antennaRelay';

export interface FoundryAlchemica {
  fud: number;
  fomo: number;
  alpha: number;
  kek: number;
}

export type FoundryMaterials = Record<MaterialKey, number>;

export interface WildNodeDef {
  id: string;
  x: number;
  y: number;
  veinType: VeinType;
  label: string;
  remaining: number;
}

export interface WallReceiverDef {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface AntennaEntity {
  id: string;
  x: number;
  y: number;
  hp: number;
  powered: boolean;
  ownerId?: string;
}

export interface FoundryEnemyEntity {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  kind: string;
}

export interface FoundryState {
  enabled: boolean;
  pollution: number;
  titheAccrued: number;
  powerGen: number;
  powerDraw: number;
  netherlink: NetherlinkStatus;
  cargo: FoundryAlchemica;
  materials: FoundryMaterials;
  wildNodes: WildNodeDef[];
  wallReceivers: WallReceiverDef[];
  antennas: AntennaEntity[];
  enemies: FoundryEnemyEntity[];
  walkLedgerHint: string;
  lastMeshBreakAt?: number;
  maxAntennas: number;
  antennaLinkRangePx: number;
}

export const EMPTY_ALCHEMICA = (): FoundryAlchemica => ({ fud: 0, fomo: 0, alpha: 0, kek: 0 });

export const EMPTY_MATERIALS = (): FoundryMaterials => ({
  ironOre: 0,
  copperOre: 0,
  aluminumOre: 0,
  cobaltOre: 0,
  methane: 0,
  noxiousGas: 0,
  steel: 0,
  copperPlate: 0,
  aluminumPlate: 0,
  cobaltIngot: 0,
  wire: 0,
  bolts: 0,
  nuts: 0,
  screws: 0,
  dishFrame: 0,
  antennaCore: 0,
  antennaRelay: 0,
});

export const FOUNDRY_STORAGE_KEY = 'gotchiverse.foundry.poc.v2';

/** @deprecated Use MaterialKey / FoundryMaterials */
export type SalvageKey = MaterialKey;
/** @deprecated Use FoundryMaterials */
export type FoundrySalvage = FoundryMaterials;
export const EMPTY_SALVAGE = EMPTY_MATERIALS;
