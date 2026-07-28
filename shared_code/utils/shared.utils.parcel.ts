import { PARCELS_BY_ID, PARCELS_BY_TOKEN_ID } from '../models/model.realm';

import { GOTCHI_SIZE, HOOD_SIZE } from '../constants/const.game';
const installationTypes = require('../data/installationsCatalog');
const tileTypes = require('../data/tiles.json');
import { getNFTDisplayStatuses, getParcelOwners, getOwnedAavegotchisOfOwner } from '../web3/subgraph/queries';
import { useSubgraphCall } from './shared.utils.ethers';
import { gotchiverseSubgraph, coreURI } from '../web3/shared.const.web3';

let logger = console;
export function getParcelTokenIdById(id) {
  const parcel = PARCELS_BY_ID[id];
  if (!parcel) {
    logger.warn(`getParcelTokenIdById - no parcel found for id ${id}`);
    return '';
  }
  return parcel.tokenId;
}

export function getParceIdByTokenId(id) {
  const parcel = PARCELS_BY_TOKEN_ID[id];
  if (!parcel) {
    logger.warn(`getParceIdByTokenId - no parcel found for id ${id}`);
    return '';
  }
  return PARCELS_BY_TOKEN_ID[id].parcelId;
}

export function getBoundsByParcelData(parcelData) {
  let { x, y, width, height } = parcelData;
  x *= GOTCHI_SIZE.UNIT;
  y *= GOTCHI_SIZE.UNIT;
  const xMax = x + width * GOTCHI_SIZE.UNIT;
  const yMax = y + height * GOTCHI_SIZE.UNIT;
  return { x, y, xMax, yMax };
}

export function getParcelMetadataById(id) {
  const split = id.split('-');
  const { width, height } = getParcelSizeByTypeId(split[3]);
  const region = split[0] === 'C' ? 'citaadel' : split[0];
  return {
    id,
    region,
    x: Number(split[1]),
    y: Number(split[2]),
    type: getParcelTypeByTypeId(split[3]),
    width,
    height,
  };
}

export function getParcelPositionById(id) {
  const split = id.split('-');
  return { x: Number(split[1]), y: Number(split[2]) };
}

export function getParcelSizeByTypeId(typeId) {
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
    case 'S':
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

export function getParcelTypeByTypeId(typeId) {
  let type;
  switch (typeId) {
    case 'H':
      type = 'humble';
      break;
    case 'R':
      type = 'reasonable';
      break;
    case 'P':
      type = 'paartners';
      break;
    case 'U':
      type = 'spacious';
      break;
    case 'V':
      type = 'spacious';
      break;
    default:
      break;
  }
  return type;
}

function getParcelTypeIdByType(type) {
  switch (type) {
    case 'humble':
      return 'H';
    case 'reasonable':
      return 'R';
    case 'paartner':
      return 'P';
    case 'guardian':
      return 'G';
    case 'spacious':
      return 'S';
    default:
      break;
  }
}

// function getDistricType(tile) {
//   const { x, y } = tile;
//   return districts.filter(({ xMin, xMax, yMin, yMax }) => x >= xMin && x <= xMax && y >= yMin && y <= yMax)[0].type;
// }

export function getHoodPositionById(id) {
  const { x, y } = getParcelPositionById(id);
  const hoodX = Math.ceil(x / HOOD_SIZE);
  const hoodY = Math.ceil(y / HOOD_SIZE);
  return { x: hoodX, y: hoodY };
}

export function getInstallationDataById(id) {
  // Installation Id contains everything to reconstruct the Installation on Installation Grid
  // Last binary boolean is the state 0 for unfinished 1 for complete
  if (!id) return;
  const split = id.split('_');
  const parcelId = split[0];
  const itemId = Number(split[1]);
  const relativePosisiton = { x: Number(split[2]), y: Number(split[3]) };
  const type = Number(split[4]) || 0;
  const dimensions = type ? tileTypes[itemId] : installationTypes[itemId];
  const parcelPosition = getParcelPositionById(parcelId);
  // sanity check
  // @ts-ignore
  if ((parcelId, itemId, relativePosisiton, dimensions, parcelPosition)) {
    return {
      id,
      parcelId,
      itemId,
      type,
      relativePosisiton,
      dimensions,
      position: {
        x: (parcelPosition.x + relativePosisiton.x) * GOTCHI_SIZE.UNIT,
        y: (parcelPosition.y + relativePosisiton.y) * GOTCHI_SIZE.UNIT,
      },
    };
  } else {
    console.warn(`@getInstallationDataById: error returning data for installation ${id} `);
  }
}

export const fetchSubgraphParcelOwner = async (tokenIds) => {
  const query = getParcelOwners(tokenIds);
  try {
    const res = await useSubgraphCall(query, gotchiverseSubgraph);
    return res;
  } catch (error) {}
};

const ASSETS_CONFIG = {
  0: {
    name: 'Aavegotchis',
    contract: 'aavegotchiDiamond',
    type: 2,
    category: { ERC721: 3, ERC1155: 0 },
    metadata: 'https://app.aavegotchi.com/metadata/aavegotchis/',
    isSVG: true,
    hasBaazaar: true,
  },
  1: {
    name: 'REALM Parcels',
    type: 0,
    contract: 'realmDiamond',
    metadata: 'https://app.aavegotchi.com/metadata/realm/',
    img: 'https://gotchiverse.s3.ap-northeast-1.amazonaws.com/',
    suffix: '?x-phaser=1',
    category: { ERC721: 4 },
    hasBaazaar: true,
  },
  2: {
    name: 'Tiles',
    type: 1,
    contract: 'tileDiamond',
    metadata: 'https://app.aavegotchi.com/metadata/tile/',
    img: 'https://app.aavegotchi.com/images/tiles/',
    category: { ERC1155: 5 },
    hasBaazaar: true,
  },
  3: {
    name: 'Installations',
    type: 1,
    contract: 'installationDiamond',
    metadata: 'https://app.aavegotchi.com/metadata/installation/',
    img: 'https://app.aavegotchi.com/images/installation/',
    category: { ERC1155: 4 },
    hasBaazaar: true,
  },
  4: { name: 'Aavegotchi Collabs' },
  5: {
    name: 'Raffle Tickets',
    contract: 'ghstStaking',
    type: 1,
    metadata: 'https://app.aavegotchi.com/metadata/polygon/tickets',
    category: { ERC1155: 3 },
    hasBaazaar: true,
  },
  6: {
    name: 'Aavegotchi Art Commissions by @VesperScribbles',
  },
};

export const fetchOwnedGotchis = async (owner, collection) => {
  const query = getOwnedAavegotchisOfOwner(owner);
  try {
    const res = (await useSubgraphCall(query, coreURI)) as { users };
    if (res?.users?.length) {
      return (res.users[0].gotchisOriginalOwned || []).map((item) => {
        return {
          tokenAddress: collection.contractAddress,
          tokenId: item.id,
          chain: collection.chainId,
          tokenUri: ASSETS_CONFIG[collection.contractId].metadata + item.id,
          contractType: 'ERC721',
        };
      });
    }
  } catch (error) {
    console.warn('fetchOwnedGotchis error', error);
  }
  return [];
};

export const getAllowedCollections = async () => {
  const query = getNFTDisplayStatuses();
  try {
    const res = (await useSubgraphCall(query, gotchiverseSubgraph)) as { nftdisplayStatuses };
    if (res) {
      return res.nftdisplayStatuses;
    }
  } catch (error) {}
  return null;
};
