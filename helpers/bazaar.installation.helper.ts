import _ from 'lodash';
import installationTypes from 'shared_code/data/installationsCatalog';
import { InstallationIdData, Recipe } from 'types';
import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';

/**
 * Soft-launch Bazaar catalog lives in `bazaar.installations.local.json`.
 * Exterior L1: 210 · installationType 11 (furniture already uses type 10).
 * Exterior art placeholder: land_wip spritesheet until bazaar tileset lands.
 */
export const BAZAAR_ITEM_ID_START = 210;
export const BAZAAR_ITEM_ID_END = 210;
export const BAZAAR_ITEM_ID = BAZAAR_ITEM_ID_START;
export const BAZAAR_INSTALLATION_TYPE = 11;
/** Placeholder exterior until dedicated bazaar art ships. */
export const BAZAAR_SPRITE_KEY = 'land_wip';
/** World-map circus tents use this parcelId prefix (not a real parcel). */
export const BAZAAR_WORLD_PARCEL_ID = 'BAZAAR';

export function isBazaarItemId(itemId: number | string): boolean {
  const id = Number(itemId);
  return id >= BAZAAR_ITEM_ID_START && id <= BAZAAR_ITEM_ID_END;
}

export function isBazaarInstallationType(installationType: number | string | undefined): boolean {
  return Number(installationType) === BAZAAR_INSTALLATION_TYPE;
}

export function isBazaarInstallationId(id: string): boolean {
  try {
    const data = getInstallationIdDataById(id) as unknown as InstallationIdData;
    return data?.type === 'INSTALLATION' && isBazaarItemId(data.itemId);
  } catch {
    return false;
  }
}

export function isWorldBazaarId(id: string): boolean {
  try {
    const data = getInstallationIdDataById(id) as unknown as InstallationIdData;
    return data?.parcelId === BAZAAR_WORLD_PARCEL_ID && isBazaarItemId(data.itemId);
  } catch {
    return false;
  }
}

/** Soft-launch Bazaar L1 recipe (parcel exterior, type 11). */
export function getLocalBazaarRecipes(): Recipe[] {
  return _.values(installationTypes)
    .filter((item) => isBazaarItemId(item.itemId) && Number(item.level) === 1)
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
        itemType: BAZAAR_INSTALLATION_TYPE,
        type: 'INSTALLATION' as const,
        installationType: BAZAAR_INSTALLATION_TYPE,
        deprecated: false,
        level: Number(item.level) || 1,
        endDate: undefined,
      };
    });
}
