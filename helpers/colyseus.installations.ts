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
import { PARCELS_BY_ID, PARCELS_BY_TOKEN_ID } from 'shared_code/models/model.realm';

const loadedParcelIds = new Set<string>();
let loadInflight: Promise<void> | null = null;

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

async function fetchParcelInstallationIds(parcelId: string): Promise<string[]> {
  const info = parcelTokenAndType(parcelId);
  if (!info) return [];

  const network = GlobalState.WEB3.state.currentNetwork;
  const provider = GlobalState.WEB3.state.globalProvider;
  const account = GlobalState.WEB3.state.currentAccount;
  if (!network || !provider) return [];

  const realmDiamond = await getContract(network, provider);
  const installationDiamond = await getContract(network, provider, 'installationDiamond');

  const [installGrid, tileGrid, userUpgradeQueue] = await Promise.all([
    fetchContractGrid(realmDiamond, { type: info.type, tokenId: info.tokenId }, 0),
    fetchContractGrid(realmDiamond, { type: info.type, tokenId: info.tokenId }, 1),
    account ? getUserUpgradeQueue(installationDiamond, account) : Promise.resolve([]),
  ]);

  const queueIds = userUpgradeQueue?.length ? getQueueIds(userUpgradeQueue[0]) : [];
  const installationIds = installGrid ? (await getInstallationIdsbyGrid(parcelId, installGrid, 0, queueIds)) || [] : [];
  const tileIds = tileGrid ? (await getInstallationIdsbyGrid(parcelId, tileGrid, 1)) || [] : [];
  return _.uniq([...installationIds, ...tileIds]);
}

/** Load contract-grid installations/tiles for parcels (Colyseus has no AOI install msgs). */
export async function colyseusLoadInstallations(parcelIds: string[], opts?: { force?: boolean }): Promise<void> {
  const unique = _.uniq(parcelIds.filter((id) => id && id.charAt(0) === 'C'));
  const todo = opts?.force ? unique : unique.filter((id) => !loadedParcelIds.has(id));
  if (!todo.length) return;

  if (loadInflight) await loadInflight;

  loadInflight = (async () => {
    // Cap per call to keep Base RPC load reasonable for MVP.
    const batch = todo.slice(0, 12);
    for (const parcelId of batch) {
      try {
        const ids = await fetchParcelInstallationIds(parcelId);
        loadedParcelIds.add(parcelId);
        if (!ids.length) continue;

        const toCreate = ids
          .filter((id) => !scene?.installationGroup?.has(id) && !scene?.installationsWaiting?.has(id))
          .map((id) => ({ id }));
        if (toCreate.length) {
          Installations.createByIds(toCreate);
        }
      } catch (e) {
        console.warn('colyseusLoadInstallations failed for', parcelId, e);
      }
    }
  })();

  try {
    await loadInflight;
  } finally {
    loadInflight = null;
  }
}

export function colyseusResetInstallationSync(): void {
  loadedParcelIds.clear();
  loadInflight = null;
}
