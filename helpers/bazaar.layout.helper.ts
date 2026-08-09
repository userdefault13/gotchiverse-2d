/**
 * Soft-launch Bazaar interior — 8×8 to match world tent / parcel footprint.
 * Walls painted with ALTTP Hyrule Castle interior tiles.
 */
import {
  buildRandomFloorMap,
  floorKey,
  type StoreFloorMap,
  type StoreStructureKind,
} from './store.layout.helper';
import {
  bazaarWallFrameFor,
  floorFrameFor,
  interiorDoorTx,
  interiorFloorKeys,
  interiorIsWalkable,
  interiorStructureAt,
  interiorTileCenter,
} from './dungeonWalls.helper';

/** Matches objects.json tent footprint (8×8) / humble parcel size. */
export const BAZAAR_GRID = 8;
export const BAZAAR_DOOR_TX = interiorDoorTx(BAZAAR_GRID);
export const BAZAAR_SPAWN_TX = BAZAAR_DOOR_TX[0];
export const BAZAAR_SPAWN_TY = BAZAAR_GRID - 2;
export const BAZAAR_LAYOUT_KEY = 'gotchiverse.bazaar.layout.v2';

export type BazaarLayout = {
  bazaarId: string;
  floor?: StoreFloorMap;
  updatedAt: number;
};

export type { StoreFloorMap, StoreStructureKind };

export {
  floorKey,
  bazaarWallFrameFor,
  floorFrameFor as bazaarFloorFrameFor,
};

export function bazaarStructureAt(tx: number, ty: number): StoreStructureKind {
  return interiorStructureAt(tx, ty, BAZAAR_GRID);
}

export function bazaarIsWalkable(tx: number, ty: number): boolean {
  return interiorIsWalkable(tx, ty, BAZAAR_GRID);
}

export function bazaarInteriorFloorKeys(): string[] {
  return interiorFloorKeys(BAZAAR_GRID);
}

export function bazaarTileCenter(tx: number, ty: number): { x: number; y: number } {
  return interiorTileCenter(tx, ty);
}

export { buildRandomFloorMap };

function withFloor(layout: BazaarLayout): BazaarLayout {
  if (layout.floor && Object.keys(layout.floor).length > 0) return layout;
  return { ...layout, floor: buildRandomFloorMap(bazaarInteriorFloorKeys()) };
}

function emptyLayout(bazaarId: string): BazaarLayout {
  return withFloor({
    bazaarId,
    floor: {},
    updatedAt: Date.now(),
  });
}

export function ensureBazaarFloor(layout: BazaarLayout): BazaarLayout {
  return withFloor(layout);
}

export function loadBazaarLayout(bazaarId: string): BazaarLayout {
  if (typeof localStorage === 'undefined') return emptyLayout(bazaarId);
  try {
    const raw = localStorage.getItem(BAZAAR_LAYOUT_KEY);
    if (!raw) return emptyLayout(bazaarId);
    const all = JSON.parse(raw) as Record<string, BazaarLayout>;
    const hit = all?.[bazaarId];
    if (!hit || typeof hit !== 'object') return emptyLayout(bazaarId);
    return withFloor({
      bazaarId,
      floor: hit.floor || {},
      updatedAt: Number(hit.updatedAt) || Date.now(),
    });
  } catch {
    return emptyLayout(bazaarId);
  }
}

export function saveBazaarLayout(layout: BazaarLayout): BazaarLayout {
  const next = { ...layout, updatedAt: Date.now() };
  if (typeof localStorage === 'undefined') return next;
  try {
    const raw = localStorage.getItem(BAZAAR_LAYOUT_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, BazaarLayout>) : {};
    all[layout.bazaarId] = next;
    localStorage.setItem(BAZAAR_LAYOUT_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  return next;
}

export function serializeBazaarLayout(layout: BazaarLayout): string {
  return JSON.stringify(layout);
}

export function parseBazaarLayoutJson(raw: string | undefined | null, bazaarId: string): BazaarLayout {
  if (!raw) return emptyLayout(bazaarId);
  try {
    const parsed = JSON.parse(raw) as BazaarLayout;
    return withFloor({
      bazaarId,
      floor: parsed?.floor || {},
      updatedAt: Number(parsed?.updatedAt) || Date.now(),
    });
  } catch {
    return emptyLayout(bazaarId);
  }
}
