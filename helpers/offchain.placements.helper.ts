import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';
import { isLocalOffchainInstallationId } from 'helpers/lodge.helper';
import {
  getOffchainPlacements,
  removeOffchainPlacement as storeRemove,
  upsertOffchainPlacement as storeUpsert,
  writeOffchainPlacements as storeWrite,
} from 'helpers/offchain.store';

/** @deprecated key kept for offline mirror compatibility */
export const OFFCHAIN_PLACEMENTS_KEY = 'gotchiverse.offchain.placements.v1';

export function readOffchainPlacements(parcelId: string): string[] {
  return getOffchainPlacements(parcelId).filter(isLocalOffchainInstallationId);
}

export function writeOffchainPlacements(parcelId: string, ids: string[]) {
  storeWrite(parcelId, ids);
}

export function upsertOffchainPlacement(installationId: string) {
  storeUpsert(installationId);
}

export function removeOffchainPlacement(installationId: string) {
  storeRemove(installationId);
}

export function syncOffchainPlacementsForParcel(parcelId: string, installationIds: string[]) {
  writeOffchainPlacements(parcelId, installationIds);
}

/** Debug / migration helper — not used by gameplay hot paths. */
export function debugOffchainPlacementId(installationId: string): string | null {
  try {
    const data = getInstallationIdDataById(installationId);
    return data?.parcelId || null;
  } catch {
    return null;
  }
}
