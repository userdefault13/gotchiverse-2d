// shared methods used by aavegotchi repos that deal with map data like finding conflict free positions for object spawning

// override this to the instantiated version of Winston Logger for the parent project
let logger = console;
const _ = require('lodash');
const sharedParcelUtils = require('./shared.utils.parcel');
import { ALCHEMICA_SIZE, TILE_SIZE, HOOD_SIZE, GAME_CONFIG, HOODS_EXCLUSION, SPAWN_DISTRICTS, HOOD_WIDTH, HOOD_HEIGHT, MAP_ID_CITAADEL, MAP_ID_AARENA } from '../constants/const.game';

// Optional legacy API-server helper. This FE repo only ships a stub at
// server/physicsManager.js (no getAllBoundsByLabel) so Next/Turbopack can
// resolve the path without treating spawn helpers as a hard dependency.
let physicsManagerIsAvailable = false;
let getAllBoundsByLabel;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loaded = require('../../server/physicsManager');
  if (typeof loaded?.getAllBoundsByLabel === 'function') {
    getAllBoundsByLabel = loaded.getAllBoundsByLabel;
    physicsManagerIsAvailable = true;
  }
} catch {
  // Expected when the API server sources are absent.
}
// min padding between alchemica spawns in units of alchemica (0 makes them touch, 1 makes them min 1 alchemica width/height apart, etc)
const ALCHEMICA_SPAWN_GAP = 0.5;

// to manually offset placement against the background grid
const ALCHEMICA_OFFSET_X = 18;
const ALCHEMICA_OFFSET_Y = 18;

export function initMapHelper(loggerObj) {
  if (loggerObj) {
    logger = loggerObj;
  }
}

// check if a given X, Y position is within map bounds.
export function isPosInMapBounds(LOADED_MAP, xPos, yPos, extraCollisionCheckItems?) {
  let isInBounds;
  const isInBoundsX = xPos >= LOADED_MAP.SPAWN_BOUNDS.left && xPos <= LOADED_MAP.SPAWN_BOUNDS.right;
  const isInBoundsY = yPos >= LOADED_MAP.SPAWN_BOUNDS.top && yPos <= LOADED_MAP.SPAWN_BOUNDS.bottom;
  isInBounds = isInBoundsX && isInBoundsY;
  // optionally check if x,y position is inside a wall
  if (isInBounds && physicsManagerIsAvailable) {
    isInBounds = !_hasItemOverlap(LOADED_MAP, { x: xPos, y: yPos }, _generatePlayerSpawnCollisionCache(LOADED_MAP));
  }
  if (isInBounds && extraCollisionCheckItems) {
    isInBounds = !_hasItemOverlap(LOADED_MAP, { x: xPos, y: yPos }, extraCollisionCheckItems);
  }
  return isInBounds;
}

// loading player wall collision cache this way so it only gets generated once for efficiency
let _wallCollisionObjectsCache;
let _noSpawnObjectsCache;
let _groundHazardsObjectsCache;
function _generatePlayerSpawnCollisionCache(LOADED_MAP) {
  if (!_wallCollisionObjectsCache) {
    _wallCollisionObjectsCache = physicsManagerIsAvailable ? getAllBoundsByLabel(['wall']) : [];
  }

  if (!_noSpawnObjectsCache && LOADED_MAP.NO_SPAWN_ZONES) {
    _noSpawnObjectsCache = LOADED_MAP.NO_SPAWN_ZONES.map((zone) => {
      // have to convert the format from top/left/right/bottom to x,y width, height where x,y is in the middle
      const width = zone.right - zone.left;
      const height = zone.bottom - zone.top;
      return {
        x: zone.left + width / 2,
        y: zone.top + height / 2,
        width: width,
        height: height,
      };
    });
  }

  if (!_groundHazardsObjectsCache) {
    // in citaadel map there are no damaging ground hazards so its ok to spawn on them
    _groundHazardsObjectsCache = physicsManagerIsAvailable && LOADED_MAP.ID !== MAP_ID_CITAADEL ? getAllBoundsByLabel(['alchemica']) : [];
  }

  let installations;
  if (physicsManagerIsAvailable) {
    // installations will be added all the time so we can't cache those, fetch those live and return them as well
    installations = getAllBoundsByLabel(['installation'], true);
    // filter installations to just ones that act like walls, if the gameParent has a .isOverlap prop skip it
    installations = _.filter(installations, (installation) => installation.gameParent?.isOverlap !== true);
  }
  return [..._wallCollisionObjectsCache, ...(_noSpawnObjectsCache || []), ..._groundHazardsObjectsCache, ...(installations || [])];
}

// generate a random map position for player to spawn on
// if a district or parcel ID is passed the random position will be within those bounds
// otherwise one of the default spawn districts is randomly picked to generate the random position within
export function generateRandomPlayerSpawnPosition(LOADED_MAP, districtOrParcelId?) {
  let spawnBounds;
  let spawnRadius = 0;
  let spawnOrigin = { x: 0, y: 0 };
  let spawnEventType = 'player random spawn';
  if (GAME_CONFIG.combatTesting && LOADED_MAP.ID === MAP_ID_AARENA) {
    const testSpawn = LOADED_MAP.COMBAT_TESTING_SPAWN_AREA;
    spawnRadius = testSpawn.RADIUS * TILE_SIZE;
    spawnOrigin = { x: testSpawn.X, y: testSpawn.Y };
    spawnEventType = 'player random spawn combat testing';
  }
  if (LOADED_MAP.ID === MAP_ID_CITAADEL && districtOrParcelId) {
    // parcelId looks like ex, C-6018-1208-H
    const isParcel = String(districtOrParcelId).charAt(0) === 'C' && districtOrParcelId.split('-').length === 4;
    const parcelData = isParcel && sharedParcelUtils.getParcelMetadataById(districtOrParcelId);
    if (parcelData) {
      spawnBounds = {
        top: parcelData.y * TILE_SIZE,
        left: parcelData.x * TILE_SIZE,
      };
      spawnBounds.right = spawnBounds.left + parcelData.width * TILE_SIZE;
      spawnBounds.bottom = spawnBounds.top + parcelData.height * TILE_SIZE;
    }
  }
  // if loading in citaadel and spawning randomly, we randomly pick one of the default spawn districts
  if (!spawnBounds && LOADED_MAP.ID === MAP_ID_CITAADEL) {
    const hasLegalSpawnDistrict = districtOrParcelId && SPAWN_DISTRICTS.includes(districtOrParcelId);
    if (!hasLegalSpawnDistrict) {
      // if user supplied an invalid district ID we pick a random one from the current default spawn districts
      districtOrParcelId = SPAWN_DISTRICTS[Math.floor(Math.random() * SPAWN_DISTRICTS.length)];
    }
    const districtObj = _.find(DISTRICTS, ['id', districtOrParcelId]);
    if (districtObj) {
      // user selected to spawn in a particular district. Hoods and districts are currently identical for all districts except for district 1
      // we currently allow only district 1 which is split into 1a - 1f. District size is normally 67584 x 67584 px
      spawnBounds = {
        top: districtObj.position.y * TILE_SIZE,
        left: districtObj.position.x * TILE_SIZE,
      };
      // district 1b and 1e are half height though with half blocked off for the inaccessible center of the citadel
      const hoodHeight = ['1b', '1e'].includes(districtObj) ? (HOOD_SIZE * TILE_SIZE) / 2 : HOOD_SIZE * TILE_SIZE;
      spawnBounds.right = spawnBounds.left + HOOD_SIZE * TILE_SIZE;
      spawnBounds.bottom = spawnBounds.top + hoodHeight;
      // 1e in particular the top half is blocked off, so offset to bottom half
      if (districtObj === '1e') {
        spawnBounds.top += hoodHeight;
        spawnBounds.bottom += hoodHeight;
      }
    }
  }

  // hacking the conflict-free-alchemica-position script for now to generate random conflict free player positions
  const possibleXY = generateConflictFreeMapPosition(LOADED_MAP, spawnOrigin, spawnRadius, _generatePlayerSpawnCollisionCache(LOADED_MAP), null, spawnBounds, false, false, spawnEventType);
  return possibleXY;
}

// private utility function used in the alchemica spawn method above
// optionally pass overall spawn bounds if smaller than full map bounds
export function generateConflictFreeMapPosition(LOADED_MAP, originXY, radius, collisionCheckItems, retry, spawnBounds, isAlchemica, source, isSelfCalledRetry?) {
  let attemptCounter = 0;
  let hasOverlap = true;
  let possibleXY;
  const MAX_RETRY_COUNT = 20;
  // we'll attempt placement in up to MAX_RETRY_COUNT random points within the radius
  while (hasOverlap && attemptCounter < MAX_RETRY_COUNT) {
    possibleXY = _getRandomPlacement(LOADED_MAP, originXY, radius, spawnBounds, isAlchemica);
    hasOverlap = _hasItemOverlap(LOADED_MAP, possibleXY, collisionCheckItems);
    attemptCounter++;
  }
  // if the first MAX_RETRY_COUNT attempts failed, the radius must be filled with too many collision items already, lets try again with incrementally increased radius
  // each one of these is run MAX_RETRY_COUNT times if needed
  if (hasOverlap && radius && retry) {
    // if we're going to retry, ensure the radius to double is reasonable
    if (radius < 32) {
      radius = 32;
    }
    logger.info(`generateConflictFreeMapPosition: EXTENDED RADIUS RETRY 1: nothing conflict free with ${attemptCounter} attempts, trying 1.25x radius on origin: ${JSON.stringify(originXY)} radius: ${radius}, source: "${source}"`);
    possibleXY = generateConflictFreeMapPosition(LOADED_MAP, originXY, radius * 1.25, collisionCheckItems, 0, spawnBounds, isAlchemica, source, true);
    hasOverlap = !possibleXY;
    if (hasOverlap) {
      attemptCounter += MAX_RETRY_COUNT;
    }
  }
  if (hasOverlap && radius && retry) {
    logger.info(`generateConflictFreeMapPosition: EXTENDED RADIUS RETRY 2: nothing conflict free with ${attemptCounter} attempts, trying 1.5x radius on origin: ${JSON.stringify(originXY)} radius: ${radius}, source: "${source}"`);
    possibleXY = generateConflictFreeMapPosition(LOADED_MAP, originXY, radius * 1.5, collisionCheckItems, 0, spawnBounds, isAlchemica, source, true);
    hasOverlap = !possibleXY;
    if (hasOverlap) {
      attemptCounter += MAX_RETRY_COUNT;
    }
  }
  if (hasOverlap && radius && retry) {
    logger.info(`generateConflictFreeMapPosition: EXTENDED RADIUS RETRY 3: nothing conflict free with ${attemptCounter} attempts, trying 2x radius on origin: ${JSON.stringify(originXY)} radius: ${radius}, source: "${source}"`);
    possibleXY = generateConflictFreeMapPosition(LOADED_MAP, originXY, radius * 2, collisionCheckItems, 0, spawnBounds, isAlchemica, source, true);
    hasOverlap = !possibleXY;
    if (hasOverlap) {
      attemptCounter += MAX_RETRY_COUNT;
    }
  }
  // once a conflict free alchemica position is found, add the new alchemica to the array to check subsequent new alchemica against
  if (!hasOverlap) {
    if (isAlchemica) {
      collisionCheckItems.push({ x: possibleXY.x - ALCHEMICA_SIZE.WIDTH / 2, y: possibleXY.y - ALCHEMICA_SIZE.HEIGHT / 2 });
    }
  } else if (!isSelfCalledRetry) {
    logger.warn(`generateConflictFreeMapPosition: GIVING UP. Couldn't find a conflict free position after ${attemptCounter} attempts on origin: ${JSON.stringify(originXY)} radius: ${radius}, source: "${source}", isAlch: ${isAlchemica}`);
  }
  return hasOverlap ? null : possibleXY;
}

// private utility function used in the collision logic above
function _getRandomPlacement(LOADED_MAP, originXY, radius, spawnBounds, fixPosToGrid = true) {
  let x, y;
  // if a radius is passed it's a random point in a circular radius
  if (radius) {
    const ptAngle = Math.random() * 2 * Math.PI;
    const ptRadiusSq = Math.random() * radius * radius;
    const ptX = Math.sqrt(ptRadiusSq) * Math.cos(ptAngle);
    const ptY = Math.sqrt(ptRadiusSq) * Math.sin(ptAngle);
    x = ptX + originXY.x;
    y = ptY + originXY.y;
  } else {
    let smallerThanFullMapBounds = spawnBounds;
    // @ts-ignore
    if (!spawnBounds && GAME_CONFIG.customAlchemicaSpawnZone?.length === 4) {
      smallerThanFullMapBounds = GAME_CONFIG.customAlchemicaSpawnZone;
    }
    if (smallerThanFullMapBounds) {
      // full map random is replaced with a custom spawn zone
      let { top, bottom, left, right } = smallerThanFullMapBounds;
      if (smallerThanFullMapBounds === GAME_CONFIG.customAlchemicaSpawnZone) {
        // if the smaller bounds ref is coming from GAME_CONFIG.customAlchemicaSpawnZone it is an array instead of an object
        top = smallerThanFullMapBounds[0];
        left = smallerThanFullMapBounds[1];
        right = smallerThanFullMapBounds[2];
        bottom = smallerThanFullMapBounds[3];
      }
      const width = right - left;
      const height = bottom - top;
      x = Math.round(left + Math.random() * width);
      y = Math.round(top + Math.random() * height);
    } else {
      const { top, bottom, left, right } = LOADED_MAP.SPAWN_BOUNDS;
      // otherwise it's a full map random placement
      x = Math.round(left + Math.random() * (right - left));
      y = Math.round(top + Math.random() * (bottom - top));
    }
  }
  // round placements to the nearest uniform column and rows
  if (fixPosToGrid) {
    const placementIntervalX = ALCHEMICA_SPAWN_GAP ? ALCHEMICA_SIZE.WIDTH * (ALCHEMICA_SPAWN_GAP + 1) : ALCHEMICA_SIZE.WIDTH;
    const placementIntervalY = ALCHEMICA_SPAWN_GAP ? ALCHEMICA_SIZE.HEIGHT * (ALCHEMICA_SPAWN_GAP + 1) : ALCHEMICA_SIZE.HEIGHT;
    x = _roundToNearestInterval(Math.round(x / placementIntervalX) * placementIntervalX, placementIntervalX);
    y = _roundToNearestInterval(Math.round(y / placementIntervalY) * placementIntervalY, placementIntervalY);
    x += ALCHEMICA_OFFSET_X;
    y += ALCHEMICA_OFFSET_Y;
  }
  return { x, y };
}

export function generateVoidSpawnPosition() {
  return { x: 0, y: 0 };
}

// private utility function used in the collision logic above
// for example rounding 35 to nearest 32, is 32. Rounding 63 to nearest 32 is 64.
function _roundToNearestInterval(num, interval) {
  const leftover = num % interval;
  if (!leftover) {
    return num;
  } else {
    return num + (Math.round(leftover / interval) === 1 ? interval - leftover : -leftover);
  }
}

// private utility function used in the collision logic above
// set to .5 to allow alchemica to touch each other but it may overlap other targets as well
const ALLOWED_ALCHEMICA_OVERLAP = 0.5;
export function _hasItemOverlap(LOADED_MAP, targetXY, collisionCheckItems) {
  let hasOverlap = false;
  const halfWidth = ALCHEMICA_SIZE.WIDTH / 2;
  const halfHeight = ALCHEMICA_SIZE.HEIGHT / 2;
  // first check world boundies
  if (LOADED_MAP) {
    hasOverlap = targetXY.x < LOADED_MAP.SPAWN_BOUNDS.left || targetXY.x > LOADED_MAP.SPAWN_BOUNDS.right || targetXY.y < LOADED_MAP.SPAWN_BOUNDS.top || targetXY.y > LOADED_MAP.SPAWN_BOUNDS.bottom;
  }
  if (!hasOverlap) {
    for (let i = 0; i < collisionCheckItems.length; i++) {
      let { x, y, width, height } = collisionCheckItems[i];
      let bufferX = 0;
      let bufferY = 0;
      let isTargetAlchemica = false;
      // alchemica don't have stored width/height so will use these defaults
      if (!width) {
        isTargetAlchemica = true;
        width = ALCHEMICA_SIZE.WIDTH;
        // if alchemica, we allow overlap to be closer via ALLOWED_ALCHEMICA_OVERLAP
        bufferX = ALLOWED_ALCHEMICA_OVERLAP;
      }
      if (!height) {
        height = ALCHEMICA_SIZE.HEIGHT;
        // if alchemica, we allow overlap to be closer via ALLOWED_ALCHEMICA_OVERLAP
        bufferY = ALLOWED_ALCHEMICA_OVERLAP;
      }
      // has a perfect overlap
      if (targetXY.x === x && targetXY.y === y) {
        hasOverlap = true;
        break;
      }
      let hasXOverlap, hasYOverlap;
      if (isTargetAlchemica) {
        // all x,y positions are center, so with alchemica vs alchemica the math adds up
        hasXOverlap = valueInRange(targetXY.x, x, x + width, bufferX) || valueInRange(x, targetXY.x, targetXY.x + ALCHEMICA_SIZE.WIDTH, bufferX);
        hasYOverlap = valueInRange(targetXY.y, y, y + height, bufferY) || valueInRange(y, targetXY.y, targetXY.y + ALCHEMICA_SIZE.HEIGHT, bufferY);
      } else {
        hasXOverlap = valueInRange(targetXY.x - halfWidth, x - width / 2, x + width / 2, 0) || valueInRange(targetXY.x + halfWidth, x - width / 2, x + width / 2, 0);
        hasYOverlap = valueInRange(targetXY.y - halfHeight, y - height / 2, y + height / 2, 0) || valueInRange(targetXY.y + halfHeight, y - height / 2, y + height / 2, 0);
      }
      hasOverlap = hasXOverlap && hasYOverlap;
      if (hasOverlap) {
        break;
      }
    }
  }
  return hasOverlap;
}

// utility function used in the collision logic above
export function valueInRange(val, min, max, buffer = 0) {
  return val - buffer >= min && val + buffer <= max;
}

// district hood x and hood y are one-based row/col offsets
// these generate hood IDs for each district as `C${district.hoodX}${district.hoodY}`
// populated dynamically below are hood dimensions and pixel positions as well
export const DISTRICTS = [
  { id: '43', hoodX: 1, hoodY: 1 },
  { id: '20', hoodX: 2, hoodY: 1 },
  { id: '21', hoodX: 3, hoodY: 1 },
  { id: '22', hoodX: 4, hoodY: 1 },
  { id: '23', hoodX: 5, hoodY: 1 },
  { id: '24', hoodX: 6, hoodY: 1 },
  { id: '25', hoodX: 7, hoodY: 1 },
  { id: '26', hoodX: 8, hoodY: 1 },
  { id: '42', hoodX: 1, hoodY: 2 },
  { id: '19', hoodX: 2, hoodY: 2 },
  { id: '4', hoodX: 3, hoodY: 2 },
  { id: '5', hoodX: 4, hoodY: 2 },
  { id: '6', hoodX: 5, hoodY: 2 },
  { id: '7', hoodX: 6, hoodY: 2 },
  { id: '8', hoodX: 7, hoodY: 2 },
  { id: '27', hoodX: 8, hoodY: 2 },
  { id: '41', hoodX: 1, hoodY: 3 },
  { id: '18', hoodX: 2, hoodY: 3 },
  { id: '3', hoodX: 3, hoodY: 3 },
  { id: '1a', hoodX: 4, hoodY: 3 },
  { id: '1b', hoodX: 5, hoodY: 3 },
  { id: '1c', hoodX: 6, hoodY: 3 },
  { id: '9', hoodX: 7, hoodY: 3 },
  { id: '28', hoodX: 8, hoodY: 3 },
  { id: '40', hoodX: 1, hoodY: 4 },
  { id: '17', hoodX: 2, hoodY: 4 },
  { id: '2', hoodX: 3, hoodY: 4 },
  { id: '1f', hoodX: 4, hoodY: 4 },
  { id: '1e', hoodX: 5, hoodY: 4 },
  { id: '1d', hoodX: 6, hoodY: 4 },
  { id: '10', hoodX: 7, hoodY: 4 },
  { id: '29', hoodX: 8, hoodY: 4 },
  { id: '39', hoodX: 1, hoodY: 5 },
  { id: '16', hoodX: 2, hoodY: 5 },
  { id: '15', hoodX: 3, hoodY: 5 },
  { id: '14', hoodX: 4, hoodY: 5 },
  { id: '13', hoodX: 5, hoodY: 5 },
  { id: '12', hoodX: 6, hoodY: 5 },
  { id: '11', hoodX: 7, hoodY: 5 },
  { id: '30', hoodX: 8, hoodY: 5 },
  { id: '38', hoodX: 1, hoodY: 6 },
  { id: '37', hoodX: 2, hoodY: 6 },
  { id: '36', hoodX: 3, hoodY: 6 },
  { id: '35', hoodX: 4, hoodY: 6 },
  { id: '34', hoodX: 5, hoodY: 6 },
  { id: '33', hoodX: 6, hoodY: 6 },
  { id: '32', hoodX: 7, hoodY: 6 },
  { id: '31', hoodX: 8, hoodY: 6 },
];
_.each(DISTRICTS, (district) => {
  _.assign(district, {
    hoodId: `C${district.hoodX}${district.hoodY}`,
    dimensions: {
      width: HOOD_SIZE,
      height: HOOD_SIZE,
    },
    position: {
      x: (district.hoodX - 1) * HOOD_SIZE,
      y: (district.hoodY - 1) * HOOD_SIZE,
    },
  });
});

export const districtsById = _.keyBy(DISTRICTS, 'id');

export const getDistrictIdByHoodPos = (hoodX, hoodY) => {
  const hoodId = `C${hoodX}${hoodY}`;
  return _.find(DISTRICTS, ['hoodId', hoodId])?.id;
};

export function getHoodByPosition(x, y) {
  // hood x,y is 1-based
  const hoodX = Math.floor(x / HOOD_WIDTH) + 1;
  const hoodY = Math.floor(y / HOOD_HEIGHT) + 1;
  return { x: hoodX, y: hoodY, id: `C${hoodX}${hoodY}` };
}

export function getHoodById(id) {
  return districtsById[id];
}

// returns the hood IDs of all released districts, pass true to also return unreleased districts in the current grid
export const getAllHoodIds = (includeExcludedHoods) => {
  let hoodIds = _.map(DISTRICTS, ({ hoodId }) => hoodId);
  if (!includeExcludedHoods) {
    hoodIds = _.filter(hoodIds, function (hoodId) {
      return !HOODS_EXCLUSION.includes(hoodId);
    });
  }
  return hoodIds;
};
