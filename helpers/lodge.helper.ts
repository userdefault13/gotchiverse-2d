import _ from 'lodash';
import installationTypes from 'shared_code/data/installations.json';
import GlobalState from 'contexts/GlobalState';
import { AlchemicaBalance, Installation, InstallationIdData, Recipe } from 'types';
import { getTypeByItemId, setLocalInventory, getLocalInventoryItem } from './installations.helper';
import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';
import { isWaallItemId, isWaallInstallationId } from './waalls.helper';
import { isStoreInstallationId, isStoreItemId } from './store.installation.helper';
import { adjustOffchainInventoryQty, getOffchainInventory, setOffchainInventoryQty } from './offchain.store';

/** Local-only Gotchi Lodge itemIds (not deployed on InstallationDiamond / subgraph). */
export const LODGE_ITEM_ID_START = 171;
export const LODGE_ITEM_ID_END = 179;
export const LODGE_INSTALLATION_TYPE = 4;
export const LODGE_SPRITE_KEY = 'lodge';

export function isLodgeItemId(itemId: number | string): boolean {
  const id = Number(itemId);
  return id >= LODGE_ITEM_ID_START && id <= LODGE_ITEM_ID_END;
}

export function isLodgeInstallationType(installationType: number | string | undefined): boolean {
  return Number(installationType) === LODGE_INSTALLATION_TYPE;
}

export function isLodgeInstallationId(id: string): boolean {
  try {
    const data = getInstallationIdDataById(id) as unknown as InstallationIdData;
    return data?.type === 'INSTALLATION' && isLodgeItemId(data.itemId);
  } catch {
    return false;
  }
}

/** Waall, Lodge, or Store building — local off-chain parcel installs (not Shelf/Cashier furniture). */
export function isLocalOffchainItemId(itemId: number | string): boolean {
  return isWaallItemId(itemId) || isLodgeItemId(itemId) || isStoreItemId(itemId);
}

export function isLocalOffchainInstallationId(id: string): boolean {
  return isWaallInstallationId(id) || isLodgeInstallationId(id) || isStoreInstallationId(id);
}

export function adjustLocalLodgeQuantity(itemId: number, delta: number): number {
  return adjustOffchainInventoryQty(itemId, delta);
}

/** Level-1 Lodge recipes for RecipeBook. */
export function getLocalLodgeRecipes(): Recipe[] {
  return _.values(installationTypes)
    .filter((item) => isLodgeInstallationType(item.installationType) && Number(item.level) === 1)
    .map((item) => {
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
        itemType: LODGE_INSTALLATION_TYPE,
        type: 'INSTALLATION' as const,
        installationType: LODGE_INSTALLATION_TYPE,
        deprecated: false,
        level: 1,
        endDate: undefined,
      };
    });
}

export interface LocalLodgeUpgradeInfo {
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

export function getLocalLodgeUpgradeInfo(itemId: number): LocalLodgeUpgradeInfo | null {
  if (!isLodgeItemId(itemId)) return null;
  const current = installationTypes[String(itemId)] || installationTypes[itemId];
  if (!current) return null;
  const info: LocalLodgeUpgradeInfo = {
    current: {
      name: current.name,
      level: Number(current.level),
      id: Number(current.itemId),
      installationType: LODGE_INSTALLATION_TYPE,
      spillRadius: Number(current.spillRadius || 0),
      spillRate: Number(current.spillRate || 0),
      harvestRate: Number(current.harvestRate || 0),
      capacity: 0,
    },
  };
  const nextId = itemId + 1;
  const next = isLodgeItemId(nextId) ? installationTypes[String(nextId)] || installationTypes[nextId] : null;
  if (next) {
    const cost = next.alchemicaCost || [0, 0, 0, 0];
    info.next = {
      name: next.name,
      level: Number(next.level),
      id: Number(next.itemId),
      installationType: LODGE_INSTALLATION_TYPE,
      spillRadius: Number(next.spillRadius || 0),
      spillRate: Number(next.spillRate || 0),
      harvestRate: Number(next.harvestRate || 0),
      capacity: 0,
      upgradeCost: cost.map((c) => Number(c)),
      blocksToUpgrade: 0,
    };
  }
  return info;
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
    itemType: LODGE_INSTALLATION_TYPE,
    alchemicaType: typeData.alchemicaType,
    isVisible: true,
  };
  inventory.push(item);
  return item;
}

export function mergeLocalLodgesIntoInventory(inventory: Installation[]): Installation[] {
  const qty = getOffchainInventory();
  const byId = _.keyBy(
    inventory.filter((i) => i.type === 'INSTALLATION'),
    'itemId',
  );
  const merged = [...inventory];

  _.each(qty, (quantity, idStr) => {
    const itemId = Number(idStr);
    if (!isLodgeItemId(itemId) || quantity <= 0) return;
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
        itemType: LODGE_INSTALLATION_TYPE,
        alchemicaType: typeData.alchemicaType,
        isVisible: true,
      });
    }
  });

  return merged;
}

export function craftLodgeLocally(
  recipe: Recipe,
  quantity: number,
  alchemicaBalance: AlchemicaBalance,
): { ok: boolean; message: string; nextBalance?: AlchemicaBalance } {
  if (!isLodgeItemId(recipe.id) || recipe.type !== 'INSTALLATION') {
    return { ok: false, message: 'Not a Lodge recipe' };
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
    adjustLocalLodgeQuantity(recipe.id, 1);
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

export function syncLodgeInventoryFromScene(itemId: number): void {
  if (!isLodgeItemId(itemId)) return;
  const item = getLocalInventoryItem(itemId, 'INSTALLATION');
  const quantity = Number(item?.quantity || 0);
  setOffchainInventoryQty(itemId, quantity);
}
