import _ from 'lodash';
import installationTypes from 'shared_code/data/installations.json';
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

/** Free Alchemical Aaltar L1 — classic craft (0 alchemica), still an original mintable install. */
const FREE_CRAFT_ALTAR_ID = 10;

function costSum(cost: unknown): number {
  if (!Array.isArray(cost)) return 0;
  return cost.reduce((sum, n) => sum + Number(n || 0), 0);
}

/**
 * Original Gotchiverse L1 that could be crafted/minted on-chain.
 * Excludes soft-launch Waall/Lodge/Store/Console and zero-cost raffle/airdrop decor.
 */
export function isOriginalMintableL1(item: {
  itemId?: number | string;
  id?: number | string;
  level?: number | string;
  installationType?: number | string;
  alchemicaCost?: unknown;
  type?: string;
}): boolean {
  const id = Number(item.itemId ?? item.id);
  if (!id) return false;
  if (isWaallItemId(id) || isLodgeItemId(id) || isStoreItemId(id) || isConsoleItemId(id)) return false;
  if (item.type === 'TILE' || item.type === undefined) {
    /* tiles checked separately when known */
  }
  const level = item.level != null ? Number(item.level) : 1;
  if (level && level !== 1) return false;
  if (id === FREE_CRAFT_ALTAR_ID) return true;
  return costSum(item.alchemicaCost) > 0;
}

export function isOriginalMintableRecipe(recipe: Recipe): boolean {
  if (isWaallItemId(recipe.id) || isLodgeItemId(recipe.id) || isStoreItemId(recipe.id) || isConsoleItemId(recipe.id)) {
    return false;
  }
  if (Number(recipe.id) === FREE_CRAFT_ALTAR_ID) return true;
  const ing = recipe.ingredients || ({} as Recipe['ingredients']);
  const sum = Number(ing.fud || 0) + Number(ing.fomo || 0) + Number(ing.alpha || 0) + Number(ing.kek || 0);
  return sum > 0;
}

/**
 * Hide LE / event / decor clutter from Installations (page 1).
 * Decor → DECOR page; golden + soft tiles → CTILES; classic aaltar/harvester/reservoir/maaker stay.
 */
export function isHiddenFromOnchainRecipePage(recipe: {
  id?: number | string;
  name?: string;
  type?: string;
  installationType?: number | string;
}): boolean {
  if (recipe.type === 'TILE') return true;
  if (Number(recipe.installationType) === 7) return true;
  const name = String(recipe.name || '');
  if (/^LE\b/i.test(name.trim())) return true;
  // LE Golden Aaltar L1 + LE Golden NFT Displays (name may vary by size)
  const id = Number(recipe.id);
  if ([1, 141, 142, 143, 144, 161].includes(id)) return true;
  return false;
}

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

function toInstallationRecipe(item: {
  itemId: number | string;
  name: string;
  alchemicaCost?: number[];
  craftTime?: number;
  installationType: number | string;
}): Recipe {
  const cost = item.alchemicaCost || [0, 0, 0, 0];
  return {
    id: Number(item.itemId),
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
}

/**
 * L1 craft recipes from local installations.json / tiles.json.
 * Only original on-chain mintable L1s (paid craft, plus free Alchemical Aaltar).
 * Excludes Waall/Lodge/Store/Console and zero-cost raffle decor.
 */
export function getLocalOnchainRecipes(nameFilter: string | undefined, typeFilter: RecipeTypeFilter): Recipe[] {
  const allowed = allowedInstallationTypes(typeFilter || {});

  const installations: Recipe[] = _.values(installationTypes)
    .filter((item) => {
      const id = Number(item.itemId);
      if (!id || Number(item.level) !== 1) return false;
      if (!allowed.includes(Number(item.installationType))) return false;
      if (!isOriginalMintableL1(item)) return false;
      if (
        isHiddenFromOnchainRecipePage({
          id,
          name: item.name,
          type: 'INSTALLATION',
          installationType: item.installationType,
        })
      ) {
        return false;
      }
      return matchesName(item.name, nameFilter);
    })
    .map(toInstallationRecipe);

  // Tiles live on the CTILES page (golden + soft cTiles) — not Installations page 1.
  const tiles: Recipe[] = [];

  return _.concat(installations, tiles);
}

/** All parcel decorations (installationType 7, L1) for the Decor recipe page. */
export function getLocalDecorationRecipes(): Recipe[] {
  return _.values(installationTypes)
    .filter((item) => Number(item.installationType) === 7 && Number(item.level) === 1 && Number(item.itemId) > 0)
    .map(toInstallationRecipe);
}
