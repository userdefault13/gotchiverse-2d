import { BigNumber } from '@ethersproject/bignumber';
import type { CartridgeHero } from 'helpers/cartridgeHero.helper';
import type { CWearable } from 'helpers/cartridgeWearable.helper';
import type { CInstallation, CPaarcel } from 'helpers/cartridgePaarcel.helper';
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
  /** Bound cAavegotchis on the player's Gotchiverse cartridge. */
  cartridgeHeroes?: CartridgeHero[];
  /** Dual-inventory cWearables on the player's Gotchiverse cartridge. */
  wearableInventory?: CWearable[];
  /** Soft-launch cPaarcels (Base). */
  parcelInventory?: CPaarcel[];
  /** Soft-launch wallet/parcel-equip cInstallations (Base). */
  installationInventory?: CInstallation[];
}

export const initialState: State = {
  ghstBalance: BigNumber.from(0),
  isVerified: false,
  parcelAccessOwners: [],
  cartridgeId: null,
  hasCartridge: false,
  cartridgeCatalogUrl: undefined,
  cartridgeHeroes: [],
  wearableInventory: [],
  parcelInventory: [],
  installationInventory: [],
};
