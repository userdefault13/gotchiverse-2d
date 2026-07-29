import { InstallationIdData } from 'types';
import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';

/** Official Bounce Gate itemId (installationType 8). Soft-launch places locally like Store. */
export const BOUNCE_GATE_ITEM_ID = 145;
export const BOUNCE_GATE_INSTALLATION_TYPE = 8;

export function isBounceGateItemId(itemId: number | string): boolean {
  return Number(itemId) === BOUNCE_GATE_ITEM_ID;
}

export function isBounceGateInstallationType(installationType: number | string | undefined): boolean {
  return Number(installationType) === BOUNCE_GATE_INSTALLATION_TYPE;
}

export function isBounceGateInstallationId(id: string): boolean {
  try {
    const data = getInstallationIdDataById(id) as unknown as InstallationIdData;
    return data?.type === 'INSTALLATION' && isBounceGateItemId(data.itemId);
  } catch {
    return false;
  }
}
