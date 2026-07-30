import _ from 'lodash';
import installationTypes from 'shared_code/data/installationsCatalog';
import GlobalState from 'contexts/GlobalState';
import { AlchemicaBalance, Installation, InstallationIdData, InstallationTypeLocal, Recipe } from 'types';
import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';
import { getTypeByItemId, setLocalInventory, getLocalInventoryItem } from './installations.helper';
import { adjustOffchainInventoryQty, getOffchainInventory, setOffchainInventoryQty } from './offchain.store';
import {
  CASHIER_ITEM_ID,
  CASHIER_ITEM_ID_END,
  CASHIER_ITEM_ID_START,
  SHELF_ITEM_ID,
  STORE_FURNITURE_TYPE,
  TERMINAL_ITEM_ID,
  isCashierItemId,
  isShelfItemId,
  isStoreFurnitureItemId,
  isTerminalItemId,
} from './store.layout.helper';

/**
 * Soft-launch Store catalog lives in `store.installations.local.json` (not official installations.json).
 * Store L1–9: 180–188 · Cashier L1–9: 189–197 (Maaker-style levels) · Shelf L1: 198 · Terminal L1: 208
 */
export const STORE_ITEM_ID_START = 180;
export const STORE_ITEM_ID_END = 188;
/** Level-1 Store craft/place id */
export const STORE_ITEM_ID = STORE_ITEM_ID_START;
export const STORE_INSTALLATION_TYPE = 9;
export const STORE_SPRITE_KEY = 'store';
export const CASHIER_SPRITE_KEY = 'cashier';
export const SHELF_SPRITE_KEY = 'shelf';
export const TERMINAL_SPRITE_KEY = 'terminal';

export function isStoreItemId(itemId: number | string): boolean {
  const id = Number(itemId);
  return id >= STORE_ITEM_ID_START && id <= STORE_ITEM_ID_END;
}

export function isStoreInstallationType(installationType: number | string | undefined): boolean {
  return Number(installationType) === STORE_INSTALLATION_TYPE;
}

export function isStoreInstallationId(id: string): boolean {
  try {
    const data = getInstallationIdDataById(id) as unknown as InstallationIdData;
    return data?.type === 'INSTALLATION' && isStoreItemId(data.itemId);
  } catch {
    return false;
  }
}

export function isStoreFamilyItemId(itemId: number | string): boolean {
  return isStoreItemId(itemId) || isStoreFurnitureItemId(itemId);
}

export function adjustLocalStoreQuantity(itemId: number, delta: number): number {
  return adjustOffchainInventoryQty(itemId, delta);
}

function ensureInventorySlot(itemId: number): Installation | undefined {
  const inventory = GlobalState.USER?.state?.inventory;
  if (!inventory) return;
  let item = getLocalInventoryItem(itemId, 'INSTALLATION');
  if (item) return item;
  const typeData = getTypeByItemId(itemId, 0);
  if (!typeData) return;
  item = {
    id: itemId,
    itemId,
    name: typeData.name,
    quantity: 0,
    type: 'INSTALLATION',
    width: typeData.width as any,
    height: typeData.height as any,
    level: typeData.level || 1,
    itemType: Number(typeData.installationType) || STORE_INSTALLATION_TYPE,
    alchemicaType: typeData.alchemicaType,
    isVisible: true,
  };
  inventory.push(item);
  return item;
}

function toRecipe(item: InstallationTypeLocal): Recipe {
  const cost = item.alchemicaCost || [0, 0, 0, 0];
  return {
    id: item.itemId,
    name: item.name,
    ingredients: {
      fud: Number(cost[0] || 0),
      fomo: Number(cost[1] || 0),
      alpha: Number(cost[2] || 0),
      kek: Number(cost[3] || 0),
    },
    craftingTime: Number(item.craftTime || 0),
    itemType: Number(item.installationType),
    type: 'INSTALLATION' as const,
    installationType: Number(item.installationType),
    deprecated: false,
    level: Number(item.level) || 1,
    endDate: undefined,
  };
}

/** Soft-launch Store L1 recipe (parcel exterior, type 9). */
export function getLocalStoreRecipes(): Recipe[] {
  return _.values(installationTypes)
    .filter((item) => isStoreItemId(item.itemId) && Number(item.level) === 1)
    .map(toRecipe);
}

/** Soft-launch Store + interior furniture recipes for RecipeBook store page. */
export function getLocalStorePageRecipes(): Recipe[] {
  return _.concat(getLocalStoreRecipes(), getLocalStoreFurnitureRecipes());
}

/** Shelf / Cashier / Terminal L1 (Cashier upgrades 2–9 like Maaker via upgrade UI later). */
export function getLocalStoreFurnitureRecipes(): Recipe[] {
  return _.values(installationTypes)
    .filter(
      (item) =>
        Number(item.installationType) === STORE_FURNITURE_TYPE &&
        Number(item.level) === 1 &&
        (isShelfItemId(item.itemId) || isCashierItemId(item.itemId) || isTerminalItemId(item.itemId)),
    )
    .map(toRecipe);
}

export interface LocalStoreUpgradeInfo {
  current: {
    name: string;
    level: number;
    id: number;
    installationType: number;
    spillRadius: number;
    spillRate: number;
    harvestRate: number;
    capacity: number;
  };
  next?: {
    name: string;
    level: number;
    id: number;
    installationType: number;
    spillRadius: number;
    spillRate: number;
    harvestRate: number;
    capacity: number;
    upgradeCost: number[];
    blocksToUpgrade: number;
  };
}

/** Maaker-style current/next for Store (180–188) or Cashier (189–197). */
export function getLocalStoreUpgradeInfo(itemId: number): LocalStoreUpgradeInfo | null {
  const isStore = isStoreItemId(itemId);
  const isCashier = isCashierItemId(itemId);
  if (!isStore && !isCashier) return null;

  const current = installationTypes[String(itemId)] || installationTypes[itemId];
  if (!current) return null;

  const end = isStore ? STORE_ITEM_ID_END : CASHIER_ITEM_ID_END;
  const info: LocalStoreUpgradeInfo = {
    current: {
      name: current.name,
      level: Number(current.level),
      id: Number(current.itemId),
      installationType: Number(current.installationType),
      spillRadius: Number(current.spillRadius || 0),
      spillRate: Number(current.spillRate || 0),
      harvestRate: Number(current.harvestRate || 0),
      capacity: 0,
    },
  };

  const nextId = itemId + 1;
  if (nextId <= end) {
    const next = installationTypes[String(nextId)] || installationTypes[nextId];
    if (next) {
      const cost = next.alchemicaCost || [0, 0, 0, 0];
      info.next = {
        name: next.name,
        level: Number(next.level),
        id: Number(next.itemId),
        installationType: Number(next.installationType),
        spillRadius: Number(next.spillRadius || 0),
        spillRate: Number(next.spillRate || 0),
        harvestRate: Number(next.harvestRate || 0),
        capacity: 0,
        upgradeCost: cost.map((c) => Number(c)),
        blocksToUpgrade: 0,
      };
    }
  }
  return info;
}

export function mergeLocalStoresIntoInventory(inventory: Installation[]): Installation[] {
  const qty = getOffchainInventory();
  const byId = _.keyBy(
    inventory.filter((i) => i.type === 'INSTALLATION'),
    'itemId',
  );
  const merged = [...inventory];

  _.each(qty, (quantity, idStr) => {
    const itemId = Number(idStr);
    if (!isStoreItemId(itemId) || quantity <= 0) return;
    const existing = byId[itemId];
    if (existing) {
      existing.quantity = quantity;
    } else {
      const typeData = getTypeByItemId(itemId, 0);
      if (!typeData) return;
      merged.push({
        id: itemId,
        itemId,
        name: typeData.name,
        quantity,
        type: 'INSTALLATION',
        width: typeData.width as any,
        height: typeData.height as any,
        level: typeData.level || 1,
        itemType: STORE_INSTALLATION_TYPE,
        alchemicaType: typeData.alchemicaType,
        isVisible: true,
      });
    }
  });

  return merged;
}

export function craftStoreLocally(
  recipe: Recipe,
  quantity: number,
  alchemicaBalance: AlchemicaBalance,
): { ok: boolean; message: string; nextBalance?: AlchemicaBalance } {
  if (!isStoreItemId(recipe.id) || recipe.type !== 'INSTALLATION') {
    return { ok: false, message: 'Not a Store recipe' };
  }
  if (quantity < 1) return { ok: false, message: 'Invalid quantity' };

  const total = {
    fud: recipe.ingredients.fud * quantity,
    fomo: recipe.ingredients.fomo * quantity,
    alpha: recipe.ingredients.alpha * quantity,
    kek: recipe.ingredients.kek * quantity,
  };
  if (
    alchemicaBalance.fud < total.fud ||
    alchemicaBalance.fomo < total.fomo ||
    alchemicaBalance.alpha < total.alpha ||
    alchemicaBalance.kek < total.kek
  ) {
    return { ok: false, message: 'Not enough alchemica' };
  }

  ensureInventorySlot(recipe.id);
  for (let i = 0; i < quantity; i += 1) {
    adjustLocalStoreQuantity(recipe.id, 1);
    setLocalInventory(recipe.id, 'INSTALLATION', 1);
  }

  return {
    ok: true,
    message: `Crafted ${quantity}× ${recipe.name}`,
    nextBalance: {
      fud: alchemicaBalance.fud - total.fud,
      fomo: alchemicaBalance.fomo - total.fomo,
      alpha: alchemicaBalance.alpha - total.alpha,
      kek: alchemicaBalance.kek - total.kek,
    },
  };
}

export function syncStoreInventoryFromScene(itemId: number): void {
  if (!isStoreItemId(itemId)) return;
  const item = getLocalInventoryItem(itemId, 'INSTALLATION');
  const quantity = Number(item?.quantity || 0);
  setOffchainInventoryQty(itemId, quantity);
}

export { CASHIER_ITEM_ID, CASHIER_ITEM_ID_END, CASHIER_ITEM_ID_START, SHELF_ITEM_ID, TERMINAL_ITEM_ID };
