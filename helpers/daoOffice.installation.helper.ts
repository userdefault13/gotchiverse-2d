import _ from 'lodash';
import installationTypes from 'shared_code/data/installationsCatalog';
import { InstallationIdData, Recipe } from 'types';
import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';

/**
 * Soft-launch DAO Satellite Office catalog lives in `daoOffice.installations.local.json`.
 * Exterior L1: 211 · installationType 12 (furniture already uses type 10).
 * Exterior art placeholder: land_wip spritesheet until office art lands.
 */
export const DAO_OFFICE_ITEM_ID_START = 211;
export const DAO_OFFICE_ITEM_ID_END = 211;
export const DAO_OFFICE_ITEM_ID = DAO_OFFICE_ITEM_ID_START;
export const DAO_OFFICE_INSTALLATION_TYPE = 12;
/** Placeholder exterior until dedicated office art ships. */
export const DAO_OFFICE_SPRITE_KEY = 'land_wip';
/** World-map satellite offices use this parcelId prefix (not a real parcel). */
export const DAO_OFFICE_WORLD_PARCEL_ID = 'DAO';

export function isDaoOfficeItemId(itemId: number | string): boolean {
  const id = Number(itemId);
  return id >= DAO_OFFICE_ITEM_ID_START && id <= DAO_OFFICE_ITEM_ID_END;
}

export function isDaoOfficeInstallationType(installationType: number | string | undefined): boolean {
  return Number(installationType) === DAO_OFFICE_INSTALLATION_TYPE;
}

export function isDaoOfficeInstallationId(id: string): boolean {
  try {
    const data = getInstallationIdDataById(id) as unknown as InstallationIdData;
    return data?.type === 'INSTALLATION' && isDaoOfficeItemId(data.itemId);
  } catch {
    return false;
  }
}

export function isWorldDaoOfficeId(id: string): boolean {
  try {
    const data = getInstallationIdDataById(id) as unknown as InstallationIdData;
    return data?.parcelId === DAO_OFFICE_WORLD_PARCEL_ID && isDaoOfficeItemId(data.itemId);
  } catch {
    return false;
  }
}

/** Soft-launch DAO Satellite Office L1 recipe (parcel exterior, type 12). */
export function getLocalDaoOfficeRecipes(): Recipe[] {
  return _.values(installationTypes)
    .filter((item) => isDaoOfficeItemId(item.itemId) && Number(item.level) === 1)
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
        itemType: DAO_OFFICE_INSTALLATION_TYPE,
        type: 'INSTALLATION' as const,
        installationType: DAO_OFFICE_INSTALLATION_TYPE,
        deprecated: false,
        level: Number(item.level) || 1,
        endDate: undefined,
      };
    });
}
