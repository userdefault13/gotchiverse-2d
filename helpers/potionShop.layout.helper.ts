/**
 * Soft-launch Potion Shop interior — same 16×16 shell as Store; furniture/art later.
 * Reuses store structure (walls / door / windows / floor keys).
 */
import {
  STORE_GRID,
  STORE_SPAWN_TX,
  STORE_SPAWN_TY,
  buildRandomFloorMap,
  floorKey,
  storeInteriorFloorKeys,
  storeIsWalkable,
  storeStructureAt,
  storeTileCenter,
  type StoreFloorMap,
  type StoreStructureKind,
} from './store.layout.helper';

export const POTION_SHOP_GRID = STORE_GRID;
export const POTION_SHOP_SPAWN_TX = STORE_SPAWN_TX;
export const POTION_SHOP_SPAWN_TY = STORE_SPAWN_TY;
export const POTION_SHOP_LAYOUT_KEY = 'gotchiverse.potion_shop.layout.v1';

export type PotionShopLayout = {
  potionShopId: string;
  floor?: StoreFloorMap;
  updatedAt: number;
};

export type { StoreFloorMap, StoreStructureKind };

export {
  floorKey,
  storeInteriorFloorKeys as potionShopInteriorFloorKeys,
  storeIsWalkable as potionShopIsWalkable,
  storeStructureAt as potionShopStructureAt,
  storeTileCenter as potionShopTileCenter,
  buildRandomFloorMap,
};

function withFloor(layout: PotionShopLayout): PotionShopLayout {
  if (layout.floor && Object.keys(layout.floor).length > 0) return layout;
  return { ...layout, floor: buildRandomFloorMap(storeInteriorFloorKeys()) };
}

function emptyLayout(potionShopId: string): PotionShopLayout {
  return withFloor({
    potionShopId,
    floor: {},
    updatedAt: Date.now(),
  });
}

export function ensurePotionShopFloor(layout: PotionShopLayout): PotionShopLayout {
  return withFloor(layout);
}

export function loadPotionShopLayout(potionShopId: string): PotionShopLayout {
  if (typeof localStorage === 'undefined') return emptyLayout(potionShopId);
  try {
    const raw = localStorage.getItem(POTION_SHOP_LAYOUT_KEY);
    if (!raw) return emptyLayout(potionShopId);
    const all = JSON.parse(raw) as Record<string, PotionShopLayout>;
    const hit = all?.[potionShopId];
    if (!hit || typeof hit !== 'object') return emptyLayout(potionShopId);
    return withFloor({
      potionShopId,
      floor: hit.floor || {},
      updatedAt: Number(hit.updatedAt) || Date.now(),
    });
  } catch {
    return emptyLayout(potionShopId);
  }
}

export function savePotionShopLayout(layout: PotionShopLayout): PotionShopLayout {
  const next = { ...layout, updatedAt: Date.now() };
  if (typeof localStorage === 'undefined') return next;
  try {
    const raw = localStorage.getItem(POTION_SHOP_LAYOUT_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, PotionShopLayout>) : {};
    all[layout.potionShopId] = next;
    localStorage.setItem(POTION_SHOP_LAYOUT_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  return next;
}

export function serializePotionShopLayout(layout: PotionShopLayout): string {
  return JSON.stringify(layout);
}

export function parsePotionShopLayoutJson(raw: string | undefined | null, potionShopId: string): PotionShopLayout {
  if (!raw) return emptyLayout(potionShopId);
  try {
    const parsed = JSON.parse(raw) as PotionShopLayout;
    return withFloor({
      potionShopId,
      floor: parsed?.floor || {},
      updatedAt: Number(parsed?.updatedAt) || Date.now(),
    });
  } catch {
    return emptyLayout(potionShopId);
  }
}
