import _ from 'lodash';
import AssetsController from 'components/controllers/assetsController';
import { GOTCHI_SIZE } from 'shared_code/constants/const.game';
import { getInstallationIdDataById, getInstallationTypeById } from 'shared_code/utils/shared.utils.installations';
import {
  AccessRightsAction,
  AnimationConfig,
  Dimensions,
  InstallationIdData,
  InstallationMetadata,
  InstallationTypeLocal,
  JsonInstallation,
  JsonParcel,
  Parcel,
  ParcelAccessRights,
  ParcelAccessRightsWhitelists,
  ParcelAccessValues,
  SpriteMetadata,
  Vector2,
} from 'types';

import installationTypes from 'shared_code/data/installationsCatalog';
import tileTypes from 'shared_code/data/tiles.json';
import installationsData from 'data/installationsData.json';
import { PARCELS_BY_TOKEN_ID } from 'shared_code/models/model.realm';
import { getParcelDataById, getParcelPositionById } from './parcels.helper';
import { scene } from 'components/controllers/SceneController';
import Players from 'components/phaser/Players';
import GlobalState from 'contexts/GlobalState';

const rarityList = ['Common', 'Uncommon', 'Rare', 'Legendary', 'Mythical', 'Godlike'];
const ALCHEMICA_BASED_INSTALLATION_TYPES = ['0-LE', 0, 1, 2, 6]; // This installationtypes has it's sprite name and SpriteMetadata based on installationType_alchemicaType key

// Most important getter, all info about a installation including type and parcel information and json dimensions, not needed in all cases.
export const getAllDataById = async (id: string): Promise<InstallationMetadata> => {
  if (!id) return;
  const installation = getInstallationIdDataById(id) as unknown as InstallationIdData;
  const data = _.assign(installation, { typeData: getTypeById(id) });
  // Get real world positinos from parcelId and relateive installation position;
  const parcelPosition = getParcelPositionById(installation.parcelId);
  const x = (parcelPosition.x + data.position.x) * GOTCHI_SIZE.UNIT;
  const y = (parcelPosition.y + data.position.y) * GOTCHI_SIZE.UNIT;

  const spriteMetadata = await getSpriteMetadataByItemId(installation.itemId);

  _.assign(data, { ...{ spriteMetadata }, globalPosition: { x, y } });
  // @ts-expect-error
  return data;
};

// Returns installationType using a installationId.
export const getTypeById = (id: string): InstallationTypeLocal => {
  if (!id) return;
  const installation = getInstallationIdDataById(id) as unknown as InstallationIdData;
  const itemId = installation.itemId;
  return installation.type === 'INSTALLATION'
    ? installationTypes[itemId] || installationTypes[String(itemId)]
    : tileTypes[itemId] || tileTypes[String(itemId)];
};

// Returns installationType using installation/tile index in craftBook. Uses a local replica of the types from the contract (needs to be updated from shared, each time we update the contract types)
// second arg is 0 for installations 1 for tiles.
export const getTypeByItemId = (itemId: number, type = 0): InstallationTypeLocal => {
  if (itemId === undefined || itemId === null || Number.isNaN(Number(itemId))) return;
  if (type !== 0) return tileTypes[itemId] || tileTypes[String(itemId)];
  return installationTypes[itemId] || installationTypes[String(itemId)];
};

// Returns data based on craftingTable index including jsonData from spritesheets. Mostly used before createing the installationId.
export const getSpriteMetadataByItemId = async (itemId: number | string): Promise<SpriteMetadata> => {
  const typeData = { ...(installationTypes[itemId] || installationTypes[String(itemId)] || {}) } as InstallationTypeLocal;
  if (!typeData?.itemId && typeData?.itemId !== 0) {
    console.warn('@getSpriteMetadataByItemId: missing type for', itemId);
  }
  if (typeData.installationType === 7) return await getDecorationDataByItemId(itemId);

  if (Number(itemId) < 10) {
    typeData.installationType = '0-LE';
  }

  const key = getInstallationKeyByTypeData(typeData);
  const jsonData = (await AssetsController.getJsonAssets(key)) as AnimationConfig;
  const animationsCount = jsonData?.tiles?.length || 0;
  const numOfFramesEachAnim = animationsCount ? jsonData.tiles[0].animation?.length : 1;
  const offsets = installationsData[typeData.installationType];

  const level = Math.max(1, Number(typeData.level) || 1);
  const data = {
    frame: animationsCount ? jsonData?.tiles?.[level - 1]?.id + 1 || 0 : level - 1,
    key,
    pngName: key,
    isDecoration: false,
    animationsCount,
    numOfFramesEachAnim,
    jsonData,
  };
  if (offsets) {
    _.assign(data, offsets);
  }
  return data;
};

export const getGlobalInstallationPosition = (id: string, getCentre?: boolean): Vector2 => {
  const isntallationData = getInstallationIdDataById(id) as unknown as InstallationIdData;
  const parcelData = getParcelDataById(isntallationData.parcelId);
  const topPosition = {
    x: parcelData.bounds.x + isntallationData.position.x * GOTCHI_SIZE.UNIT,
    y: parcelData.bounds.y + isntallationData.position.y * GOTCHI_SIZE.UNIT,
  };
  if (getCentre) {
    const type = getInstallationTypeById(id) as undefined as JsonInstallation;
    return { x: topPosition.x + (type.width / 2) * GOTCHI_SIZE.UNIT, y: topPosition.y + (type.height / 2) * GOTCHI_SIZE.UNIT };
  } else return topPosition;
};

export const getInstallationKeyByTypeData = (typeData: InstallationTypeLocal): string => {
  // Waalls / Lodges share one spritesheet each; frames map by level.
  if (Number(typeData.installationType) === 3) return 'waall';
  if (Number(typeData.installationType) === 4) return 'lodge';
  // Soft-launch Store / Cashier / Shelf — own spritesheets (local catalog, not diamond art).
  // Store 180–188, Cashier 189–197, Shelf 198 — keep ranges in sync with store.*.helper.
  if (Number(typeData.installationType) === 9) return 'store';
  {
    const itemId = Number(typeData.itemId);
    if (itemId >= 189 && itemId <= 197) return 'cashier';
    if (itemId === 198) return 'shelf';
    if (itemId >= 199 && itemId <= 207) return 'console';
  }
  return ALCHEMICA_BASED_INSTALLATION_TYPES.includes(typeData.installationType)
    ? `${typeData.installationType}_${typeData.alchemicaType}`
    : typeData.itemId.toString();
};

export function isOwnedById(id: string, walletParcels?: boolean): Parcel | false {
  const localParcels = GlobalState.REALM.state.ownedParcels;
  if (localParcels.length && id) {
    const installation = getInstallationIdDataById(id) as unknown as InstallationIdData;
    const parcel: Parcel = _.find(localParcels, (parcel) => {
      return walletParcels ? parcelIsOwned(parcel) && parcel.parcelId === installation.parcelId : parcel.parcelId === installation.parcelId;
    });
    if (parcel) return parcel;
  } else return false;
}

export const isHalloweenDecoration = (itemId: number | string) => {
  return Number(itemId) >= 146 && Number(itemId) <= 151;
};

export const isXmassDecoration = (itemId: number | string) => {
  return Number(itemId) >= 152 && Number(itemId) <= 156;
};

export const isSimpleDecoration = (itemId: number | string) => {
  return Number(itemId) >= 146 && Number(itemId) <= 156;
};

export const getSimpleDecorationSpriteMetadata = async (itemId: number | string): Promise<SpriteMetadata> => {
  const typeData = { ...installationTypes[itemId] };
  const name = typeData.name.replace("'", '');
  let names = name.split(' ');
  names = _.map(names, (name) => name.toLowerCase());
  // console.log('names', names);
  const pngName = names.join('_');
  const key = pngName;

  const jsonData = await AssetsController.getJsonAssets(key);
  const isDecoration = true;
  let animationsCount = 0;
  let numOfFramesEachAnim = 0;
  const frame = 0;

  if (jsonData?.tiles?.length) {
    animationsCount = jsonData?.tiles?.length || 0; // animation available
    numOfFramesEachAnim = jsonData.tiles[0].animation.length;
  }

  return _.assign({ origin: { x: 0, y: 0 } }, { pngName, jsonData, animationsCount, frame, key, isDecoration, numOfFramesEachAnim });
};

// Used in getSpriteMetadataByItemId to get data for decorations based on crafting table index
export const getDecorationDataByItemId = async (itemId: number | string): Promise<SpriteMetadata> => {
  if (isSimpleDecoration(itemId)) return await getSimpleDecorationSpriteMetadata(itemId);
  const typeData = { ...installationTypes[itemId] };
  let key;
  const names = typeData.name.split(' ');
  const pngName = names.join('_');
  key = pngName;
  const rarityKey = names.shift();
  if (itemId !== 55) {
    key = names.join('_');
  }
  const jsonData = await AssetsController.getJsonAssets(key);
  const isDecoration = true;
  let animationsCount = 0;
  let numOfFramesEachAnim = 0;

  // add origin and other data
  // animations are playing by pngName so edited this for decoration data only
  let frame = rarityList.indexOf(rarityKey);
  if (jsonData?.tiles?.length) {
    animationsCount = jsonData?.tiles?.length || 0; // animation available
    numOfFramesEachAnim = jsonData.tiles[0].animation.length;
    frame = rarityList.indexOf(rarityKey) * numOfFramesEachAnim;
  }

  return _.assign({ origin: { x: 0, y: 0 } }, { pngName, jsonData, animationsCount, frame, key, isDecoration, numOfFramesEachAnim });
};

// Transform upgrade queue in ids.
export const getQueueIds = (upgradeQueue) => {
  upgradeQueue = upgradeQueue.filter(({ claimed }) => !claimed);
  return _.map(upgradeQueue, (i) => {
    const jsonParcel: JsonParcel = PARCELS_BY_TOKEN_ID[Number(i.parcelId)];
    return `${jsonParcel?.parcelId}_${Number(i.installationId)}_${i.coordinateX}_${i.coordinateY}_0`;
  });
};

// get local collision parcel
export const getActiveParcelCollision = (parcels, position, dimension): Parcel => {
  // returns owned parcel to be build on.
  if (!position || !dimension) return;
  let isInside: Parcel;
  parcels.forEach((parcel) => {
    if (!isInside) {
      isInside =
        parcel.bounds.x <= position.x &&
        parcel.bounds.y <= position.y &&
        parcel.bounds.xMax >= position.x + dimension.width &&
        parcel.bounds.yMax >= position.y + dimension.height
          ? parcel
          : undefined;
    }
  });
  return isInside;
};

// Round woldPosition to closest multiple of GOTCHI_SIZE.UNIT
export const getRoundPoiterPosition = (position) => {
  return {
    x: Math.floor(position.x / GOTCHI_SIZE.UNIT) * GOTCHI_SIZE.UNIT,
    y: Math.floor(position.y / GOTCHI_SIZE.UNIT) * GOTCHI_SIZE.UNIT,
  };
};

// Return position top_left position in InstallationGrid
export const getRelativePositionToParcel = ({ bounds }: Parcel, pxPosition: Vector2) => {
  return {
    x: (pxPosition.x - bounds.x) / GOTCHI_SIZE.UNIT,
    y: (pxPosition.y - bounds.y) / GOTCHI_SIZE.UNIT,
  };
};

export const setLocalInventory = (itemId: number, type: 'INSTALLATION' | 'TILE', modifier: number): number => {
  if (!scene) return;
  const inventory = GlobalState.USER.state.inventory;
  if (!inventory) return;
  const itemToUpdate = getLocalInventoryItem(itemId, type);
  itemToUpdate.quantity += modifier;

  return itemToUpdate.quantity;
};

export const getLocalInventoryItem = (itemId: number, type: 'INSTALLATION' | 'TILE') => {
  if (!scene) return;
  const inventory = GlobalState.USER.state.inventory;
  if (!inventory) return;
  return _.find(inventory, (item) => {
    return item.itemId === itemId && item.type === type;
  });
};

// CHECKS
interface ParcelOwnerCheck {
  accessRights: ParcelAccessRights;
  accessWhitelists: ParcelAccessRightsWhitelists;
  owner: string;
}
// Check accessRights
export const borrowerCanBuild = (parcel): boolean => {
  // console.log('@borrowerCanBuild', parcel);
  const parcelToCheck: ParcelOwnerCheck = _.pick(parcel, ['accessRights', 'accessWhitelists', 'owner']);
  return parcelIsOwned(parcel) || borrowerCanAccess(parcelToCheck, 'equipInstallations') || borrowerCanAccess(parcelToCheck, 'equipTiles');
};

export const parcelIsOwned = (parcel): boolean => {
  return parcel?.owner?.toLowerCase() === Players.selectedPlayer?.owner?.toLowerCase();
};

export const borrowerCanAccess = (parcel: ParcelOwnerCheck, action: AccessRightsAction): boolean => {
  // console.log('@borrowerCanAccess', parcel);
  const whitelistMembers = parcel?.accessWhitelists?.[action];
  return (
    parcelIsOwned(parcel) ||
    (parcel.accessRights[action] === ParcelAccessValues.MeAndBorrowedGotchis &&
      parcel.owner?.toLocaleLowerCase() === Players.selectedPlayer?.originalOwner?.toLowerCase()) ||
    parcel.accessRights[action] === ParcelAccessValues.Anyone ||
    (parcel.accessRights[action] === ParcelAccessValues.Whitelist && whitelistMembers?.includes(Players.selectedPlayer?.owner?.toLowerCase()))
  );
};

// Check if anything overlaps a parcel by contract grid.
export const isOverlap = (grid: number[][], relativePosition: Vector2, dimensions: Dimensions): boolean => {
  let isOverlap = false;
  if (grid !== undefined && relativePosition.x >= 0 && relativePosition.y >= 0) {
    for (let y = relativePosition.y; y < relativePosition.y + dimensions.height; y++) {
      for (let x = relativePosition.x; x < relativePosition.x + dimensions.width; x++) {
        if (x >= grid[0].length || y >= grid.length || grid[y][x] !== 0) {
          isOverlap = true;
          break;
        }
      }
    }
    return isOverlap;
  } else {
    return true;
  }
};

export const isAaltar = (id: string): boolean => {
  const { itemId, type } = getInstallationIdDataById(id);
  return type === 'INSTALLATION' && itemId < 19;
};

export const isDecoration = (id: string): boolean => {
  const { installationType, type } = getTypeById(id);
  return type === 'INSTALLATION' && installationType === 7;
};

export const isNFTDisplay = (itemId: number | string) => {
  return Number(itemId) >= 137 && Number(itemId) <= 144 && Number(itemId) >= 157 && Number(itemId) <= 161;
};

export const isUpgradable = (id: string): boolean => {
  const { installationType, type } = getTypeById(id);
  return (
    type === 'INSTALLATION' &&
    installationType !== 5 &&
    installationType !== 8 &&
    installationType !== 7 &&
    // Soft-launch Shelf/Cashier furniture (type 10) is not parcel-upgradable.
    installationType !== 10
  );
};

export const isUpgrading = (id: string): boolean => {
  const data = getInstallationIdDataById(id);
  return !!data.state;
};

export const isInstallation = (id: string): boolean => {
  const { type } = getTypeById(id);
  return type === 'INSTALLATION';
};

// GETTER requires scene or activeParcel

// returns all installations on the same parcel using parcelId.
export const getLocalInstallationsByParcelId = (id: string): string[] => {
  return [...scene.installationGroup.keys()].filter((localId) => {
    return localId.split('_')[0] === id;
  });
};

// Returns all upgrades on a parcel by parcelId
export const getLocalUpgrade = (id: string): string[] => {
  return [...scene.installationGroup.keys()].find((localId) => {
    return (
      localId.split('_')[0] === id.split('_')[0] &&
      localId.split('_')[2] === id.split('_')[2] &&
      localId.split('_')[3] === id.split('_')[3] &&
      localId.split('_')[4] === id.split('_')[4]
    );
  });
};

export const getMaakerByParcelId = (id: string) => {
  const maakerId = getLocalInstallationsByParcelId(id).filter((id) => {
    const type = getTypeById(id);
    return type.installationType === 6;
  });
  if (maakerId?.length) return maakerId[0];
};

export const getActiveParcelByTokenId = (id: number | boolean): Parcel => {
  if (!id) return undefined;
  return _.find(GlobalState.REALM.state.ownedParcels, ({ tokenId }) => Number(tokenId) === id);
};

// returns aaltar id from activeParcel
export const getActiveParcelAaltarId = (activeParcel) => {
  if (activeParcel?.installations?.length) {
    const fromParcel = _.find(activeParcel.installations, (id) => isAaltar(id));
    if (fromParcel) return fromParcel;
  }
  // Colyseus play mode often has no activeParcel.installations — fall back to spawned sprites.
  const parcelId = activeParcel?.parcelId || activeParcel?.id;
  if (parcelId) {
    return getLocalInstallationsByParcelId(String(parcelId)).find((id) => isAaltar(id));
  }
};

/** Resolve the aaltar installation id for any install on the same parcel (play-mode safe). */
export const getAaltarIdForInstallation = (installationId?: string): string | undefined => {
  if (!installationId) return undefined;
  try {
    const data = getInstallationIdDataById(installationId) as unknown as InstallationIdData;
    if (!data?.parcelId) return undefined;
    const fromLocal = getLocalInstallationsByParcelId(data.parcelId).find((id) => isAaltar(id));
    if (fromLocal) return fromLocal;
    // Last resort: scan owned parcel metadata if build mode populated installations[].
    const owned = GlobalState.REALM?.state?.ownedParcels || [];
    const parcel = owned.find((p) => p.parcelId === data.parcelId || p.id === data.parcelId);
    return getActiveParcelAaltarId(parcel);
  } catch {
    return undefined;
  }
};

export const getConvertedBatchEquipData = () => {
  const types = [];
  const equip = [];
  const ids = [];
  const x = [];
  const y = [];
  _.each(scene.batchQueue, ({ id, action }) => {
    const data = getInstallationIdDataById(id);
    types.push(data.type === 'TILE' ? 1 : 0);
    equip.push(action === 'EQUIP');
    ids.push(data.itemId);
    x.push(data.position.x);
    y.push(data.position.y);
  });
  return [types, equip, ids, x, y];
};

export const getSelectedGotchiId = (): number => {
  const player = Players.selectedPlayer;
  if (!player || player.isSpectator) return 0;

  // Soft-launch cAavegotchis use non-numeric ids (`starter-uni-1`). Prefer bound L1 token.
  if (player.isCartridgeHero) {
    const source = Number(player.cartridgeSourceTokenId);
    if (Number.isFinite(source) && source >= 0) return source;
    return Number.NaN;
  }

  const id = Number(player.id);
  return Number.isFinite(id) ? id : Number.NaN;
};

// export const getFixGridStartPositions = () => {
//   const realmIds = [];
//   const types = [];
//   const equip = [];
//   const ids = [];
//   const x = [];
//   const y = [];
//   _.each(scene.batchQueue, ({ id }) => {
//     const data = getInstallationIdDataById(id);
//     realmIds.push(data.realmId);
//     x.push(data.position.x);
//     y.push(data.position.y);
//     types.push(data.type === 'TILE');
//     ids.push(data.itemId);
//   });
//   return [realmIds, x, y, types, ids];
// };
