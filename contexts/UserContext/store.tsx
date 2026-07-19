import { BigNumber } from '@ethersproject/bignumber';
import type { AlchemicaBalance, GotchiverseAavegotchi, GotchiverseParcel, Installation, OngoingUpgrades } from 'types';

export interface State {
  ghstBalance: BigNumber;
  inventory?: Installation[];
  activeBrush?: number;
  alchemicaBalance?: AlchemicaBalance;
  gltrBalance?: number;
  maticBalance?: number;
  ownedParcels?: GotchiverseParcel[];
  userAavegotchis?: GotchiverseAavegotchi[];
  ongoingUpgrades?: OngoingUpgrades[];
  addresses?: string[];
  parcelAccessOwners?: string[];
  eventInitialFilter?: string;
  isVerified: boolean;
  /** Soft-launch Aarcade cartridge identity (from query or cartridge-sim lookup). */
  cartridgeId?: string | null;
  hasCartridge?: boolean;
  cartridgeCatalogUrl?: string;
}

export const initialState: State = {
  ghstBalance: BigNumber.from(0),
  isVerified: false,
  parcelAccessOwners: [],
  cartridgeId: null,
  hasCartridge: false,
  cartridgeCatalogUrl: undefined,
};
