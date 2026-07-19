/* eslint-disable @typescript-eslint/indent */
import GlobalState from 'contexts/GlobalState';
// const districts = require("../data/districts.json");

import { BigNumber, ethers, providers, Signer } from 'ethers';
import { Provider } from '@ethersproject/providers';
// import parcelsMetadata from 'shared_code/data/parcels.json';
import {
  ContractParcel,
  ChannelData,
  GotchiverseParcel,
  InstallationsBalancesWithTypes,
  NetworkNames,
  Parcel,
  UpgradeInstallationContract,
  Vector2,
  Tuple,
  JsonParcel,
  SurveyParcel,
  SpeedupUpgradeContract,
  EquipUnequipContract,
  MoveContract,
  BatchEquipContract,
  ParcelAccessRights,
  ParcelAccessTypes,
  ParcelAccessRightsWhitelists,
  OwnedStatus,
  SortOption,
} from 'types';
import { getContract } from 'web3/contract';
import { fetchParcelImageData, fetchChannelSigniture, fetchUpgrade, fetchEquipSigniture, fetchSpeedup } from './api.helpers';
import _ from 'lodash';

import { gasPriceDict } from 'web3/web3';
import { PARCELS_BY_TOKEN_ID } from 'shared_code/models/model.realm';
import { getParcelLastChanneled, getUsersParcels } from 'web3/subgraph/queries';
import { useSubgraph } from 'web3/subgraph';
import SFXController from 'components/controllers/SFXController';
import installationTypes from 'shared_code/data/installations.json';
import { getConvertedBatchEquipData, getSelectedGotchiId, getTypeByItemId } from './installations.helper';
import { getInstallationDataById } from 'shared_code/utils/shared.utils.parcel';
import { whitelistQueryByIds } from 'web3/graphQueries';
import { scene } from 'components/controllers/SceneController';
import { gotchiverseSubgraph } from 'shared_code/web3/shared.const.web3';
import { formatDigit } from './functions';
import { getInstallationTypeById } from 'shared_code/utils/shared.utils.installations';

const GOTCHI = 64;
const HOOD_SIZE = 1056;

export const transformParcelFormat = (parcels: GotchiverseParcel[]): Parcel[] => {
  return _.compact(
    _.map(parcels, (parcel) => {
      const tokenId = String(parcel.tokenId ?? parcel.id ?? '');
      const meta = PARCELS_BY_TOKEN_ID[tokenId] || PARCELS_BY_TOKEN_ID[Number(tokenId)];
      const parcelId =
        parcel.parcelId && String(parcel.parcelId).charAt(0) === 'C'
          ? String(parcel.parcelId)
          : meta?.parcelId;
      if (!parcelId) return null;
      const parcelData: Parcel = getParcelDataById(parcelId);
      return _.assign({}, parcel, { parcelId }, parcelData) as Parcel;
    }),
  );
};

export function getParcelDataById(id: string): Parcel {
  const split = id.split('-');
  const { width, height } = getTileSizeByTypeId(split[3]);
  const x = Number(id.split('-')[1]);
  const y = Number(id.split('-')[2]);
  const bounds = getBoundsByParcelData({ x, y, width, height });
  const region = split[0] === 'C' ? 'Citaadel' : 'Citaadel'; // tbc
  return {
    id,
    region,
    position: { x, y },
    bounds,
    size: { width, height },
    type: getTypeByTypeId(split[3]),
  };
}

export function getParcelPositionById(id: string): Vector2 {
  const split = id.split('-');
  return { x: Number(split[1]), y: Number(split[2]) };
}

function getBoundsByParcelData(parcelData) {
  let { x, y, width, height } = parcelData;
  x *= GOTCHI;
  y *= GOTCHI;
  const xMax = x + width * GOTCHI;
  const yMax = y + height * GOTCHI;
  return { x, y, xMax, yMax };
}

export function getTileSizeByTypeId(typeId: string) {
  let width;
  let height;
  switch (typeId) {
    case 'H':
      width = 8;
      height = 8;
      break;
    case 'R':
      width = 16;
      height = 16;
      break;
    case 'P':
      width = 64;
      height = 64;
      break;
    case 'G':
      width = 64;
      height = 64;
      break;
    case 'U':
      width = 64;
      height = 32;
      break;
    case 'V':
      width = 32;
      height = 64;
      break;
    default:
      break;
  }
  return {
    width,
    height,
  };
}

export function getTypeByTypeId(typeId: string): string {
  let type;
  switch (typeId) {
    case 'H':
      type = 'humble';
      break;
    case 'R':
      type = 'reasonable';
      break;
    case 'P':
      type = 'paartner';
      break;
    case 'G':
      type = 'guardian';
      break;
    case 'U':
      type = 'spaciousHorizontal';
      break;
    case 'V':
      type = 'spaciousVertical';
      break;
    default:
      break;
  }
  return type;
}

interface FudResults {
  fud: number;
  fomo: number;
  alpha: number;
  kek: number;
}

export function calculateChannellingResults({ altarId, playerId }: { altarId?: string; playerId?: string }): FudResults {
  const typeById = getInstallationTypeById(altarId);
  const userAavegotchisById = _.keyBy(GlobalState.USER.state.userAavegotchis, 'id');
  const { kinship } = userAavegotchisById[playerId];

  // The formula is sqrt(kinship/50)*20 for the FUD amount
  // (ex: kin=50 => 20 FUD ; kin=450 => 60 FUD).
  // Then you remove the spillover depending on the Aaltar level (spillover values in the recipe book).
  // For FOMO you divide by 2, for ALPHA divide by 4, for KEK divide by 10.
  const fud = Math.sqrt(Number(kinship) * 0.02) * 20;
  const fomo = fud * 0.5;
  const alpha = fud * 0.25;
  const kek = fud * 0.1;
  const spillover = typeById.spillRate * 0.0001;

  const fudSpill = fud * spillover;
  const fomoSpill = fomo * spillover;
  const alphaSpill = alpha * spillover;
  const kekSpill = kek * spillover;

  const fudResult = Number(fud - fudSpill);
  const fomoResult = Number(fomo - fomoSpill);
  const alphaResult = Number(alpha - alphaSpill);
  const kekResult = Number(kek - kekSpill);

  return { fud: fudResult, fomo: fomoResult, alpha: alphaResult, kek: kekResult };
}

export function getParcelTypeById(id) {
  const split = id.split('-');
  return getTypeByTypeId(split[3]);
}

export function getParcelIdData(id: string) {
  const split = id.split('-');
  return { area: split[0], x: split[1], y: split[2], typeId: split[3] };
}

export function getHoodPositionById(id: string): Vector2 {
  const { x, y } = getParcelPositionById(id);
  const hoodX = Math.ceil(x / HOOD_SIZE);
  const hoodY = Math.ceil(y / HOOD_SIZE);
  return { x: hoodX, y: hoodY };
}

const PARCEL_SUBGRAPH_NETWORKS: NetworkNames[] = ['matic', 'base'];

const parcelOwnerAddress = (owner: GotchiverseParcel['owner'] | { id?: string } | undefined): string | undefined => {
  if (!owner) return undefined;
  if (typeof owner === 'string') return owner;
  if (typeof owner === 'object' && 'id' in owner && typeof owner.id === 'string') return owner.id;
  return undefined;
};

const normalizeParcels = (parcels: Array<Partial<GotchiverseParcel> & { tokenId?: string }> = []): GotchiverseParcel[] => {
  const currentAccount = GlobalState.WEB3.state.currentAccount?.toLocaleLowerCase();
  return _.map(parcels, (parcel) => {
    const tokenId = String(parcel.tokenId ?? parcel.id ?? '');
    const id = String(parcel.id ?? parcel.tokenId ?? '');
    const meta = PARCELS_BY_TOKEN_ID[tokenId] || PARCELS_BY_TOKEN_ID[Number(tokenId)];
    const rawParcelId = parcel.parcelId ? String(parcel.parcelId) : '';
    const parcelId = rawParcelId.charAt(0) === 'C' ? rawParcelId : meta?.parcelId || rawParcelId;
    const owner = parcelOwnerAddress(parcel.owner as GotchiverseParcel['owner'] | { id?: string });
    return {
      ...parcel,
      id,
      tokenId,
      parcelId,
      owner,
      isLent: owner ? owner.toLocaleLowerCase() !== currentAccount : parcel.isLent,
    } as GotchiverseParcel;
  }).filter((parcel) => parcel.id || parcel.tokenId || parcel.parcelId);
};

/** Pixel center of a Citaadel parcel id (`C-x-y-T`), or null if invalid. */
export function getParcelSpawnPixels(parcelId?: string): { x: number; y: number } | null {
  if (!parcelId || parcelId.charAt(0) !== 'C') return null;
  try {
    const data = getParcelDataById(parcelId);
    return {
      x: Math.round(data.bounds.x + (data.size.width * GOTCHI) / 2),
      y: Math.round(data.bounds.y + (data.size.height * GOTCHI) / 2),
    };
  } catch {
    return null;
  }
}

export const fetchContractOwnedParcels = async (owner: string, provider: Provider, network: NetworkNames): Promise<ContractParcel[]> => {
  const realmDiamond = getContract(network, provider);
  // console.log('realmDiamond', realmDiamond);
  try {
    const tokenIdsOfOwner = await realmDiamond.tokenIdsOfOwner(owner);
    const ownedParcelsIds = _.map(tokenIdsOfOwner, (id) => Number(id));
    // temp hack: limit this query to 200 parcels to fix potential new rented gotchi from vault issue
    if (ownedParcelsIds?.length > 200) {
      ownedParcelsIds.length = 200;
    }
    const parcels = ownedParcelsIds?.length ? getParcelMetadataByTokenIds(ownedParcelsIds) : [];
    return _.map(parcels, (parcel) => ({
      ...parcel,
      id: parcel.tokenId,
      owner,
    }));
  } catch (error) {
    console.error('@fetchContractOwnedParcels', error);
  }
};

export const fetchSubgraphOwnedParcel = async (owner: string, provider: Provider, network: NetworkNames): Promise<GotchiverseParcel[]> => {
  let parcels: GotchiverseParcel[];
  if (PARCEL_SUBGRAPH_NETWORKS.includes(network)) {
    const query = getUsersParcels([owner]);
    try {
      const res = await useSubgraph<{ parcels: GotchiverseParcel[] }>(query, gotchiverseSubgraph);
      parcels = normalizeParcels(res.parcels);
    } catch (error) {
      parcels = await fetchContractOwnedParcels(owner, provider, network);
      parcels = await mapInGotchiverseParcelData(parcels || []);
    }
  } else {
    parcels = await fetchContractOwnedParcels(owner, provider, network);
    parcels = await mapInGotchiverseParcelData(parcels || []);
  }

  return normalizeParcels(parcels);
};

export const getParcelMetadataByTokenIds = (tokenIds): JsonParcel[] => {
  return _.values(_.pick(PARCELS_BY_TOKEN_ID, tokenIds));
};

export const getInventory = async (
  account: string,
  network: NetworkNames,
  provider: ethers.providers.Provider,
): Promise<InstallationsBalancesWithTypes> => {
  const installationContract = await getContract(network, provider, 'installationDiamond');
  const r: InstallationsBalancesWithTypes = await installationContract.installationsBalancesWithTypes(account);
  return r;
};

export const fetchAndSetGlobalParcels = async (
  filter: { district?: number; search?: string; ownedStatus?: OwnedStatus },
  page?: number,
): Promise<void> => {
  let fetchedParcels;

  let accounts = GlobalState.USER.state.addresses;
  if (filter?.ownedStatus && filter.ownedStatus !== (0 as OwnedStatus)) {
    accounts =
      filter?.ownedStatus === 1
        ? [GlobalState.WEB3.state.currentAccount]
        : filter?.ownedStatus === 2
        ? _.filter(accounts, (_acc) => _acc.toLocaleLowerCase() !== GlobalState.WEB3.state.currentAccount.toLocaleLowerCase())
        : [];
  }

  if (!accounts) return;
  const network = GlobalState.WEB3.state.currentNetwork;
  const useSubgraphParcels = PARCEL_SUBGRAPH_NETWORKS.includes(network) || (page && page !== 1);

  if (useSubgraphParcels) {
    try {
      const query = getUsersParcels(accounts, filter || {}, page || 1);
      const res = await useSubgraph<{ parcels: GotchiverseParcel[] }>(query, gotchiverseSubgraph);
      fetchedParcels = normalizeParcels(res?.parcels);
    } catch (error) {
      console.error('@fetchAndSetGlobalParcels subgraph', error);
      fetchedParcels = undefined;
    }
  }

  if (!fetchedParcels) {
    const contractParcels = await fetchContractOwnedParcels(
      GlobalState.WEB3.state.currentAccount,
      GlobalState.WEB3.state.globalProvider,
      network,
    );
    fetchedParcels = await mapInGotchiverseParcelData(contractParcels || []);
    fetchedParcels = normalizeParcels(fetchedParcels);
  }

  GlobalState.USER.dispatch({
    type: 'UPDATE_OWNED_PARCELS',
    ownedParcels: fetchedParcels,
  });
  console.log('GLOBAL_PARCELS', fetchedParcels);
};

export const sortParcels = (sort: SortOption, parcels: GotchiverseParcel[]) => {
  const sorted = _.sortBy(parcels, (parcel) => {
    switch (sort?.value) {
      case 'id':
        return Number(parcel.id);
      case 'name':
        return parcel.parcelHash;
      // case 'size':
      //   return Number(parcel.size); // TODO: add size to parcel data
      case 'aaltarLvl': {
        const altar = parcel.equippedInstallations?.find(({ id }) => getTypeByItemId(Number(id)).installationType === 0);
        if (altar) return getTypeByItemId(Number(altar.id)).level;
        return -1;
      }
      default:
        return Number(parcel.id);
    }
  });
  if (sort?.direction === 'desc') return _.reverse(sorted);
  return sorted;
};

export const mapInGotchiverseParcelData = async (parcels: ContractParcel[]): Promise<GotchiverseParcel[]> => {
  if (!parcels?.length) {
    return [];
  }
  const query = getParcelLastChanneled(parcels.map((parcel) => Number(parcel.id || parcel.tokenId)));
  let resParcels: Array<{ lastChanneledAlchemica: string; id: string; equippedInstallations: Array<{ id: string }>; owner?: string }> = [];
  try {
    const res = await useSubgraph<{
      parcels: Array<{ lastChanneledAlchemica: string; id: string; equippedInstallations: Array<{ id: string }>; owner?: string }>;
    }>(query, gotchiverseSubgraph);
    resParcels = res?.parcels || [];
  } catch (error) {
    console.error('@mapInGotchiverseParcelData', error);
  }
  const gotchiverseParcels: GotchiverseParcel[] = parcels.map((parcel) => {
    const tokenId = String(parcel.tokenId ?? parcel.id ?? '');
    const id = String(parcel.id ?? parcel.tokenId ?? '');
    const gotchiverseData = resParcels.find((item) => item.id === id || item.id === tokenId);
    const owner = parcelOwnerAddress(parcel.owner) || parcelOwnerAddress(gotchiverseData?.owner);
    return {
      ...parcel,
      id,
      tokenId,
      owner,
      isLent: owner ? owner.toLocaleLowerCase() !== GlobalState.WEB3.state.currentAccount?.toLocaleLowerCase() : false,
      lastChanneledAlchemica: gotchiverseData?.lastChanneledAlchemica,
      equippedInstallations: gotchiverseData?.equippedInstallations,
    };
  });
  return gotchiverseParcels;
};

/** Base migration recipes use empty `0x` signatures; Polygon still needs the REALM signer API. */
const EMPTY_REALM_SIGNATURE = '0x';

function usesEmptyRealmSignatures(network: NetworkNames): boolean {
  return network === 'base';
}

/** @deprecated alias — equip/channel/claim all share the Base empty-sig path */
function usesEmptyEquipSignatures(network: NetworkNames): boolean {
  return usesEmptyRealmSignatures(network);
}

function isBytesLikeSignature(value: unknown): value is string | Uint8Array {
  if (typeof value === 'string') return value.startsWith('0x');
  return value instanceof Uint8Array;
}

/** Normalize legacy Object.values byte-maps without corrupting a hex string `'0x…'`. */
function coerceRealmSignature(signature: unknown): string | Uint8Array | unknown[] | undefined {
  if (isBytesLikeSignature(signature)) return signature;
  if (signature && typeof signature === 'object') {
    const values = Object.values(signature as Record<string, unknown>);
    if (values.length === 1 && isBytesLikeSignature(values[0])) return values[0];
    if (values.length > 1) return values;
  }
  return undefined;
}

async function resolveEquipSignature(
  network: NetworkNames,
  installation: { parcelId: number; gotchiId: number; itemId: number; x: number; y: number },
): Promise<string | Uint8Array> {
  if (usesEmptyRealmSignatures(network)) {
    return EMPTY_REALM_SIGNATURE;
  }
  const signature = await fetchEquipSigniture(installation);
  if (!isBytesLikeSignature(signature)) {
    throw new Error(
      'Equip signature unavailable. The REALM signature API did not return a valid signature for this action.',
    );
  }
  return signature;
}

async function resolveChannelSignature(
  network: NetworkNames,
  params: { parcelId: number | string; gotchiId: number; lastChanneled: string },
): Promise<string | Uint8Array | unknown[]> {
  if (usesEmptyRealmSignatures(network)) {
    return EMPTY_REALM_SIGNATURE;
  }
  const signatureJSON = await fetchChannelSigniture(params);
  const signature = coerceRealmSignature(signatureJSON?.signature ?? signatureJSON);
  if (!signature) {
    throw new Error(
      'Channel signature unavailable. The REALM signature API did not return a valid signature for this action.',
    );
  }
  return signature;
}

export const equipUnequipOnParcel = async (
  signer: Signer,
  network: NetworkNames,
  { method, realmId, gotchiId, itemId, position }: EquipUnequipContract,
) => {
  const realmDiamond = getContract(network, signer, 'realmDiamond', true);
  // console.log('realmId, itemId, position', realmId, itemId, position);
  const installation = {
    parcelId: realmId,
    gotchiId,
    itemId,
    x: position.x,
    y: position.y,
  };
  try {
    const signature = await resolveEquipSignature(network, installation);
    const gasPrice = (await gasPriceDict(signer)).gasPrice;
    const tx = await realmDiamond[method](realmId, gotchiId, itemId, position.x, position.y, signature, { gasPrice });
    return tx;
  } catch (error) {
    return error;
  }
};

export const batchEquipOnParcel = async (signer: Signer, network: NetworkNames, { realmId, gotchiId }: BatchEquipContract) => {
  const realmDiamond = getContract(network, signer, 'realmDiamond', true);
  const batchData = getConvertedBatchEquipData();
  // const fixGrid = getFixGridStartPositions();
  // console.log('fixGrid', fixGrid);
  try {
    if (!scene?.batchQueue?.length) {
      throw new Error('Nothing queued to equip. Place or remove installations first.');
    }
    const signature = await getMultipleSig(network, realmId, gotchiId);
    // const gasPrice = (await gasPriceDict(signer)).gasPrice;
    const tx = await realmDiamond.batchEquip(realmId, gotchiId, batchData, signature);
    return tx;
  } catch (error) {
    return error;
  }
};

const getMultipleSig = async (network: NetworkNames, realmId, gotchiId) => {
  const signature = [];

  for (let i = 0; i < scene.batchQueue.length; i++) {
    const item = scene.batchQueue[i];
    const data = getInstallationDataById(item.id);
    if (!data?.itemId && data?.itemId !== 0) {
      throw new Error(`Missing installation data for queued item ${item.id}`);
    }
    const installation = {
      parcelId: realmId,
      gotchiId,
      itemId: data.itemId,
      x: data.relativePosisiton.x,
      y: data.relativePosisiton.y,
    };
    signature.push(await resolveEquipSignature(network, installation));
  }
  return signature;
};

export const moveOnParcel = async (signer: Signer, network: NetworkNames, { method, realmId, itemId, position, positionNew }: MoveContract) => {
  const realmDiamond = getContract(network, signer, 'realmDiamond', true);
  console.log('moveCall', { method, realmId, itemId, position, positionNew });
  try {
    // const signature = await fetchEquipSigniture(installation);
    // console.log('equip signature', installation, signature);
    // if (signature) {
    const gasPrice = (await gasPriceDict(signer)).gasPrice;
    const tx = await realmDiamond[method](Number(realmId), itemId, position.x, position.y, positionNew.x, positionNew.y, { gasPrice });
    return tx;
    // }
  } catch (error) {
    return error;
  }
};

export const upgradeInstallation = async (
  owner: string,
  signer: Signer,
  network: NetworkNames,
  { realmId, coordinateX, coordinateY, installationId }: UpgradeInstallationContract,
  gltr: number,
) => {
  const installationDiamond = getContract(network, signer, 'installationDiamond', true);
  try {
    const installationData = {
      owner,
      coordinateX,
      coordinateY,
      readyBlock: 0,
      claimed: false,
      parcelId: realmId,
      installationId,
    };
    const signature = await fetchUpgrade({ realmId, coordinateX, coordinateY, itemId: installationId, gotchiId: getSelectedGotchiId() });
    if (signature) {
      const gasPrice = (await gasPriceDict(signer)).gasPrice;

      console.log(`UpgradeInstallation with : ${JSON.stringify(installationData)}, ${getSelectedGotchiId()}, ${signature}, ${gltr}, ${gasPrice}`);
      const tx = await installationDiamond.upgradeInstallation(installationData, getSelectedGotchiId(), signature, gltr, { gasPrice });
      return tx;
    } else return;
  } catch (error) {
    // console.log('@upgradeInstallation:REVERTED', error);
    return error;
  }
};

export const speedupUpgrade = async (signer: Signer, network: NetworkNames, { upgradeIndex, gotchiId, blocks }: SpeedupUpgradeContract) => {
  const installationDiamond = getContract(network, signer, 'installationDiamond', true);
  try {
    // gotchiId not required in the signature
    const signature = await fetchSpeedup({ upgradeIndex });
    console.log('@speedupUpgrade: sig', upgradeIndex, gotchiId, blocks, signature);

    if (signature) {
      const gasPrice = (await gasPriceDict(signer)).gasPrice;
      console.log(`Calling ReduceUpgradeTime with :${upgradeIndex}, ${gotchiId}, ${blocks}, ${signature}, ${gasPrice}`);
      const tx = await installationDiamond.reduceUpgradeTime(upgradeIndex, gotchiId, blocks, signature, { gasPrice });
      return tx;
    }
  } catch (error) {
    console.log('@speedupUpgrade:REVERTED', error);
    return error;
  }
};

export const channelAlchemica = async (signer: Signer, network: NetworkNames, { realmId, gotchiId }: ChannelData) => {
  const realmDiamond = getContract(network, signer, 'realmDiamond', true);
  try {
    const lastChanneled = await realmDiamond.getLastChanneled(network === 'mumbai' ? 0 : gotchiId);
    console.log('@channelAlchemica:lastChanneled', lastChanneled);

    const signature = await resolveChannelSignature(network, {
      parcelId: realmId,
      gotchiId,
      lastChanneled: lastChanneled?.toString?.() ?? String(lastChanneled),
    });

    const tx = await realmDiamond.channelAlchemica(
      realmId,
      network === 'mumbai' ? 0 : gotchiId,
      lastChanneled,
      signature,
    );
    if (tx) {
      SFXController.playFX('channeling_start');
      console.log('channelAlchemicaTx', tx);
    }
    const res = await tx.wait();
    return res;
  } catch (error) {
    // console.log('@channelAlchemica:REVERTED', error);
    return error;
  }
};

export const emptyReservoirs = async (signer: Signer, network: NetworkNames, { realmId, gotchiId }: ChannelData) => {
  const realmDiamond = getContract(network, signer, 'realmDiamond', true);
  try {
    const lastClaimed = await realmDiamond.lastClaimedAlchemica(realmId);
    // console.log('lastClaimed', lastClaimed);

    // claimAvailableAlchemica shares the channel signature endpoint on legacy REALM.
    const signature = await resolveChannelSignature(network, {
      parcelId: realmId,
      gotchiId,
      lastChanneled: lastClaimed?.toString?.() ?? String(lastClaimed),
    });

    const tx = await realmDiamond.claimAvailableAlchemica(
      realmId.toString(),
      network === 'mumbai' ? 0 : gotchiId,
      signature,
    );
    if (tx) {
      console.log('emptyReservoirsTX', tx);
    }
    const res = await tx.wait();
    console.log('emptyReservoirs', res);
    return res;
  } catch (error) {
    return error;
  }
};

export const surveyParcel = async (signer: Signer, network: NetworkNames, { realmId }: SurveyParcel) => {
  const realmDiamond = getContract(network, signer, 'realmDiamond', true);
  console.log('realmDiamond', realmDiamond);
  try {
    const gasPrice = (await gasPriceDict(signer)).gasPrice;
    const tx = await realmDiamond.startSurveying(realmId, { gasPrice, gasLimit: 210000 });

    if (tx) {
      console.log('surveyParcelTx', tx);
    }

    const res = await tx.wait();
    if (res) SFXController.playFX('parcel_survey');

    console.log('surveyParcelTx', res);
    return res;
  } catch (error) {
    console.log('@surveyParcelTx:REVERTED', error);
    return error;
  }
};

type ReadProvider = Provider | Signer;

// Total amount of alchemica your reservoirs hold now
export const getClaimableAlchemica = async (provider: ReadProvider, network: NetworkNames, realmId: number): Promise<number[]> => {
  const realmDiamond = getContract(network, provider as Provider, 'realmDiamond');
  // console.log('realmDiamond', realmDiamond);
  try {
    const res = await realmDiamond.getAvailableAlchemica(realmId);
    if (res) return _.map(res, (amount) => Number(Number(ethers.utils.formatEther(amount)).toFixed(2)));
  } catch (error) {
    console.log('@getClaimableAlchemica:ERR', error);
  }
};

// returns all alchemica you have left on your parcel to claim
export const getRemainingAlchemica = async (provider: ReadProvider, network: NetworkNames, realmId: number): Promise<number[]> => {
  const realmDiamond = getContract(network, provider as Provider, 'realmDiamond');
  // console.log('realmDiamond', realmDiamond);
  try {
    const res = await realmDiamond.getRealmAlchemica(realmId);
    if (res) return _.map(res, (amount) => Number(Number(ethers.utils.formatEther(amount)).toFixed(1)));
  } catch (error) {
    console.log('@getRemainingAlchemica:ERR', error);
  }
};

// returns all alchemica you had on your parcel after survey in this round
export const getRoundAlchemica = async (provider: ReadProvider, network: NetworkNames, realmId: number): Promise<number[]> => {
  const realmDiamond = getContract(network, provider as Provider, 'realmDiamond');
  // console.log('realmDiamond', realmDiamond);
  try {
    const res = await realmDiamond.getRoundAlchemica(realmId, 0);
    if (res) return _.map(res, (amount) => Number(Number(ethers.utils.formatEther(amount)).toFixed(2)));
  } catch (error) {
    console.log('@getRoundAlchemica:ERR', error);
  }
};

export const getContractParcelLastChannel = async (provider: Provider, network: NetworkNames, realmId: number): Promise<string> => {
  const realmDiamond = await getContract(network, provider);
  try {
    const parcelLastChanneled = await realmDiamond.getParcelLastChanneled(realmId);
    return parcelLastChanneled;
  } catch (error) {
    console.log('@getParcelLastChanneled: error', error);
  }
};

export const getContractParcelLastClaimded = async (provider: Provider, network: NetworkNames, realmId: number): Promise<string> => {
  const realmDiamond = await getContract(network, provider);
  try {
    const parcelLastClaimed = await realmDiamond.lastClaimedAlchemica(realmId);
    return parcelLastClaimed;
  } catch (error) {
    console.log('@getContractParcelLastClaim: error', error);
  }
};

export const getIsSurveying = async (provider: Provider, network: NetworkNames, realmId: number): Promise<boolean> => {
  const realmDiamond = await getContract(network, provider);

  try {
    const isSurveying = await realmDiamond.isSurveying(realmId);

    return isSurveying;
  } catch (error) {
    console.log('@getIsSurveying: error', error);
  }
};

export const getParcelCurrentRound = async (provider: Provider, network: NetworkNames, realmId: number): Promise<boolean> => {
  const realmDiamond = await getContract(network, provider);

  try {
    const parcelCurrentRound = await realmDiamond.getParcelCurrentRound(realmId);

    return parcelCurrentRound;
  } catch (error) {
    console.log('@getParcelCurrentRound: error', error);
  }
};

// returns all equipped harvester rates
export const getHarvestRates = async (provider: ReadProvider, network: NetworkNames, realmId: number): Promise<number[]> => {
  const realmDiamond = getContract(network, provider as Provider, 'realmDiamond');
  // console.log('realmDiamond', realmDiamond);
  try {
    const res = await realmDiamond.getHarvestRates(realmId);
    // console.log('getHarvestRates', res);
    if (res) return _.map(res, (amount) => Number(Number(ethers.utils.formatEther(amount)).toFixed(2)));
  } catch (error) {
    console.log('@getHarvestRates:ERR', error);
  }
};

// returns all equipped reservoir capacities
export const getCapacities = async (provider: ReadProvider, network: NetworkNames, realmId: number): Promise<number[]> => {
  const realmDiamond = getContract(network, provider as Provider, 'realmDiamond');
  // console.log('realmDiamond', realmDiamond);
  try {
    const res = await realmDiamond.getCapacities(realmId);
    // console.log('getCapacities', res);
    if (res) return _.map(res, (amount) => Number(Number(ethers.utils.formatEther(amount)).toFixed(2)));
  } catch (error) {
    console.log('@getCapacities:ERR', error);
  }
};

// returns total claimed alchemica for this round
export const getTotalClaimed = async (provider: ReadProvider, network: NetworkNames, realmId: number): Promise<number[]> => {
  const realmDiamond = getContract(network, provider as Provider, 'realmDiamond');
  // console.log('realmDiamond', realmDiamond);
  try {
    const res = await realmDiamond.getTotalClaimed(realmId);
    // console.log('getTotalClaimed', res);
    if (res) return _.map(res, (amount) => Number(Number(ethers.utils.formatEther(amount)).toFixed(2)));
  } catch (error) {
    console.log('@getTotalClaimed:ERR', error);
  }
};

export const calculateTotalClaimed = (round: number[], remaining: number[]): number[] => {
  const totalClaimed = _.map(round, (val, index) => {
    return val - remaining[index];
  });
  return totalClaimed;
};

// Parcel Image functions ==============================

export function getParcelSizeByTypeId(typeId: string): { width: number; height: number } {
  let width;
  let height;
  switch (typeId) {
    case 'H':
      width = 8;
      height = 8;
      break;
    case 'R':
      width = 16;
      height = 16;
      break;
    case 'P':
      width = 64;
      height = 64;
      break;
    case 'G':
      width = 64;
      height = 64;
      break;
    case 'U':
      width = 64;
      height = 32;
      break;
    case 'V':
      width = 32;
      height = 64;
      break;
    default:
      break;
  }
  return {
    width,
    height,
  };
}

export function getParcelTypeByTypeId(typeId: string): string {
  switch (typeId) {
    case 'H':
      return 'humble';
    case 'R':
      return 'reasonable';
    case 'P':
      return 'paartners';
    case 'G':
      return 'guardian';
    case 'U':
      return 'spacious';
    case 'V':
      return 'spacious';
    default:
      return 'humble';
  }
}

export const getParcelMetadataById = (
  parcelId: string,
): {
  parcelId: string;
  region: string;
  x: number;
  y: number;
  type: string;
  width: number;
  height: number;
} => {
  const split = parcelId.split('-');
  const { width, height } = getParcelSizeByTypeId(split[3]);
  const region = split[0] === 'C' ? 'Citaadel' : 'Citaadel';
  return {
    parcelId,
    region,
    x: Number(split[1]),
    y: Number(split[2]),
    type: getParcelTypeByTypeId(split[3]),
    width,
    height,
  };
};

function getAroundPixelsPosByParcelData(parcelData, frame) {
  const aroundPixels: unknown[] = [];
  let x = parcelData.x / 2 - frame.x;
  let y = parcelData.y / 2 - frame.y;
  // console.log("after frame xy", x, y);

  const width = parcelData.width / 2;
  const height = parcelData.height / 2;
  let wRep = 1;
  let hRep = 1;

  // go up one
  y--;
  aroundPixels.push({ x, y });

  // include all until tr x+1 y-1;
  while (wRep <= width) {
    x++;
    aroundPixels.push({ x, y });
    wRep++;
  }
  // go down one to start the right bounds and include all until BR x+1 y+1
  y++;
  aroundPixels.push({ x, y });
  while (hRep <= height) {
    y++;
    aroundPixels.push({ x, y });
    hRep++;
  }

  wRep = width;
  // go left one now we're at BR x y+1 start to include all until bl x-1 y-1
  x--;
  aroundPixels.push({ x, y });
  while (wRep) {
    x--;
    aroundPixels.push({ x, y });
    wRep--;
  }

  y--;
  aroundPixels.push({ x, y });
  // include the left side px
  hRep = height;
  while (hRep) {
    y--;
    aroundPixels.push({ x, y });
    hRep--;
  }
  return aroundPixels;
}

export function addMarkerOnImageData(imageData: ImageData, frame, parcelData): void {
  // console.log("frame", frame);
  const aroundPixelsPos = getAroundPixelsPosByParcelData(parcelData, frame);
  // console.log("aroundPixelsPos", aroundPixelsPos);

  aroundPixelsPos.forEach(({ x, y }) => {
    imageData.data[(x + y * frame.width) * 4] = 255;
    imageData.data[(x + y * frame.width) * 4 + 1] = 255;
    imageData.data[(x + y * frame.width) * 4 + 2] = 255;
    imageData.data[(x + y * frame.width) * 4 + 3] = 255;
  });
}

export const getImageBlob = async (parcelId: string, withSize?: number): Promise<string> => {
  const size = withSize || 100;
  const parcelData = getParcelMetadataById(parcelId);

  const x = Math.max(0, Math.ceil(parcelData.x / 2 - size / 2 + parcelData.width / 4));
  const y = Math.max(0, Math.ceil(parcelData.y / 2 - size / 2 + parcelData.height / 4));

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');

  const frame = { x, y, width: size, height: size };
  const apiPixelData = await fetchParcelImageData(parcelId, size);
  if (!apiPixelData) return;
  const responseImageData = new Uint8ClampedArray(apiPixelData);

  const imageData = new ImageData(responseImageData, size);

  addMarkerOnImageData(imageData, frame, parcelData);
  if (context) context.putImageData(imageData, 0, 0);

  return await new Promise((resolve) => {
    canvas.toBlob(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (blob) => {
        resolve(URL.createObjectURL(blob));
      },
      'image/webp',
      1,
    );
  });
};

export const altarIds = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];

const altarRefreshTime = (altarId: string): number | null => {
  switch (altarId) {
    case '1':
    case '10':
      return 24 * 60 * 60;
    case '2':
    case '11':
      return 18 * 60 * 60;
    case '3':
    case '12':
      return 12 * 60 * 60;
    case '4':
    case '13':
      return 8 * 60 * 60;
    case '5':
    case '14':
      return 6 * 60 * 60;
    case '6':
    case '15':
      return 4 * 60 * 60;
    case '7':
    case '16':
      return 3 * 60 * 60;
    case '8':
    case '17':
      return 2 * 60 * 60;
    case '9':
    case '18':
      return 1 * 60 * 60;
    default:
      return null;
  }
};

export const secondsUntilParcelCanChannel = (lastChanneled: string, altarId?: string): number | null => {
  if (!altarId) return null;
  if (!lastChanneled) return 0;
  const refreshTime = altarRefreshTime(altarId);
  if (refreshTime) {
    const now = new Date();
    const refreshEpoch = Number(lastChanneled) + refreshTime;
    const nowEpoch = now.valueOf() / 1000;

    const secondsUntilRefresh = refreshEpoch - nowEpoch;
    return secondsUntilRefresh < 0 ? 0 : Number(secondsUntilRefresh.toFixed(0));
  }
  return null;
};

export const secondsUntilParcelCanClaim = (network: NetworkNames, lastClaimed: string): number | null => {
  if (!lastClaimed) return 0;
  const refreshTime = network === 'mumbai' ? 60 : 8 * 60 * 60;
  if (refreshTime) {
    const now = new Date();
    const refreshEpoch = Number(lastClaimed) + refreshTime;
    const nowEpoch = now.valueOf() / 1000;

    const secondsUntilRefresh = refreshEpoch - nowEpoch;
    return secondsUntilRefresh < 0 ? 0 : Number(secondsUntilRefresh.toFixed(0));
  }
  return null;
};

export const gotchiCanChannel = (lastChanneled?: string): boolean => {
  if (lastChanneled === undefined) return true;
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);

  const midnightEpoch = midnight.valueOf() / 1000;

  return Number(lastChanneled) < midnightEpoch;
};

const humanReadableAccessRights = (accessRights: BigNumber[]): ParcelAccessRights => {
  return {
    channel: Number(accessRights[0]),
    emptyReservoir: Number(accessRights[1]),
    equipInstallations: Number(accessRights[2]),
    equipTiles: Number(accessRights[3]),
    updateInstallations: Number(accessRights[4]),
  };
};

export const getParcelAccessRights = async (
  parcelIds: string[],
  network: NetworkNames,
  provider: providers.Provider,
): Promise<ParcelAccessRights[]> => {
  const actionTypes = [
    ParcelAccessTypes.channel,
    ParcelAccessTypes.emptyReservoir,
    ParcelAccessTypes.equipInstallations,
    ParcelAccessTypes.equipTiles,
    ParcelAccessTypes.updateInstallations,
  ];
  const ids: string[] = [];
  const rights: number[] = [];

  parcelIds.forEach((id) => {
    actionTypes.forEach((type) => {
      ids.push(id.toString());
      rights.push(type);
    });
  });

  const contract = await getContract(network, provider);
  const rawAccessRights: BigNumber[] = await contract.getParcelsAccessRights(ids, rights);
  const accessRights: ParcelAccessRights[] = [];
  const nbRights = actionTypes.length;
  for (let i = 0; i < parcelIds.length; i++) {
    // Group the rights for a given parcel together in one human-readable object
    const rightsForParcel = rawAccessRights.slice(i * nbRights, i * nbRights + nbRights);
    accessRights.push(humanReadableAccessRights(rightsForParcel));
  }
  return accessRights;
};

export const getParcelsAccessRightsWhitelistIds = async (
  parcelIds: string[],
  network: NetworkNames,
  provider: providers.Provider,
  withMembersTransform?: boolean,
): Promise<ParcelAccessRights[] | ParcelAccessRightsWhitelists[]> => {
  const actionTypes = [
    ParcelAccessTypes.channel,
    ParcelAccessTypes.emptyReservoir,
    ParcelAccessTypes.equipInstallations,
    ParcelAccessTypes.equipTiles,
    ParcelAccessTypes.updateInstallations,
  ];
  const ids: string[] = [];
  const rights: number[] = [];

  parcelIds.forEach((id) => {
    actionTypes.forEach((type) => {
      ids.push(id.toString());
      rights.push(type);
    });
  });

  const contract = await getContract(network, provider, 'realmDiamond');
  if (!contract) return;
  const rawWhitelistIds: BigNumber[] = await contract.getParcelsAccessRightsWhitelistIds(ids, rights);

  const accessRightsIds: ParcelAccessRights[] = [];
  const nbRights = actionTypes.length;
  for (let i = 0; i < parcelIds.length; i++) {
    // Group the rights for a given parcel together in one human-readable object
    const rightsForParcel = rawWhitelistIds.slice(i * nbRights, i * nbRights + nbRights);
    accessRightsIds.push(humanReadableAccessRights(rightsForParcel));
  }

  if (withMembersTransform) {
    const ids: string[] = [];
    _.each(accessRightsIds, (parcel) => {
      _.each(_.values(parcel), (id: number) => {
        if (id && !ids.includes(id.toString())) ids.push(id.toString());
      });
    });
    let whitelists;
    if (ids.length) {
      try {
        const query = whitelistQueryByIds(ids);
        const res = await useSubgraph<{ whitelists }>(query);
        whitelists = res?.whitelists ? _.keyBy(res.whitelists, 'id') : [];
      } catch (error) {}

      whitelists = _.each(accessRightsIds, (parcel, i) => {
        return _.each(_.keys(parcel), (key: number) => {
          return (parcel[key] = whitelists?.[parcel[key]]?.members || []);
        });
      });
      return whitelists;
    }
  }
  return accessRightsIds;
};

export const secondsUntilGotchiCanChannel = (lastChanneled?: string): number => {
  const canChannel = gotchiCanChannel(lastChanneled);
  if (canChannel) return 0;

  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);

  const now = new Date();

  const midnightEpoch = midnight.valueOf();
  const nowEpoch = now.valueOf();

  return (midnightEpoch - nowEpoch) / 1000;
};

export const formatTimeLeft = (seconds: number, hasSeconds?: boolean): string => {
  if (seconds === 0 && !hasSeconds) return 'Ready';

  const secondsPerHour = 3600;
  const hours = Math.floor(seconds / secondsPerHour);

  const secondsPerMinute = 60;
  const minutes = Math.floor((seconds % secondsPerHour) / secondsPerMinute);
  if (hasSeconds) {
    const secondsLeft = Math.floor(seconds % secondsPerMinute);
    return `${formatDigit(hours)}h ${formatDigit(minutes)}m ${formatDigit(secondsLeft)}s  `;
  }
  return `${formatDigit(hours)}h ${formatDigit(minutes)}m`;
};

export const getUnequipReturnedAlchemica = (id?: string): Tuple<number, 4> => {
  if (!id) return [0, 0, 0, 0];
  const selectedInstallationData = installationTypes[id];
  if (!selectedInstallationData) return [0, 0, 0, 0];

  const cost = [...selectedInstallationData.alchemicaCost];

  let currentId: number = selectedInstallationData.itemId;
  let currentLevel: number = selectedInstallationData.level;

  while (currentLevel > 1) {
    const previousId = (currentId - 1).toString();
    const { level, itemId, alchemicaCost } = installationTypes[previousId];
    currentLevel = level;
    currentId = itemId;

    alchemicaCost.forEach((value, i) => (cost[i] += value));
  }
  return cost.map((value) => value / 2) as Tuple<number, 4>;
};
