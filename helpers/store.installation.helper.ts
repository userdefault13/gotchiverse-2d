import _ from 'lodash';
import installationTypes from 'shared_code/data/installations.json';
import GlobalState from 'contexts/GlobalState';
import { AlchemicaBalance, Installation, InstallationIdData, Recipe } from 'types';
import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';
import { getTypeByItemId, setLocalInventory, getLocalInventoryItem } from './installations.helper';
import { adjustOffchainInventoryQty, getOffchainInventory, setOffchainInventoryQty } from './offchain.store';

/** Soft-launch Store building (type 9). Not on InstallationDiamond. */
export const STORE_ITEM_ID = 180;
export const STORE_INSTALLATION_TYPE = 9;

export function isStoreItemId(itemId: number | string): boolean {
  return Number(itemId) === STORE_ITEM_ID;
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
    itemType: STORE_INSTALLATION_TYPE,
    alchemicaType: typeData.alchemicaType,
    isVisible: true,
  };
  inventory.push(item);
  return item;
}

/** Soft-launch Store recipe (parcel exterior, type 9). */
export function getLocalStoreRecipes(): Recipe[] {
  return _.values(installationTypes)
    .filter((item) => isStoreItemId(item.itemId) && Number(item.level) === 1)
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
        itemType: STORE_INSTALLATION_TYPE,
        type: 'INSTALLATION' as const,
        installationType: STORE_INSTALLATION_TYPE,
        deprecated: false,
        level: 1,
        endDate: undefined,
      };
    });
}

/** Soft-launch Store + interior furniture recipes for RecipeBook store page. */
export function getLocalStorePageRecipes(): Recipe[] {
  return _.concat(getLocalStoreRecipes(), getLocalStoreFurnitureRecipes());
}

export function getLocalStoreFurnitureRecipes(): Recipe[] {
  return _.values(installationTypes)
    .filter((item) => Number(item.installationType) === 10 && Number(item.level) === 1)
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
        itemType: 10,
        type: 'INSTALLATION' as const,
        installationType: 10,
        deprecated: false,
        level: 1,
        endDate: undefined,
      };
    });
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
