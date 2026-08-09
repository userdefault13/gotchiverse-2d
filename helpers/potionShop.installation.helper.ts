import _ from 'lodash';
import installationTypes from 'shared_code/data/installationsCatalog';
import { InstallationIdData, Recipe } from 'types';
import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';

/**
 * Soft-launch Potion Shop catalog lives in `potionShop.installations.local.json`.
 * Exterior L1: 212 · installationType 13 (furniture already uses type 10).
 * Exterior art placeholder: land_wip spritesheet until potion shop art lands.
 */
export const POTION_SHOP_ITEM_ID_START = 212;
export const POTION_SHOP_ITEM_ID_END = 212;
export const POTION_SHOP_ITEM_ID = POTION_SHOP_ITEM_ID_START;
export const POTION_SHOP_INSTALLATION_TYPE = 13;
/** Placeholder exterior until dedicated potion shop art ships. */
export const POTION_SHOP_SPRITE_KEY = 'land_wip';
/** World-map potion shops use this parcelId prefix (not a real parcel). */
export const POTION_SHOP_WORLD_PARCEL_ID = 'POTION';

export function isPotionShopItemId(itemId: number | string): boolean {
  const id = Number(itemId);
  return id >= POTION_SHOP_ITEM_ID_START && id <= POTION_SHOP_ITEM_ID_END;
}

export function isPotionShopInstallationType(installationType: number | string | undefined): boolean {
  return Number(installationType) === POTION_SHOP_INSTALLATION_TYPE;
}

export function isPotionShopInstallationId(id: string): boolean {
  try {
    const data = getInstallationIdDataById(id) as unknown as InstallationIdData;
    return data?.type === 'INSTALLATION' && isPotionShopItemId(data.itemId);
  } catch {
    return false;
  }
}

export function isWorldPotionShopId(id: string): boolean {
  try {
    const data = getInstallationIdDataById(id) as unknown as InstallationIdData;
    return data?.parcelId === POTION_SHOP_WORLD_PARCEL_ID && isPotionShopItemId(data.itemId);
  } catch {
    return false;
  }
}

/** Soft-launch Potion Shop L1 recipe (parcel exterior, type 13). */
export function getLocalPotionShopRecipes(): Recipe[] {
  return _.values(installationTypes)
    .filter((item) => isPotionShopItemId(item.itemId) && Number(item.level) === 1)
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
        itemType: POTION_SHOP_INSTALLATION_TYPE,
        type: 'INSTALLATION' as const,
        installationType: POTION_SHOP_INSTALLATION_TYPE,
        deprecated: false,
        level: Number(item.level) || 1,
        endDate: undefined,
      };
    });
}
