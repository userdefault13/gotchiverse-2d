const installationTypes = require('../data/installationsCatalog');
const tileTypes = require('../data/tiles.json');
const _ = require('lodash');
import { getParcelTokenIdById } from './shared.utils.parcel';
import { toUpperCaseFirst } from './shared.utils.helpers';
import { PARCELS_BY_TOKEN_ID } from '../models/model.realm';

export const getInstallationIdDataById = (id) => {
  const split = id.split('_');
  return {
    id,
    parcelId: split[0],
    realmId: getParcelTokenIdById(split[0]),
    itemId: Number(split[1]),
    position: {
      x: Number(split[2]),
      y: Number(split[3]),
    },
    type: Number(split[4]) ? 'TILE' : 'INSTALLATION',
    state: Number(split[5]),
  };
};

// Returns installationType using a installationId.
export const getInstallationTypeById = (id) => {
  if (!id) return;
  const installation = getInstallationIdDataById(id);
  return installation.type === 'INSTALLATION' ? installationTypes[installation.itemId] : tileTypes[installation.itemId];
};

export const createInstallationIdByData = ({ parcelId, itemId, x, y, type, state }) => {
  let id = `${parcelId}_${itemId}_${x}_${y}_${type}`;
  if (!Number(type)) id += `_${state}`;
  return id;
};

export const isUpgrade = (currentId, id) => {
  const currentX = currentId.split('_')[2];
  const currentY = currentId.split('_')[3];
  const x = id.split('_')[2];
  const y = id.split('_')[3];
  const type = id.split('_')[4];
  return type !== '1' && currentX === x && currentY === y;
};

export const getUserUpgradeQueue = async (contract, account) => {
  try {
    const r = await contract.getUserUpgradeQueue(account);
    return r;
  } catch (error) {
    console.log('@Shared:getUserUpgradeQueue ERROR:', error);
  }
};

export const transformGrid = (bigNumberGrid) => {
  // translate from bigNumber;
  return _.map(bigNumberGrid, (grid) => {
    const intGrid = _.map(grid.coords, (row) => {
      return _.map(row, (int) => {
        return Number(int);
      });
    });
    // concat all grid to calculate the sum, if sum is 0 we have no installation equipped so we don't need to return the full grid.
    return _.sum(_.flatMapDeep(intGrid)) === 0 ? null : intGrid;
  });
};

export const getInstallationIdsbyGrid = (parcelId, grid, type, queue?) => {
  /* To minimise the data transfers we convert each grid in a array of installation IDs that can always recreate the gird.
   * The installationId is uique and give us all information we needed.
   * SHAPE: parcelId_itemId_Xpos_Ypos_binaryBool
   * The last split binaryBool is not required and will be 1 only if we have an upgrade in progress and FE should display the building Sprite.
   * From this we can lookup a locally or redis stored recipeBook and get all data needed. (installationType, installationName,level, width, height, alchemicaType..)
   * The `itemId` split is the installationType used on installationDiamond and fetchable by installationDiamond.getInstallationType(itemId);
   * Godspeed
   */
  if (!parcelId || !grid) return;
  const ids = [];
  let exclusions = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      // @ts-ignore
      if (grid[y][x] !== 0 && !exclusions.includes(`${x},${y}`)) {
        let id = `${parcelId}_${grid[y][x]}_${x}_${y}_${type}`;
        if (!type) {
          if (queue?.includes(id)) id += '_1';
          else id += '_0';
        }
        // @ts-ignore
        ids.push(id);
        const { width, height } = !type ? installationTypes[grid[y][x]] : tileTypes[grid[y][x]];
        exclusions = _.concat(exclusions, _getExclusionOnTop(x, y, width, height));
      }
    }
  }
  return ids;
};

export const getQueueIds = async (installationDiamond, realmId) => {
  if (!installationDiamond || !realmId) return [];
  try {
    let upgradeQueue = await installationDiamond.getParcelUpgradeQueue(realmId);
    upgradeQueue = upgradeQueue.output_.filter(({ claimed }) => !claimed);
    return _.map(upgradeQueue, (i) => {
      return `${PARCELS_BY_TOKEN_ID[Number(i.parcelId)].parcelId}_${Number(i.installationId)}_${i.coordinateX}_${i.coordinateY}_0`;
    });
  } catch (error) {
    throw new Error(error);
  }
};

function _getExclusionOnTop(x, y, widht, height) {
  const exclusions = [];
  for (let i = 0; i < height; i++) {
    for (let e = 0; e < widht; e++) {
      // @ts-ignore
      exclusions.push(`${x + e},${y + i}`);
    }
  }
  return exclusions;
}

export const fetchContractGrid = async (contract, { type, tokenId }, gridType) => {
  // console.log('Call', [`get${toUpperCaseFirst(type)}Grid`]);
  try {
    let grid = await contract[`get${toUpperCaseFirst(type)}Grid`](tokenId, gridType);
    if (grid) {
      grid = _.map(grid, (row) => {
        return _.map(row, (int) => {
          return Number(int);
        });
      });
      return grid;
    }
  } catch (error) {
    console.log('@Shared:fetchContractGrid,error', error);
  }
};

export default {};
