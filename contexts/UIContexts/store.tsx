import { NFTDisplayData, NFTDisplayServerData, ShopPurchaseStatus, WebSocketObject } from 'types';

export type DialogType = 'none' | 'default' | 'withdraw';
export type AlchemicaType = 'fud' | 'fomo' | 'alpha' | 'kek' | 'gltr';
export type AlchemicaServerType = 'FUD' | 'FOMO' | 'ALPHA' | 'KEK' | 'GLTR';

export interface State {
  withdrawDialogState: boolean;
  aaltarDialogueState: {
    open: boolean;
    altarId?: string;
    realmId?: number;
  };
  parcelDashboardState: {
    open: boolean;
    altarId?: string;
  };
  accessRightsState: {
    open: boolean;
    altarId?: string;
  };
  harvesterState: {
    open: boolean;
    installationId?: string;
    aaltarId?: string;
  };
  reservoirState: {
    open: boolean;
    installationId?: string;
    aaltarId?: string;
  };

  upgradeModal: {
    open: boolean;
    installationId?: string;
  };
  maakerModal: {
    open: boolean;
    installationId?: string;
  };
  unequipModal: {
    open: boolean;
    installationId?: string;
  };

  nftDisplayState: {
    open: boolean;
    isOwner?: boolean;
    installationId?: string;
    serverData?: NFTDisplayServerData;
    nftData?: NFTDisplayData;
  };

  nftDisplayAdminState: {
    open: boolean;
    installationId: string;
  };

  /** Soft-launch Store interior (installationType 9). */
  storeState: {
    open: boolean;
    isOwner?: boolean;
    installationId?: string;
    ownerAddress?: string;
    cartridgeId?: string;
    /** Owner-only mint-green store build HUD (furniture bag → place brush). */
    buildMode?: boolean;
  };

  /** Soft-launch Lodge interior (installationType 4). */
  lodgeState: {
    open: boolean;
    isOwner?: boolean;
    installationId?: string;
    ownerAddress?: string;
    cartridgeId?: string;
    /** Owner-only mint-green lodge build HUD (furniture bag → place brush). */
    buildMode?: boolean;
  };

  /** Soft-launch Bazaar interior (installationType 11). */
  bazaarState: {
    open: boolean;
    isOwner?: boolean;
    installationId?: string;
    ownerAddress?: string;
    cartridgeId?: string;
  };

  /** Soft-launch DAO Satellite Office interior (installationType 12). */
  daoOfficeState: {
    open: boolean;
    isOwner?: boolean;
    installationId?: string;
    ownerAddress?: string;
    cartridgeId?: string;
  };

  /** Soft-launch Potion Shop interior (installationType 13) — hosts ItemShop. */
  potionShopState: {
    open: boolean;
    isOwner?: boolean;
    installationId?: string;
    ownerAddress?: string;
    cartridgeId?: string;
  };

  /** Soft-launch Console furniture inside a Store — Unity game picker / embed. */
  consoleState: {
    open: boolean;
    /** Furniture piece id inside the store layout. */
    furnitureId?: string;
    storeId?: string;
    /** When set, Console is inside a Lodge interior (use lodge layout helpers). */
    lodgeId?: string;
    itemId?: number;
    loadedTitles?: string[];
    isOwner?: boolean;
    /** @deprecated use furnitureId — kept for older callers */
    installationId?: string;
  };

  /** Soft-launch Broadcaster TV inside a Lodge — X live stream modal. */
  broadcasterState: {
    open: boolean;
    furnitureId?: string;
    lodgeId?: string;
    streamUrl?: string;
    isOwner?: boolean;
  };

  /** Session cart while inside a store (cleared on leave). */
  storeCart: Array<{
    shelfId: string;
    slotId?: string;
    listingId: string;
    title: string;
    price: number;
    currency: string;
    quantity: number;
  }>;

  storeShelfModal: {
    open: boolean;
    shelfId?: string;
    slotId?: string;
    isOwner?: boolean;
  };

  /** Session cart while inside a lodge (stub; no Baazaar checkout). */
  lodgeCart: Array<{
    shelfId: string;
    listingId: string;
    title: string;
    price: number;
    currency: string;
    quantity: number;
  }>;

  lodgeShelfModal: {
    open: boolean;
    shelfId?: string;
    isOwner?: boolean;
  };

  itemShopState: {
    purchaseStatus?: ShopPurchaseStatus;
  };

  eventsModal: {
    open: boolean;
    installationId: string;
  };
  activeEventsModal: {
    open: boolean;
    title?: string;
  };

  travelParcelsModal: {
    open: boolean;
  };

  eventHologramState: {
    open: boolean;
    installationId: string;
  };

  exitArenaModal: {
    open: boolean;
    isDead: boolean;
    exitData?: any;
    damageType?: string;
    attackerId?: number;
    attackerName?: string;
    respawnDelay?: number;
    deathTime?: number;
  };

  alchemica: number[];
  depositId: number | undefined;
  transactionState: TransactionState | undefined;
  inGameAlchemica: number[];
  transactionStatusUpdate: TransactionState | undefined;
  controllerGuideOpen: boolean;
  hud: 'PLAY' | 'BUILD';
  socket?: WebSocketObject;
  currentFocus: boolean;
  inMenu: boolean;
}

export interface TransactionState {
  confirmed: number[];
  data: TransactionStateItem;
  gotchi: string;
  totalClaimed: 0;
}

export interface TransactionStateItem {
  id: string;
  status: number;
  message?: string;
  hash?: string;
}

export const initialState: State = {
  withdrawDialogState: false,
  aaltarDialogueState: {
    open: false,
  },
  parcelDashboardState: {
    open: false,
  },
  accessRightsState: {
    open: false,
  },
  harvesterState: {
    open: false,
  },
  itemShopState: {},
  reservoirState: {
    open: false,
  },
  upgradeModal: {
    open: false,
  },
  unequipModal: {
    open: false,
  },
  maakerModal: {
    open: false,
  },
  nftDisplayState: {
    open: false,
  },
  nftDisplayAdminState: {
    open: false,
    installationId: undefined,
  },
  storeState: {
    open: false,
  },
  lodgeState: {
    open: false,
  },
  bazaarState: {
    open: false,
  },
  daoOfficeState: {
    open: false,
  },
  potionShopState: {
    open: false,
  },
  consoleState: {
    open: false,
  },
  broadcasterState: {
    open: false,
  },
  storeCart: [],
  storeShelfModal: {
    open: false,
  },
  lodgeCart: [],
  lodgeShelfModal: {
    open: false,
  },

  eventsModal: {
    open: false,
    installationId: undefined,
  },
  activeEventsModal: {
    open: false,
  },
  travelParcelsModal: {
    open: false,
  },
  eventHologramState: {
    open: false,
    installationId: undefined,
  },
  exitArenaModal: {
    open: false,
    isDead: false,
    damageType: '',
    attackerId: 0,
    attackerName: '',
    respawnDelay: 0,
    deathTime: 0,
  },
  controllerGuideOpen: false,
  alchemica: [0, 0, 0, 0],
  depositId: undefined,
  transactionState: undefined,
  transactionStatusUpdate: undefined,
  inGameAlchemica: [0, 0, 0, 0],
  hud: 'PLAY',
  currentFocus: true,
  inMenu: false,
};
