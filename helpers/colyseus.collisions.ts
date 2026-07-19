import { scene } from 'components/controllers/SceneController';
import { GOTCHI_SIZE, TILE_SIZE } from 'shared_code/constants/const.game';
import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';
import aarenaBlocksJSON from 'shared_code/data/maps/aarena/collisions/blocks.json';
import aarenaHazardBlocksJSON from 'shared_code/data/maps/aarena/collisions/hazardBlocks.json';
import { isColyseusAarenaMap } from 'helpers/colyseus.map';

type Rect = { left: number; top: number; right: number; bottom: number };

type CollisionBlock = {
  type?: string;
  position?: { x?: number; y?: number };
  dimensions?: { width?: number; height?: number };
};

function playerRect(x: number, y: number): Rect {
  const halfW = GOTCHI_SIZE.WIDTH / 2;
  const halfH = GOTCHI_SIZE.HEIGHT / 2;
  return {
    left: x - halfW,
    top: y - halfH,
    right: x + halfW,
    bottom: y + halfH,
  };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Solid installation AABBs from the live Phaser installationGroup.
 * Tiles are walkable floor art and are skipped.
 */
function installationBlockers(): Rect[] {
  const group = scene?.installationGroup as
    | Map<string, { x?: number; y?: number; width?: number; height?: number }>
    | undefined;
  if (!group?.size) return [];

  const out: Rect[] = [];
  const inset = 4; // keep adjacent tile walking from feeling sticky

  group.forEach((container, id) => {
    try {
      const meta = getInstallationIdDataById(id);
      if (!meta || meta.type === 'TILE') return;
      if (!container || typeof container.x !== 'number' || typeof container.y !== 'number') return;

      const width = Number(container.width) || GOTCHI_SIZE.UNIT;
      const height = Number(container.height) || GOTCHI_SIZE.UNIT;
      if (width <= inset * 2 || height <= inset * 2) return;

      out.push({
        left: container.x - width / 2 + inset,
        top: container.y - height / 2 + inset,
        right: container.x + width / 2 - inset,
        bottom: container.y + height / 2 - inset,
      });
    } catch {
      /* ignore malformed installation ids */
    }
  });

  return out;
}

/** Match shared_code parseCollisionsFile tile → pixel AABB (center-based). */
function tileBlockToRect(block: CollisionBlock): Rect | null {
  const x = Number(block?.position?.x);
  const y = Number(block?.position?.y);
  const w = Number(block?.dimensions?.width);
  const h = Number(block?.dimensions?.height);
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;

  const inset = 2;
  const px = x * TILE_SIZE;
  const py = y * TILE_SIZE;
  const width = w * TILE_SIZE;
  const height = h * TILE_SIZE;
  return {
    left: px + inset,
    top: py + inset,
    right: px + width - inset,
    bottom: py + height - inset,
  };
}

let aarenaBlockersCache: Rect[] | null = null;

function aarenaStaticBlockers(): Rect[] {
  if (aarenaBlockersCache) return aarenaBlockersCache;

  const sources = [
    ...(Array.isArray(aarenaBlocksJSON) ? aarenaBlocksJSON : []),
    ...(Array.isArray(aarenaHazardBlocksJSON) ? aarenaHazardBlocksJSON : []),
  ] as CollisionBlock[];

  aarenaBlockersCache = sources.map(tileBlockToRect).filter((r): r is Rect => Boolean(r));
  return aarenaBlockersCache;
}

function collectBlockers(): Rect[] {
  if (isColyseusAarenaMap()) {
    return aarenaStaticBlockers();
  }
  return installationBlockers();
}

function isBlocked(x: number, y: number, blockers: Rect[]): boolean {
  const player = playerRect(x, y);
  return blockers.some((blocker) => overlaps(player, blocker));
}

/**
 * Resolve a proposed Colyseus move against solid installations (citaadel)
 * or static aarena wall/block AABBs.
 * Supports simple axis sliding so players can walk along walls.
 */
export function resolveColyseusMove(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): { x: number; y: number; blocked: boolean } {
  const blockers = collectBlockers();
  if (!blockers.length) {
    return { x: toX, y: toY, blocked: false };
  }

  if (!isBlocked(toX, toY, blockers)) {
    return { x: toX, y: toY, blocked: false };
  }

  const canX = !isBlocked(toX, fromY, blockers);
  const canY = !isBlocked(fromX, toY, blockers);

  if (canX && !canY) return { x: toX, y: fromY, blocked: false };
  if (canY && !canX) return { x: fromX, y: toY, blocked: false };
  if (canX && canY) {
    if (Math.abs(toX - fromX) >= Math.abs(toY - fromY)) {
      return { x: toX, y: fromY, blocked: false };
    }
    return { x: fromX, y: toY, blocked: false };
  }

  return { x: fromX, y: fromY, blocked: true };
}
