import _ from 'lodash';
import installationTypes from 'shared_code/data/installations.json';
import GlobalState from 'contexts/GlobalState';
import { AlchemicaBalance, Installation, InstallationIdData, Recipe } from 'types';
import { getTypeByItemId, setLocalInventory, getLocalInventoryItem } from './installations.helper';
import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';
import { adjustOffchainInventoryQty, getOffchainInventory, getOffchainInventoryQty, setOffchainInventoryQty } from './offchain.store';

/** Local-only Waall itemIds (not deployed on InstallationDiamond / subgraph). */
export const WAALL_ITEM_ID_START = 162;
export const WAALL_ITEM_ID_END = 170;
export const WAALL_INSTALLATION_TYPE = 3;
export const WAALL_SPRITE_KEY = 'waall';

export function isWaallItemId(itemId: number | string): boolean {
  const id = Number(itemId);
  return id >= WAALL_ITEM_ID_START && id <= WAALL_ITEM_ID_END;
}

export function isWaallInstallationType(installationType: number | string | undefined): boolean {
  return Number(installationType) === WAALL_INSTALLATION_TYPE;
}

export function isWaallInstallationId(id: string): boolean {
  try {
    const data = getInstallationIdDataById(id) as unknown as InstallationIdData;
    return data?.type === 'INSTALLATION' && isWaallItemId(data.itemId);
  } catch {
    return false;
  }
}

export function getLocalWaallQuantity(itemId: number): number {
  return getOffchainInventoryQty(itemId);
}

export function adjustLocalWaallQuantity(itemId: number, delta: number): number {
  return adjustOffchainInventoryQty(itemId, delta);
}

/** Level-1 Waall recipes for RecipeBook (subgraph has no type 3). */
export function getLocalWaallRecipes(): Recipe[] {
  return _.values(installationTypes)
    .filter((item) => isWaallInstallationType(item.installationType) && Number(item.level) === 1)
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
        itemType: WAALL_INSTALLATION_TYPE,
        type: 'INSTALLATION' as const,
        installationType: WAALL_INSTALLATION_TYPE,
        deprecated: false,
        level: 1,
        endDate: undefined,
      };
    });
}

export interface LocalWaallUpgradeInfo {
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

/** Resolve current/next Waall levels from local catalog (no diamond call). */
export function getLocalWaallUpgradeInfo(itemId: number): LocalWaallUpgradeInfo | null {
  if (!isWaallItemId(itemId)) return null;
  const current = installationTypes[String(itemId)] || installationTypes[itemId];
  if (!current) return null;
  const info: LocalWaallUpgradeInfo = {
    current: {
      name: current.name,
      level: Number(current.level),
      id: Number(current.itemId),
      installationType: WAALL_INSTALLATION_TYPE,
      spillRadius: Number(current.spillRadius || 0),
      spillRate: Number(current.spillRate || 0),
      harvestRate: Number(current.harvestRate || 0),
      capacity: 0,
    },
  };
  const nextId = itemId + 1;
  const next = isWaallItemId(nextId) ? installationTypes[String(nextId)] || installationTypes[nextId] : null;
  if (next) {
    const cost = next.alchemicaCost || [0, 0, 0, 0];
    info.next = {
      name: next.name,
      level: Number(next.level),
      id: Number(next.itemId),
      installationType: WAALL_INSTALLATION_TYPE,
      spillRadius: Number(next.spillRadius || 0),
      spillRate: Number(next.spillRate || 0),
      harvestRate: Number(next.harvestRate || 0),
      capacity: 0,
      upgradeCost: cost.map((c) => Number(c)),
      // Local Waall upgrades are instant (no diamond craft queue / GLTR).
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
    itemType: WAALL_INSTALLATION_TYPE,
    alchemicaType: typeData.alchemicaType,
    isVisible: true,
  };
  inventory.push(item);
  return item;
}

/** Merge persisted local Waall balances into chain inventory (and keep them across refresh). */
export function mergeLocalWaallsIntoInventory(inventory: Installation[]): Installation[] {
  const qty = getOffchainInventory();
  const byId = _.keyBy(
    inventory.filter((i) => i.type === 'INSTALLATION'),
    'itemId',
  );
  const merged = [...inventory];

  _.each(qty, (quantity, idStr) => {
    const itemId = Number(idStr);
    if (!isWaallItemId(itemId) || quantity <= 0) return;
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
        itemType: WAALL_INSTALLATION_TYPE,
        alchemicaType: typeData.alchemicaType,
        isVisible: true,
      });
    }
  });

  return merged;
}

export function craftWaallLocally(
  recipe: Recipe,
  quantity: number,
  alchemicaBalance: AlchemicaBalance,
): { ok: boolean; message: string; nextBalance?: AlchemicaBalance } {
  if (!isWaallItemId(recipe.id) || recipe.type !== 'INSTALLATION') {
    return { ok: false, message: 'Not a Waall recipe' };
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
    adjustLocalWaallQuantity(recipe.id, 1);
    setLocalInventory(recipe.id, 'INSTALLATION', 1);
  }

  const nextBalance = {
    fud: alchemicaBalance.fud - total.fud,
    fomo: alchemicaBalance.fomo - total.fomo,
    alpha: alchemicaBalance.alpha - total.alpha,
    kek: alchemicaBalance.kek - total.kek,
  };

  return { ok: true, message: `Crafted ${quantity}× ${recipe.name}`, nextBalance };
}

/** Sync offchain store when build mode spends / restores Waall inventory. */
export function syncWaallInventoryFromScene(itemId: number): void {
  if (!isWaallItemId(itemId)) return;
  const item = getLocalInventoryItem(itemId, 'INSTALLATION');
  const quantity = Number(item?.quantity || 0);
  setOffchainInventoryQty(itemId, quantity);
}
