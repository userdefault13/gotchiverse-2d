/* eslint-disable @typescript-eslint/indent */
import { State } from './store';

export type Action =
  | {
      type: 'UPDATE_DIALOG_MODAL_OPEN';
      withdrawDialogState: State['withdrawDialogState'];
      alchemica: State['alchemica'];
      depositId: State['depositId'];
    }
  | {
      type: 'UPDATE_TRANSACTION_STATE';
      transactionState: State['transactionState'];
    }
  | {
      type: 'UPDATE_TRANSACTION_STATUS_UPDATE';
      transactionStatusUpdate: State['transactionStatusUpdate'];
    }
  | {
      type: 'UPDATE_IN_GAME_ALCHEMICA';
      inGameAlchemica: State['inGameAlchemica'];
    }
  | {
      type: 'UPDATE_HUD';
      hud: State['hud'];
    }
  | {
      type: 'UPDATE_AALTAR_DIALOGUE';
      aaltarDialogueState: State['aaltarDialogueState'];
    }
  | {
      type: 'UPDATE_PARCEL_DASHBOARD';
      parcelDashboardState: State['parcelDashboardState'];
    }
  | {
      type: 'UPDATE_ACCESS_RIGHTS_STATE';
      accessRightsState: State['accessRightsState'];
    }
  | {
      type: 'UPDATE_HARVESTER_STATE';
      harvesterState: State['harvesterState'];
    }
  | {
      type: 'UPDATE_ITEM_SHOP_STATE';
      itemShopState: State['itemShopState'];
    }
  | {
      type: 'UPDATE_RESERVOIR_STATE';
      reservoirState: State['reservoirState'];
    }
  | {
      type: 'UPDATE_UPGRADE_MODAL';
      upgradeModal: State['upgradeModal'];
    }
  | {
      type: 'UPDATE_MAAKER_MODAL';
      maakerModal: State['maakerModal'];
    }
  | {
      type: 'UPDATE_UNEQUIP_MODAL';
      unequipModal: State['unequipModal'];
    }
  | {
      type: 'UPDATE_EVENTS_MODAL';
      eventsModal: State['eventsModal'];
    }
  | { type: 'UPDATE_SOCKET'; socket: State['socket'] }
  | { type: 'UPDATE_FOCUS'; currentFocus: State['currentFocus'] }
  | { type: 'UPDATE_INMENU'; inMenu: State['inMenu'] }
  | { type: 'UPDATE_NFT_DISPLAY'; nftDisplayState: State['nftDisplayState'] }
  | { type: 'UPDATE_NFT_DISPLAY_ADMIN'; nftDisplayAdminState: State['nftDisplayAdminState'] }
  | { type: 'UPDATE_STORE_MODAL'; storeState: State['storeState'] }
  | { type: 'UPDATE_LODGE_MODAL'; lodgeState: State['lodgeState'] }
  | { type: 'UPDATE_CONSOLE_MODAL'; consoleState: State['consoleState'] }
  | { type: 'UPDATE_BROADCASTER_MODAL'; broadcasterState: State['broadcasterState'] }
  | { type: 'UPDATE_STORE_CART'; storeCart: State['storeCart'] }
  | { type: 'UPDATE_STORE_SHELF_MODAL'; storeShelfModal: State['storeShelfModal'] }
  | { type: 'UPDATE_LODGE_CART'; lodgeCart: State['lodgeCart'] }
  | { type: 'UPDATE_LODGE_SHELF_MODAL'; lodgeShelfModal: State['lodgeShelfModal'] }
  | { type: 'UPDATE_EVENT_HOLOGRAM'; eventHologramState: State['eventHologramState'] }
  | { type: 'UPDATE_ACTIVE_EVENTS_MODAL'; activeEventsModal: State['activeEventsModal'] }
  | { type: 'UPDATE_TRAVEL_PARCELS_MODAL'; travelParcelsModal: State['travelParcelsModal'] }
  | { type: 'UPDATE_EXIT_ARENA_MODAL'; exitArenaModal: State['exitArenaModal'] }
  | { type: 'UPDATE_CONTROLLER_GUIDE'; controllerGuideOpen: State['controllerGuideOpen'] };

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'UPDATE_DIALOG_MODAL_OPEN':
      return {
        ...state,
        withdrawDialogState: action.withdrawDialogState,
        alchemica: action.alchemica,
        depositId: action.depositId,
      };
    case 'UPDATE_AALTAR_DIALOGUE':
      return {
        ...state,
        aaltarDialogueState: action.aaltarDialogueState,
      };
    case 'UPDATE_PARCEL_DASHBOARD':
      return {
        ...state,
        parcelDashboardState: action.parcelDashboardState,
      };
    case 'UPDATE_ACCESS_RIGHTS_STATE':
      return {
        ...state,
        accessRightsState: action.accessRightsState,
      };
    case 'UPDATE_HARVESTER_STATE':
      return {
        ...state,
        harvesterState: action.harvesterState,
      };
    case 'UPDATE_ITEM_SHOP_STATE':
      return {
        ...state,
        itemShopState: action.itemShopState,
      };
    case 'UPDATE_RESERVOIR_STATE':
      return {
        ...state,
        reservoirState: action.reservoirState,
      };
    case 'UPDATE_TRANSACTION_STATE':
      return {
        ...state,
        transactionState: action.transactionState,
      };
    case 'UPDATE_TRANSACTION_STATUS_UPDATE':
      return {
        ...state,
        transactionStatusUpdate: action.transactionStatusUpdate,
      };
    case 'UPDATE_IN_GAME_ALCHEMICA':
      return {
        ...state,
        inGameAlchemica: action.inGameAlchemica,
      };
    case 'UPDATE_HUD':
      return {
        ...state,
        hud: action.hud,
      };
    case 'UPDATE_UPGRADE_MODAL':
      return {
        ...state,
        upgradeModal: action.upgradeModal,
      };
    case 'UPDATE_MAAKER_MODAL':
      return {
        ...state,
        maakerModal: action.maakerModal,
      };
    case 'UPDATE_UNEQUIP_MODAL':
      return {
        ...state,
        unequipModal: action.unequipModal,
      };
    case 'UPDATE_EVENTS_MODAL':
      return {
        ...state,
        eventsModal: action.eventsModal,
      };
    case 'UPDATE_SOCKET':
      return {
        ...state,
        socket: action.socket,
      };
    case 'UPDATE_FOCUS':
      return {
        ...state,
        currentFocus: action.currentFocus,
      };
    case 'UPDATE_INMENU':
      return {
        ...state,
        inMenu: action.inMenu,
      };
    case 'UPDATE_NFT_DISPLAY':
      return {
        ...state,
        nftDisplayState: action.nftDisplayState,
      };
    case 'UPDATE_NFT_DISPLAY_ADMIN':
      return {
        ...state,
        nftDisplayAdminState: action.nftDisplayAdminState,
      };
    case 'UPDATE_STORE_MODAL':
      return {
        ...state,
        storeState: action.storeState,
      };
    case 'UPDATE_LODGE_MODAL':
      return {
        ...state,
        lodgeState: action.lodgeState,
      };
    case 'UPDATE_CONSOLE_MODAL':
      return {
        ...state,
        consoleState: action.consoleState,
      };
    case 'UPDATE_BROADCASTER_MODAL':
      return {
        ...state,
        broadcasterState: action.broadcasterState,
      };
    case 'UPDATE_STORE_CART':
      return {
        ...state,
        storeCart: action.storeCart,
      };
    case 'UPDATE_STORE_SHELF_MODAL':
      return {
        ...state,
        storeShelfModal: action.storeShelfModal,
      };
    case 'UPDATE_LODGE_CART':
      return {
        ...state,
        lodgeCart: action.lodgeCart,
      };
    case 'UPDATE_LODGE_SHELF_MODAL':
      return {
        ...state,
        lodgeShelfModal: action.lodgeShelfModal,
      };
    case 'UPDATE_ACTIVE_EVENTS_MODAL':
      return { ...state, activeEventsModal: action.activeEventsModal };

    case 'UPDATE_TRAVEL_PARCELS_MODAL':
      return { ...state, travelParcelsModal: action.travelParcelsModal };

    case 'UPDATE_EVENT_HOLOGRAM':
      return {
        ...state,
        eventHologramState: action.eventHologramState,
      };
    case 'UPDATE_EXIT_ARENA_MODAL':
      return {
        ...state,
        exitArenaModal: action.exitArenaModal,
      };
    case 'UPDATE_CONTROLLER_GUIDE':
      return { ...state, controllerGuideOpen: action.controllerGuideOpen };
    default:
      return state;
  }
};
