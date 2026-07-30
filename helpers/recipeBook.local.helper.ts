import _ from 'lodash';
import installationTypes from 'shared_code/data/installations.json';
import tileTypes from 'shared_code/data/tiles.json';
import { Recipe } from 'types';
import { isWaallItemId } from './waalls.helper';
import { isLodgeItemId } from './lodge.helper';
import { isStoreItemId } from './store.installation.helper';
import { isConsoleItemId } from './console.installation.helper';

export type RecipeTypeFilter = {
  tile?: boolean;
  aaltar?: boolean;
  reservoir?: boolean;
  harvester?: boolean;
  decoration?: boolean;
  maaker?: boolean;
  waall?: boolean;
  lodge?: boolean;
};

/** Match subgraph getInstallationTypes type flags (always includes 5 + 8). */
function allowedInstallationTypes(typeFilter: RecipeTypeFilter): number[] {
  const types: number[] = [];
  if (typeFilter.aaltar) types.push(0);
  if (typeFilter.harvester) types.push(1);
  if (typeFilter.reservoir) types.push(2);
  if (typeFilter.maaker) types.push(6);
  if (typeFilter.decoration) types.push(7);
  types.push(5, 8);
  return types;
}

function matchesName(name: string, nameFilter?: string): boolean {
  if (!nameFilter) return true;
  return String(name || '')
    .toLowerCase()
    .includes(String(nameFilter).toLowerCase());
}

/**
 * L1 craft recipes from local installations.json / tiles.json.
 * Used when the Gotchiverse subgraph has no type metadata (e.g. Base indexer stubs).
 * Excludes Waall/Lodge/Store/Console — those live on dedicated book pages or local merges.
 */
export function getLocalOnchainRecipes(nameFilter: string | undefined, typeFilter: RecipeTypeFilter): Recipe[] {
  const allowed = allowedInstallationTypes(typeFilter || {});

  const installations: Recipe[] = _.values(installationTypes)
    .filter((item) => {
      const id = Number(item.itemId);
      if (!id || Number(item.level) !== 1) return false;
      if (!allowed.includes(Number(item.installationType))) return false;
      if (isWaallItemId(id) || isLodgeItemId(id) || isStoreItemId(id) || isConsoleItemId(id)) return false;
      return matchesName(item.name, nameFilter);
    })
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
        itemType: Number(item.installationType),
        type: 'INSTALLATION' as const,
        installationType: Number(item.installationType),
        deprecated: false,
        level: 1,
        endDate: undefined,
      };
    });

  const tiles: Recipe[] =
    typeFilter?.tile !== false
      ? _.values(tileTypes)
          .filter((item) => {
            const id = Number(item.itemId);
            if (!id) return false;
            return matchesName(item.name, nameFilter);
          })
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
              craftingTime: Number((item as { craftTime?: number }).craftTime || 0),
              itemType: Number(item.tileType),
              type: 'TILE' as const,
              deprecated: false,
              endDate: undefined,
            };
          })
      : [];

  return _.concat(installations, tiles);
}
