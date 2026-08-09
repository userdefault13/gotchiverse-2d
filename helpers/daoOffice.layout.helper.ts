/**
 * Soft-launch DAO Office interior — 8×8 to match world tent / parcel footprint.
 * Walls painted with Dungeon Gathering Set 1 tiles.
 */
import {
  buildRandomFloorMap,
  floorKey,
  type StoreFloorMap,
  type StoreStructureKind,
} from './store.layout.helper';
import {
  floorFrameFor,
  interiorDoorTx,
  interiorFloorKeys,
  interiorIsWalkable,
  interiorStructureAt,
  interiorTileCenter,
  wallFrameFor,
} from './dungeonWalls.helper';

/** Matches objects.json tent footprint (8×8) / humble parcel size. */
export const DAO_OFFICE_GRID = 8;
export const DAO_OFFICE_DOOR_TX = interiorDoorTx(DAO_OFFICE_GRID);
export const DAO_OFFICE_SPAWN_TX = DAO_OFFICE_DOOR_TX[0];
export const DAO_OFFICE_SPAWN_TY = DAO_OFFICE_GRID - 2;
export const DAO_OFFICE_LAYOUT_KEY = 'gotchiverse.dao_office.layout.v2';

export type DaoOfficeLayout = {
  daoOfficeId: string;
  floor?: StoreFloorMap;
  updatedAt: number;
};

export type { StoreFloorMap, StoreStructureKind };

export {
  floorKey,
  floorFrameFor as daoOfficeFloorFrameFor,
  wallFrameFor as daoOfficeWallFrameFor,
};

export function daoOfficeStructureAt(tx: number, ty: number): StoreStructureKind {
  return interiorStructureAt(tx, ty, DAO_OFFICE_GRID);
}

export function daoOfficeIsWalkable(tx: number, ty: number): boolean {
  return interiorIsWalkable(tx, ty, DAO_OFFICE_GRID);
}

export function daoOfficeInteriorFloorKeys(): string[] {
  return interiorFloorKeys(DAO_OFFICE_GRID);
}

export function daoOfficeTileCenter(tx: number, ty: number): { x: number; y: number } {
  return interiorTileCenter(tx, ty);
}

export { buildRandomFloorMap };

function withFloor(layout: DaoOfficeLayout): DaoOfficeLayout {
  if (layout.floor && Object.keys(layout.floor).length > 0) return layout;
  return { ...layout, floor: buildRandomFloorMap(daoOfficeInteriorFloorKeys()) };
}

function emptyLayout(daoOfficeId: string): DaoOfficeLayout {
  return withFloor({
    daoOfficeId,
    floor: {},
    updatedAt: Date.now(),
  });
}

export function ensureDaoOfficeFloor(layout: DaoOfficeLayout): DaoOfficeLayout {
  return withFloor(layout);
}

export function loadDaoOfficeLayout(daoOfficeId: string): DaoOfficeLayout {
  if (typeof localStorage === 'undefined') return emptyLayout(daoOfficeId);
  try {
    const raw = localStorage.getItem(DAO_OFFICE_LAYOUT_KEY);
    if (!raw) return emptyLayout(daoOfficeId);
    const all = JSON.parse(raw) as Record<string, DaoOfficeLayout>;
    const hit = all?.[daoOfficeId];
    if (!hit || typeof hit !== 'object') return emptyLayout(daoOfficeId);
    return withFloor({
      daoOfficeId,
      floor: hit.floor || {},
      updatedAt: Number(hit.updatedAt) || Date.now(),
    });
  } catch {
    return emptyLayout(daoOfficeId);
  }
}

export function saveDaoOfficeLayout(layout: DaoOfficeLayout): DaoOfficeLayout {
  const next = { ...layout, updatedAt: Date.now() };
  if (typeof localStorage === 'undefined') return next;
  try {
    const raw = localStorage.getItem(DAO_OFFICE_LAYOUT_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, DaoOfficeLayout>) : {};
    all[layout.daoOfficeId] = next;
    localStorage.setItem(DAO_OFFICE_LAYOUT_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  return next;
}

export function serializeDaoOfficeLayout(layout: DaoOfficeLayout): string {
  return JSON.stringify(layout);
}

export function parseDaoOfficeLayoutJson(raw: string | undefined | null, daoOfficeId: string): DaoOfficeLayout {
  if (!raw) return emptyLayout(daoOfficeId);
  try {
    const parsed = JSON.parse(raw) as DaoOfficeLayout;
    return withFloor({
      daoOfficeId,
      floor: parsed?.floor || {},
      updatedAt: Number(parsed?.updatedAt) || Date.now(),
    });
  } catch {
    return emptyLayout(daoOfficeId);
  }
}
