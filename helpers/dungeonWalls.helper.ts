/**
 * Interior wall tiles for bazaar / DAO rooms (64×64 frames).
 *
 * Bazaar uses ALTTP Hyrule Castle interior tiles (see art/insidecastle/).
 * DAO keeps Dungeon Gathering Set 1.
 *
 * Frame order must match bazaar_castle_walls.json / dungeon_walls.json.
 */
export const DUNGEON_WALLS_KEY = 'dungeon_walls';
export const DUNGEON_WALLS_PATH = '/animations/tiles/dungeon_walls.png';
export const DUNGEON_WALLS_FRAME = 64;

/** Hyrule Castle interior walls for the bazaar (insidecastle-16grid.aseprite). */
export const BAZAAR_WALLS_KEY = 'bazaar_castle_walls';
export const BAZAAR_WALLS_PATH = '/animations/tiles/bazaar_castle_walls.png';
export const BAZAAR_WALLS_FRAME = 64;

type WallFrameTable = {
  wallN: number;
  wallN2: number;
  wallE: number;
  wallW: number;
  wallS: number;
  wallS2: number;
  corner: number;
  cornerAlt: number;
  door: number;
  window: number;
  fill: number;
  fill2: number;
  fill3: number;
  pillar: number;
  floorA: number;
  floorB: number;
  floorC: number;
};

export const DungeonWallFrame: WallFrameTable = {
  wallN: 0,
  wallN2: 1,
  wallE: 2,
  wallW: 3,
  wallS: 4,
  wallS2: 5,
  /** Corners reuse solid fills (source sheet had empty corner slots). */
  corner: 10,
  cornerAlt: 10,
  door: 8,
  window: 9,
  fill: 10,
  fill2: 11,
  fill3: 12,
  pillar: 13,
  floorA: 14,
  floorB: 15,
  floorC: 16,
};

/** Castle sheet ships real corner blocks, so corners don't fall back to fill. */
export const BazaarWallFrame: WallFrameTable = {
  ...DungeonWallFrame,
  corner: 6,
  cornerAlt: 7,
};

export type InteriorStructureKind = 'floor' | 'wall' | 'door' | 'window';

/** Door = 2 center tiles on south edge; windows = paired openings on north edge. */
export function interiorDoorTx(grid: number): [number, number] {
  const a = Math.floor(grid / 2) - 1;
  return [a, a + 1];
}

export function interiorWindowTx(grid: number): number[] {
  if (grid <= 8) return [1, 2, grid - 3, grid - 2];
  return [2, 3, 4, grid - 5, grid - 4, grid - 3];
}

export function interiorStructureAt(tx: number, ty: number, grid: number): InteriorStructureKind {
  if (tx < 0 || ty < 0 || tx >= grid || ty >= grid) return 'wall';
  const onEdge = tx === 0 || tx === grid - 1 || ty === 0 || ty === grid - 1;
  const door = interiorDoorTx(grid);
  if (ty === grid - 1 && (tx === door[0] || tx === door[1])) return 'door';
  if (ty === 0 && interiorWindowTx(grid).includes(tx)) return 'window';
  if (onEdge) return 'wall';
  return 'floor';
}

export function interiorIsWalkable(tx: number, ty: number, grid: number): boolean {
  const kind = interiorStructureAt(tx, ty, grid);
  return kind === 'floor' || kind === 'door';
}

export function interiorFloorKeys(grid: number): string[] {
  const keys: string[] = [];
  for (let ty = 0; ty < grid; ty += 1) {
    for (let tx = 0; tx < grid; tx += 1) {
      if (interiorStructureAt(tx, ty, grid) === 'floor') keys.push(`${tx},${ty}`);
    }
  }
  return keys;
}

export function interiorTileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * 64 + 32, y: ty * 64 + 32 };
}

function wallFrameFrom(
  frames: WallFrameTable,
  tx: number,
  ty: number,
  kind: InteriorStructureKind,
  grid: number,
): number {
  if (kind === 'door') return frames.door;
  if (kind === 'window') return frames.window;

  const isN = ty === 0;
  const isS = ty === grid - 1;
  const isW = tx === 0;
  const isE = tx === grid - 1;
  const alt = (tx + ty) % 2 === 0;

  if ((isN || isS) && (isW || isE)) return isN ? frames.corner : frames.cornerAlt;

  if (isN) return alt ? frames.wallN : frames.wallN2;
  if (isS) return alt ? frames.wallS : frames.wallS2;
  if (isW) return frames.wallW;
  if (isE) return frames.wallE;
  return frames.fill;
}

/** Directional wall frame for an edge cell (Dungeon Gathering sheet). */
export function wallFrameFor(tx: number, ty: number, kind: InteriorStructureKind, grid: number): number {
  return wallFrameFrom(DungeonWallFrame, tx, ty, kind, grid);
}

/** Directional wall frame for an edge cell (Hyrule Castle bazaar sheet). */
export function bazaarWallFrameFor(
  tx: number,
  ty: number,
  kind: InteriorStructureKind,
  grid: number,
): number {
  return wallFrameFrom(BazaarWallFrame, tx, ty, kind, grid);
}

export function floorFrameFor(tx: number, ty: number): number {
  const i = (tx * 5 + ty * 7) % 3;
  return [DungeonWallFrame.floorA, DungeonWallFrame.floorB, DungeonWallFrame.floorC][i];
}
