/* eslint-disable @typescript-eslint/indent */
import { State } from './store';

export type Action =
  | {
      type: 'UPDATE_GHST_BALANCE';
      ghstBalance: State['ghstBalance'];
    }
  | {
      type: 'UPDATE_INVENTORY';
      inventory: State['inventory'];
    }
  | {
      type: 'UPDATE_ACTIVE_BRUSH';
      activeBrush: State['activeBrush'];
    }
  | {
      type: 'UPDATE_ONGOING_UPGRADES';
      ongoingUpgrades: State['ongoingUpgrades'];
    }
  | {
      type: 'UPDATE_ALCHEMICA_BALANCE';
      alchemicaBalance: State['alchemicaBalance'];
    }
  | {
      type: 'UPDATE_GLTR_BALANCE';
      gltrBalance: State['gltrBalance'];
    }
  | {
      type: 'UPDATE_MATIC_BALANCE';
      maticBalance: State['maticBalance'];
    }
  | {
      type: 'UPDATE_USER_AAVEGOTCHIS';
      userAavegotchis: State['userAavegotchis'];
    }
  | {
      type: 'UPDATE_OWNED_PARCELS';
      ownedParcels: State['ownedParcels'];
    }
  | {
      type: 'UPDATE_ADDRESSES';
      addresses: State['addresses'];
    }
  | {
      type: 'UPDATE_PARCELS_ACCESS_OWNERS';
      parcelAccessOwners: State['parcelAccessOwners'];
    }
  | {
      type: 'UPDATE_EVENT_FILTER';
      eventInitialFilter: State['eventInitialFilter'];
    }
  | {
      type: 'UPDATE_USER_IS_VERIFIED';
      isVerified: State['isVerified'];
    }
  | {
      type: 'UPDATE_USER_CARTRIDGE';
      cartridgeId?: State['cartridgeId'];
      hasCartridge?: State['hasCartridge'];
      cartridgeCatalogUrl?: State['cartridgeCatalogUrl'];
      cartridgeHeroes?: State['cartridgeHeroes'];
    };

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'UPDATE_GHST_BALANCE':
      return {
        ...state,
        ghstBalance: action.ghstBalance,
      };
    case 'UPDATE_ADDRESSES':
      return {
        ...state,
        addresses: action.addresses,
      };
    case 'UPDATE_PARCELS_ACCESS_OWNERS':
      return {
        ...state,
        parcelAccessOwners: action.parcelAccessOwners,
      };
    case 'UPDATE_OWNED_PARCELS':
      return {
        ...state,
        ownedParcels: action.ownedParcels,
      };
    case 'UPDATE_INVENTORY':
      return {
        ...state,
        inventory: action.inventory,
      };
    case 'UPDATE_USER_AAVEGOTCHIS':
      return {
        ...state,
        userAavegotchis: action.userAavegotchis,
      };
    case 'UPDATE_ACTIVE_BRUSH':
      return {
        ...state,
        activeBrush: action.activeBrush,
      };
    case 'UPDATE_ONGOING_UPGRADES':
      return {
        ...state,
        ongoingUpgrades: action.ongoingUpgrades,
      };
    case 'UPDATE_ALCHEMICA_BALANCE':
      return {
        ...state,
        alchemicaBalance: action.alchemicaBalance,
      };
    case 'UPDATE_GLTR_BALANCE':
      return {
        ...state,
        gltrBalance: action.gltrBalance,
      };
    case 'UPDATE_MATIC_BALANCE':
      return {
        ...state,
        maticBalance: action.maticBalance,
      };
    case 'UPDATE_EVENT_FILTER':
      return {
        ...state,
        eventInitialFilter: action.eventInitialFilter,
      };
    case 'UPDATE_USER_IS_VERIFIED':
      return { ...state, isVerified: action.isVerified };
    case 'UPDATE_USER_CARTRIDGE':
      return {
        ...state,
        ...(action.cartridgeId !== undefined ? { cartridgeId: action.cartridgeId } : {}),
        ...(action.hasCartridge !== undefined ? { hasCartridge: action.hasCartridge } : {}),
        ...(action.cartridgeCatalogUrl !== undefined ? { cartridgeCatalogUrl: action.cartridgeCatalogUrl } : {}),
        ...(action.cartridgeHeroes !== undefined ? { cartridgeHeroes: action.cartridgeHeroes } : {}),
      };

    default:
      return state;
  }
};
