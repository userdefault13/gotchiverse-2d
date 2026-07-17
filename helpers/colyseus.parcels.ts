import _ from 'lodash';
import Parcels from 'components/phaser/Parcels';
import { scene } from 'components/controllers/SceneController';
import GlobalState from 'contexts/GlobalState';
import { PARCELS, PARCELS_BY_ID } from 'shared_code/models/model.realm';
import { getActiveParcelCollision } from 'helpers/installations.helper';
import { getParcelDataById, getParcelSpawnPixels } from 'helpers/parcels.helper';
import { Parcel } from 'types';

const TILE = 64;
/** Rough half-width of AOI in map tiles (~AOI size for MVP client seed). */
const AOI_RADIUS_TILES = 280;
const RESYNC_MOVE_TILES = 96;

let lastSeedTileX: number | null = null;
let lastSeedTileY: number | null = null;
let lastCollisionParcelId: string | undefined;

function ownedParcelIds(): string[] {
  const owned = GlobalState.REALM?.state?.ownedParcels || [];
  return _.compact(
    owned.map((p: { parcelId?: string; id?: string }) => {
      const id = p.parcelId || p.id;
      return id && String(id).charAt(0) === 'C' ? String(id) : undefined;
    }),
  );
}

function parcelsNearTile(tileX: number, tileY: number, radius: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < PARCELS.length; i++) {
    const parcelId = PARCELS[i].parcelId as string;
    if (!parcelId || parcelId.charAt(0) !== 'C') continue;
    const parts = parcelId.split('-');
    const x = Number(parts[1]);
    const y = Number(parts[2]);
    if (Math.abs(x - tileX) <= radius && Math.abs(y - tileY) <= radius) {
      ids.push(parcelId);
    }
  }
  return ids;
}

/** Seed / refresh parcel grids around a world pixel position (Colyseus has no AOI parcel msgs). */
export function colyseusSeedParcels(pixelX: number, pixelY: number, force = false): void {
  if (!scene?.spawnedParcelsByIdMap) return;
  const tileX = Math.floor(pixelX / TILE);
  const tileY = Math.floor(pixelY / TILE);

  if (
    !force &&
    lastSeedTileX != null &&
    lastSeedTileY != null &&
    Math.abs(tileX - lastSeedTileX) < RESYNC_MOVE_TILES &&
    Math.abs(tileY - lastSeedTileY) < RESYNC_MOVE_TILES
  ) {
    return;
  }

  const ownedIds = ownedParcelIds();
  const nearbyIds = parcelsNearTile(tileX, tileY, AOI_RADIUS_TILES);
  const keep = new Set<string>([...ownedIds, ...nearbyIds]);

  const toDestroy: Array<{ id: string }> = [];
  scene.spawnedParcelsByIdMap.forEach((_grid, id: string) => {
    if (!keep.has(id)) toDestroy.push({ id });
  });
  if (toDestroy.length) Parcels.destroy(toDestroy);

  Parcels.create(Array.from(keep).map((id) => ({ id })));
  lastSeedTileX = tileX;
  lastSeedTileY = tileY;
}

/** Resolve current parcel under the player and update REALM + scene collision id. */
export function colyseusUpdateCurrentParcel(pixelX: number, pixelY: number): void {
  if (!scene) return;

  const owned = (GlobalState.REALM?.state?.ownedParcels || []) as Parcel[];
  let hit = getActiveParcelCollision(owned, { x: pixelX, y: pixelY }, { width: TILE, height: TILE });

  if (!hit && scene.spawnedParcelsByIdMap) {
    for (const id of scene.spawnedParcelsByIdMap.keys()) {
      try {
        const data = getParcelDataById(id);
        if (
          data.bounds.x <= pixelX &&
          data.bounds.y <= pixelY &&
          data.bounds.xMax >= pixelX &&
          data.bounds.yMax >= pixelY
        ) {
          hit = data;
          break;
        }
      } catch {
        /* ignore bad ids */
      }
    }
  }

  const parcelId = hit?.id;
  if (parcelId === lastCollisionParcelId) return;
  lastCollisionParcelId = parcelId;

  let currentParcel = null;
  if (parcelId && PARCELS_BY_ID[parcelId]) {
    currentParcel = _.pick(PARCELS_BY_ID[parcelId], ['tokenId', 'parcelHash', 'owner']);
    const ownedMatch = owned.find((p) => p.parcelId === parcelId || p.id === parcelId) as Parcel & { owner?: string };
    if (ownedMatch?.owner) _.assign(currentParcel, { owner: ownedMatch.owner });
  }

  GlobalState.REALM.dispatch({ type: 'UPDATE_CURRENT_PARCEL', currentParcel });
  scene.lastParcelCollisionId = parcelId;
}

export function colyseusResetParcelSync(): void {
  lastSeedTileX = null;
  lastSeedTileY = null;
  lastCollisionParcelId = undefined;
}

export function colyseusSpawnFromSelectedParcel(spawnLocId?: string): { x: number; y: number } | null {
  return getParcelSpawnPixels(spawnLocId || '');
}
