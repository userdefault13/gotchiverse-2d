import { TILE_SIZE } from 'shared_code/constants/const.game';

/** Circus tent / DAO / potion objects in objects.json (matches parseCollisionsFile). */
export const WORLD_ROOM_OBJECT_TYPES = ['tent', 'dao_office', 'potion_shop'] as const;
export type WorldRoomObjectType = (typeof WORLD_ROOM_OBJECT_TYPES)[number];

export type WorldRoomObject = {
  type?: string;
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
};

/**
 * Original `spawnLandsWip` placement (animationsController):
 *   sprite((x - 2) * 64, (y - 2.8) * 64).setOrigin(0, 0.5)
 * land_wip frames are 768×768.
 */
export const LAND_WIP_ORIGIN_OFFSET_TILES = { x: 2, y: 2.8 } as const;
export const LAND_WIP_FRAME_PX = 768;
/** land_wip art is 12×12 tiles; walk/click collider is 2 tiles smaller (10×10). */
export const LAND_WIP_COLLISION_TILES = 10;
export const LAND_WIP_COLLISION_PX = LAND_WIP_COLLISION_TILES * TILE_SIZE;

/**
 * Top-left / left-middle anchor for land_wip (origin 0, 0.5) — matches classic circus WIP.
 */
export function getLandWipPixelAnchor(
  obj: WorldRoomObject,
): { x: number; y: number } | null {
  const px = Number(obj?.position?.x);
  const py = Number(obj?.position?.y);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
  return {
    x: (px - LAND_WIP_ORIGIN_OFFSET_TILES.x) * TILE_SIZE,
    y: (py - LAND_WIP_ORIGIN_OFFSET_TILES.y) * TILE_SIZE,
  };
}

/**
 * Visual center of the WIP circus tent (for minimap markers + interact radius).
 */
export function getLandWipPixelCenter(
  obj: WorldRoomObject,
): { x: number; y: number; width: number; height: number } | null {
  const anchor = getLandWipPixelAnchor(obj);
  if (!anchor) return null;
  const width = Math.max(1, Number(obj?.dimensions?.width) || 8);
  const height = Math.max(1, Number(obj?.dimensions?.height) || 8);
  return {
    // origin (0, 0.5) → center is half frame to the right of anchor, same Y
    x: anchor.x + LAND_WIP_FRAME_PX / 2,
    y: anchor.y,
    width,
    height,
  };
}

/**
 * Collision-box center (parseCollisionsFile tent family: offset.y = 7).
 * Prefer `getLandWipPixelCenter` for visuals/markers.
 */
export function getWorldRoomPixelCenter(
  obj: WorldRoomObject,
): { x: number; y: number; width: number; height: number } | null {
  const px = Number(obj?.position?.x);
  const py = Number(obj?.position?.y);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;

  const width = Math.max(1, Number(obj?.dimensions?.width) || 8);
  const height = Math.max(1, Number(obj?.dimensions?.height) || 8);
  const offsetY =
    obj.type === 'tent' || obj.type === 'dao_office' || obj.type === 'potion_shop' ? 7 : 0;

  return {
    x: px * TILE_SIZE + (width * TILE_SIZE) / 2,
    y: (py - offsetY) * TILE_SIZE + (height * TILE_SIZE) / 2,
    width,
    height,
  };
}

export function isWorldRoomObjectType(type: string | undefined): type is WorldRoomObjectType {
  return (WORLD_ROOM_OBJECT_TYPES as readonly string[]).includes(String(type || ''));
}
