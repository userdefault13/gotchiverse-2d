import tilesDb from 'shared_code/data/tiles.json';
import GlobalState from 'contexts/GlobalState';
import { AlchemicaBalance, Installation, Recipe } from 'types';
import { getLocalInventoryItem, setLocalInventory } from './installations.helper';
import { adjustOffchainInventoryQty, setOffchainInventoryQty } from './offchain.store';
import { STORE_BASE_SHADE_IDS } from './store.layout.helper';

/** Soft-launch cTiles: greyscale bases 8–37 + Ghost pack 38–47. */
export const CTILE_ID_START = 8;
export const CTILE_ID_END = 47;

/** On-chain LE Golden Tiles shown on the cTiles recipe page. */
export const GOLDEN_TILE_IDS = [1, 2, 3] as const;

const GHOST_IDS = Array.from({ length: 10 }, (_, i) => 38 + i);

export function isCTileItemId(itemId: number | string): boolean {
  const id = Number(itemId);
  return id >= CTILE_ID_START && id <= CTILE_ID_END;
}

export function isGoldenTileItemId(itemId: number | string): boolean {
  return (GOLDEN_TILE_IDS as readonly number[]).includes(Number(itemId));
}

function tileRow(itemId: number): Record<string, Record<string, unknown>>[string] | null {
  const row = (tilesDb as Record<string, Record<string, unknown>>)[String(itemId)];
  return row || null;
}

/** Soft craft cost — use catalog cost, or a small default for zero-cost Ghost shades. */
function softCost(itemId: number): { fud: number; fomo: number; alpha: number; kek: number } {
  const row = tileRow(itemId);
  const cost = Array.isArray(row?.alchemicaCost) ? (row.alchemicaCost as number[]) : [0, 0, 0, 0];
  const fud = Number(cost[0]) || 0;
  const fomo = Number(cost[1]) || 0;
  const alpha = Number(cost[2]) || 0;
  const kek = Number(cost[3]) || 0;
  if (fud + fomo + alpha + kek > 0) return { fud, fomo, alpha, kek };
  // Ghost greyscale pack — cheap soft craft.
  return { fud: 5, fomo: 0, alpha: 2, kek: 0 };
}

function toTileRecipe(itemId: number, softLaunch: boolean): Recipe | null {
  const row = tileRow(itemId);
  if (!row) return null;
  const ingredients = softLaunch ? softCost(itemId) : (() => {
    const cost = Array.isArray(row.alchemicaCost) ? (row.alchemicaCost as number[]) : [0, 0, 0, 0];
    return {
      fud: Number(cost[0]) || 0,
      fomo: Number(cost[1]) || 0,
      alpha: Number(cost[2]) || 0,
      kek: Number(cost[3]) || 0,
    };
  })();
  return {
    id: itemId,
    name: String(row.name || `Tile ${itemId}`),
    ingredients,
    craftingTime: 0,
    itemType: Number(row.tileType) || 0,
    type: 'TILE',
    installationType: 0,
    deprecated: false,
    softLaunch,
  };
}

export function getLocalCTileRecipes(): Recipe[] {
  const ids = [...STORE_BASE_SHADE_IDS, ...GHOST_IDS];
  return ids.map((itemId) => toTileRecipe(itemId, true)).filter(Boolean) as Recipe[];
}

/** LE Golden Tile recipes (on-chain craft via Crafting Table). */
export function getLocalGoldenTileRecipes(): Recipe[] {
  return GOLDEN_TILE_IDS.map((itemId) => toTileRecipe(itemId, false)).filter(Boolean) as Recipe[];
}

/** cTiles page: soft-launch cTiles + golden tiles. */
export function getLocalTilePageRecipes(): Recipe[] {
  return [...getLocalCTileRecipes(), ...getLocalGoldenTileRecipes()];
}

function ensureTileInventorySlot(itemId: number): Installation | undefined {
  const inventory = GlobalState.USER?.state?.inventory;
  if (!inventory) return;
  let item = getLocalInventoryItem(itemId, 'TILE');
  if (item) return item;
  const row = tileRow(itemId);
  if (!row) return;
  item = {
    id: itemId,
    itemId,
    name: String(row.name || `Tile ${itemId}`),
    quantity: 0,
    type: 'TILE',
    width: (Number(row.width) || 2) as any,
    height: (Number(row.height) || 2) as any,
    level: 1,
    itemType: Number(row.tileType) || 0,
    alchemicaType: undefined as any,
    isVisible: true,
  };
  inventory.push(item);
  return item;
}

export function craftCTileLocally(
  recipe: Recipe,
  quantity: number,
  alchemicaBalance: AlchemicaBalance,
): { ok: boolean; message: string; nextBalance?: AlchemicaBalance } {
  if (!recipe || !isCTileItemId(recipe.id) || !recipe.softLaunch) {
    return { ok: false, message: 'Not a soft-launch cTile recipe' };
  }
  const qty = Math.max(1, Math.floor(quantity) || 1);
  const total = {
    fud: recipe.ingredients.fud * qty,
    fomo: recipe.ingredients.fomo * qty,
    alpha: recipe.ingredients.alpha * qty,
    kek: recipe.ingredients.kek * qty,
  };
  if (
    alchemicaBalance.fud < total.fud ||
    alchemicaBalance.fomo < total.fomo ||
    alchemicaBalance.alpha < total.alpha ||
    alchemicaBalance.kek < total.kek
  ) {
    return { ok: false, message: 'Not enough alchemica' };
  }

  ensureTileInventorySlot(recipe.id);
  for (let i = 0; i < qty; i += 1) {
    adjustOffchainInventoryQty(recipe.id, 1);
    setLocalInventory(recipe.id, 'TILE', 1);
  }

  return {
    ok: true,
    message: `Crafted ${qty}× ${recipe.name}`,
    nextBalance: {
      fud: alchemicaBalance.fud - total.fud,
      fomo: alchemicaBalance.fomo - total.fomo,
      alpha: alchemicaBalance.alpha - total.alpha,
      kek: alchemicaBalance.kek - total.kek,
    },
  };
}

export function syncCTileInventoryFromScene(itemId: number): void {
  if (!isCTileItemId(itemId)) return;
  const item = getLocalInventoryItem(itemId, 'TILE');
  setOffchainInventoryQty(itemId, Number(item?.quantity || 0));
}
