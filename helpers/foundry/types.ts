export type NetherlinkStatus = 'green' | 'amber' | 'black';

export type SalvageKey = 'antenna' | 'dish' | 'slag';

export interface FoundryAlchemica {
  fud: number;
  fomo: number;
  alpha: number;
  kek: number;
}

export interface FoundrySalvage {
  antenna: number;
  dish: number;
  slag: number;
}

export interface WildNodeDef {
  id: string;
  x: number;
  y: number;
  veinType: 'yield' | 'desert_salvage';
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

export interface FoundryState {
  enabled: boolean;
  pollution: number;
  titheAccrued: number;
  powerGen: number;
  powerDraw: number;
  netherlink: NetherlinkStatus;
  cargo: FoundryAlchemica;
  salvage: FoundrySalvage;
  wildNodes: WildNodeDef[];
  wallReceivers: WallReceiverDef[];
  antennas: AntennaEntity[];
  walkLedgerHint: string;
  lastMeshBreakAt?: number;
  maxAntennas: number;
  antennaLinkRangePx: number;
}

export const EMPTY_ALCHEMICA = (): FoundryAlchemica => ({ fud: 0, fomo: 0, alpha: 0, kek: 0 });
export const EMPTY_SALVAGE = (): FoundrySalvage => ({ antenna: 0, dish: 0, slag: 0 });

export const FOUNDRY_STORAGE_KEY = 'gotchiverse.foundry.poc.v1';
