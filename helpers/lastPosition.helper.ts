/**
 * Client-side memory of where each gotchi last stood in the citaadel.
 *
 * "Use Last position" joins the Colyseus citaadel room without a spawnLocId, and
 * that room spawns joiners inside a fixed random band (tiles 42–62 × 52–72 —
 * hood 1,1 / District 43) with no per-gotchi history. Persisting the walked
 * position here lets the client snap back during the room's post-join grace
 * window instead of landing in District 43 every time.
 */
import { CITAADEL_HEIGHT, CITAADEL_WIDTH, TILE_SIZE } from 'shared_code/constants/const.game';

const STORAGE_KEY = 'gotchiverse.lastCitaadelPos';
/** Writing on every movement tick would thrash localStorage. */
const WRITE_THROTTLE_MS = 2000;

type StoredPosition = { x: number; y: number; t: number };
type StoredMap = Record<string, StoredPosition>;

const lastWriteAt = new Map<string, number>();

function isUsablePosition(x: unknown, y: unknown): boolean {
  if (typeof x !== 'number' || typeof y !== 'number') return false;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  // The spawn helpers treat 0,0 as "unset", and the map edges are wall collisions.
  if (x < TILE_SIZE || y < TILE_SIZE) return false;
  return x <= CITAADEL_WIDTH - TILE_SIZE && y <= CITAADEL_HEIGHT - TILE_SIZE;
}

function readMap(): StoredMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StoredMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: StoredMap): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode — last position is best-effort */
  }
}

export function saveLastCitaadelPosition(gotchiId: string | number, x: number, y: number): void {
  const id = String(gotchiId || '');
  if (!id || !isUsablePosition(x, y)) return;

  const now = Date.now();
  if (now - (lastWriteAt.get(id) || 0) < WRITE_THROTTLE_MS) return;
  lastWriteAt.set(id, now);

  const map = readMap();
  map[id] = { x: Math.round(x), y: Math.round(y), t: now };
  writeMap(map);
}

export function loadLastCitaadelPosition(gotchiId: string | number): { x: number; y: number } | null {
  const id = String(gotchiId || '');
  if (!id) return null;
  const entry = readMap()[id];
  if (!entry || !isUsablePosition(entry.x, entry.y)) return null;
  return { x: Math.round(entry.x), y: Math.round(entry.y) };
}