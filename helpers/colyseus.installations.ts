import _ from 'lodash';
import Installations from 'components/phaser/Installations';
import { scene } from 'components/controllers/SceneController';
import GlobalState from 'contexts/GlobalState';
import { getParcelDataById } from 'helpers/parcels.helper';
import { getQueueIds } from 'helpers/installations.helper';
import { getContract } from 'web3/contract';
import {
  fetchContractGrid,
  getInstallationIdsbyGrid,
  getUserUpgradeQueue,
} from 'shared_code/utils/shared.utils.installations';
import { PARCELS, PARCELS_BY_ID, PARCELS_BY_TOKEN_ID } from 'shared_code/models/model.realm';

const TILE = 64;
/** How far ahead (in map tiles) to hydrate installation collisions before the player arrives. */
const PRELOAD_RADIUS_TILES = 56;
/** Cap concurrent nearby parcels so Base RPC stays reasonable. */
const PRELOAD_MAX_PARCELS = 16;
/** Re-run preload after the player moves this many tiles. */
const PRELOAD_MOVE_TILES = 12;
const LOAD_BATCH_SIZE = 12;

const loadedParcelIds = new Set<string>();
const failedParcelIds = new Set<string>();
const pendingParcelIds = new Set<string>();
let drainPromise: Promise<void> | null = null;

let lastPreloadTileX: number | null = null;
let lastPreloadTileY: number | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForWeb3(maxMs = 15000): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const network = GlobalState.WEB3?.state?.currentNetwork;
    const provider = GlobalState.WEB3?.state?.globalProvider;
    if (network && provider && scene?.installationGroup) return true;
    await sleep(250);
  }
  return Boolean(
    GlobalState.WEB3?.state?.currentNetwork &&
      GlobalState.WEB3?.state?.globalProvider &&
      scene?.installationGroup,
  );
}

function parcelTokenAndType(parcelId: string): { tokenId: string; type: string } | null {
  if (!parcelId || parcelId.charAt(0) !== 'C') return null;

  const meta = PARCELS_BY_ID[parcelId] as { tokenId?: string | number; type?: string } | undefined;
  const fromOwned = (GlobalState.REALM?.state?.ownedParcels || []).find(
    (p: { parcelId?: string; id?: string; tokenId?: string | number; type?: string }) =>
      p.parcelId === parcelId || p.id === parcelId,
  ) as { tokenId?: string | number; type?: string } | undefined;

  let tokenId = String(meta?.tokenId ?? fromOwned?.tokenId ?? '');
  if (!tokenId || tokenId === 'undefined') {
    const hit = Object.values(PARCELS_BY_TOKEN_ID || {}).find(
      (p: { parcelId?: string }) => p?.parcelId === parcelId,
    ) as { tokenId?: string | number; id?: string | number } | undefined;
    tokenId = String(hit?.tokenId ?? hit?.id ?? '');
  }
  if (!tokenId || tokenId === 'undefined') return null;

  let type = String(meta?.type || fromOwned?.type || '');
  if (!type) {
    try {
      type = String(getParcelDataById(parcelId).type || '');
    } catch {
      return null;
    }
  }
  if (!type) return null;
  return { tokenId, type };
}

async function fetchParcelInstallationIds(parcelId: string): Promise<string[] | null> {
  const info = parcelTokenAndType(parcelId);
  if (!info) return null;

  const network = GlobalState.WEB3.state.currentNetwork;
  const provider = GlobalState.WEB3.state.globalProvider;
  const account = GlobalState.WEB3.state.currentAccount;
  if (!network || !provider) return null;

  const realmDiamond = await getContract(network, provider);
  const installationDiamond = await getContract(network, provider, 'installationDiamond');
  if (!realmDiamond) return null;

  const [installGrid, tileGrid, userUpgradeQueue] = await Promise.all([
    fetchContractGrid(realmDiamond, { type: info.type, tokenId: info.tokenId }, 0),
    fetchContractGrid(realmDiamond, { type: info.type, tokenId: info.tokenId }, 1),
    account && installationDiamond ? getUserUpgradeQueue(installationDiamond, account) : Promise.resolve([]),
  ]);

  // Empty grid is a valid success (parcel has no installs).
  if (installGrid == null && tileGrid == null) return null;

  const queueIds = userUpgradeQueue?.length ? getQueueIds(userUpgradeQueue[0]) : [];
  const installationIds = installGrid ? (await getInstallationIdsbyGrid(parcelId, installGrid, 0, queueIds)) || [] : [];
  const tileIds = tileGrid ? (await getInstallationIdsbyGrid(parcelId, tileGrid, 1)) || [] : [];
  return _.uniq([...installationIds, ...tileIds]);
}

function parcelsNearTile(tileX: number, tileY: number, radius: number): Array<{ id: string; dist2: number }> {
  const out: Array<{ id: string; dist2: number }> = [];
  for (let i = 0; i < PARCELS.length; i++) {
    const parcelId = PARCELS[i].parcelId as string;
    if (!parcelId || parcelId.charAt(0) !== 'C') continue;
    const parts = parcelId.split('-');
    const x = Number(parts[1]);
    const y = Number(parts[2]);
    const dx = x - tileX;
    const dy = y - tileY;
    if (Math.abs(dx) <= radius && Math.abs(dy) <= radius) {
      out.push({ id: parcelId, dist2: dx * dx + dy * dy });
    }
  }
  out.sort((a, b) => a.dist2 - b.dist2);
  return out;
}

async function processParcel(parcelId: string): Promise<void> {
  try {
    const ids = await fetchParcelInstallationIds(parcelId);
    if (ids == null) {
      failedParcelIds.add(parcelId);
      console.warn('colyseusLoadInstallations: failed to fetch grid for', parcelId);
      return;
    }

    loadedParcelIds.add(parcelId);
    failedParcelIds.delete(parcelId);
    if (!ids.length) return;

    const toCreate = ids
      .filter((id) => !scene?.installationGroup?.has(id) && !scene?.installationsWaiting?.has(id))
      .map((id) => ({ id }));
    if (toCreate.length) {
      await Installations.createByIds(toCreate);
      // Solids may appear under the player if they walked onto an empty parcel first.
      void import('helpers/colyseus.client')
        .then((m) => m.colyseusNudgeIfTrapped?.())
        .catch(() => undefined);
    }
  } catch (e) {
    failedParcelIds.add(parcelId);
    console.warn('colyseusLoadInstallations failed for', parcelId, e);
  }
}

function kickDrain(): Promise<void> {
  if (drainPromise) return drainPromise;

  drainPromise = (async () => {
    const ready = await waitForWeb3();
    if (!ready) {
      console.warn('colyseusLoadInstallations: web3/scene not ready');
      pendingParcelIds.forEach((id) => failedParcelIds.add(id));
      pendingParcelIds.clear();
      return;
    }

    while (pendingParcelIds.size) {
      const batch = Array.from(pendingParcelIds).slice(0, LOAD_BATCH_SIZE);
      batch.forEach((id) => pendingParcelIds.delete(id));
      for (const parcelId of batch) {
        await processParcel(parcelId);
      }
    }
  })().finally(() => {
    drainPromise = null;
    if (pendingParcelIds.size) {
      void kickDrain();
    }
  });

  return drainPromise;
}

/** Load contract-grid installations/tiles for parcels (Colyseus has no AOI install msgs). */
export async function colyseusLoadInstallations(parcelIds: string[], opts?: { force?: boolean }): Promise<void> {
  const unique = _.uniq(parcelIds.filter((id) => id && id.charAt(0) === 'C'));
  if (!unique.length) return;

  for (const id of unique) {
    if (opts?.force) {
      loadedParcelIds.delete(id);
      failedParcelIds.delete(id);
      pendingParcelIds.add(id);
      continue;
    }
    if (loadedParcelIds.has(id) && !failedParcelIds.has(id)) continue;
    pendingParcelIds.add(id);
  }

  if (!pendingParcelIds.size) return;
  await kickDrain();
}

/**
 * Prefetch installation collisions for parcels around the player so solids exist
 * before the player steps onto an empty parcel grid.
 */
export function colyseusPreloadNearbyInstallations(
  pixelX: number,
  pixelY: number,
  opts?: { force?: boolean; radiusTiles?: number; maxParcels?: number; prioritize?: string | null },
): void {
  if (!Number.isFinite(pixelX) || !Number.isFinite(pixelY)) return;

  const tileX = Math.floor(pixelX / TILE);
  const tileY = Math.floor(pixelY / TILE);
  const force = Boolean(opts?.force);

  if (
    !force &&
    lastPreloadTileX != null &&
    lastPreloadTileY != null &&
    Math.abs(tileX - lastPreloadTileX) < PRELOAD_MOVE_TILES &&
    Math.abs(tileY - lastPreloadTileY) < PRELOAD_MOVE_TILES
  ) {
    return;
  }

  const radius = opts?.radiusTiles ?? PRELOAD_RADIUS_TILES;
  const maxParcels = opts?.maxParcels ?? PRELOAD_MAX_PARCELS;
  const nearby = parcelsNearTile(tileX, tileY, radius).map((p) => p.id);
  const prioritize = opts?.prioritize || (scene as { lastParcelCollisionId?: string } | null)?.lastParcelCollisionId;
  const ordered = _.uniq([prioritize, ...nearby].filter(Boolean) as string[]).slice(0, maxParcels);

  lastPreloadTileX = tileX;
  lastPreloadTileY = tileY;

  if (!ordered.length) return;
  void colyseusLoadInstallations(ordered);
}

export function colyseusResetInstallationSync(): void {
  loadedParcelIds.clear();
  failedParcelIds.clear();
  pendingParcelIds.clear();
  drainPromise = null;
  lastPreloadTileX = null;
  lastPreloadTileY = null;
}
