// Each aavegotchi project has it's own redis.js for redis calls specific to that project.
// This one contains redis calls that are used in more than 1 project to avoid redundancy

// Set this redis var to the project's existing instantiated version of IORedis via init method so we don't need to init another instance
let redis;
// Set this to your instantiated version of Winston Logger if desired
let logger = console;
const _ = require('lodash');
const { GAME_CONFIG, DEFAULT_GAME_CONFIG, DEFAULT_MAP_CONFIG, CHANGED_MAP_CONFIG_CACHE, CHANGED_GAME_CONFIG_CACHE, LOG_CONNECT_DISCONNECT, ALCHEMICA_DEPOSIT_STREAM_NAME, ENABLED_MAPS, TILE_SIZE, MAP_ID_CITAADEL, MAP_ID_AARENA, MAP_CONFIG_BY_ID, ENEMY_DEFAULTS, PLAYER_WALLET_SUPPORTED_TOKENS } = require('../constants/const.game');
import { ALCHEMICA_CONFIG, PLAYERS_BY_ID, PARCELS_BY_TOKEN_ID } from '../models/model.realm.js';
const ALCHEMICA_CONFIG_REDIS_KEY = 'alchemica-config';
import { format } from 'timeago.js';
const axios = require('axios');
import { getAllParcelEvents, getParcelEvent } from '../web3/subgraph/queries';
import { gotchiverseSubgraph } from '../web3/shared.const.web3';
import { useSubgraphCall } from './shared.utils.ethers';
import { BounceGateEvent } from '../models/BounceGateEvent.js';
import { getInstallationTypeById } from './shared.utils.installations.js';
import { publishEventForMap } from './shared.utils.zone.js';
const items = require('../data/item-shop.json');
const isMumbai = process.env.REALM_NETWORK === 'mumbai' || process.env.ALCHEMICA_NETWORK === 'mumbai';

const PLAYER_PICKUP_LOGS = 'logs.player.pickups';
const PLAYER_WITHDRAW_LOGS = 'logs.player.withdraw';

// register telemetry
const telemetry = require('./shared.utils.telemetry');
const alchTypes = ['FUD', 'FOMO', 'ALPHA', 'KEK'];
const alchValues = {
  FUD: 1,
  FOMO: 2,
  ALPHA: 4,
  KEK: 10,
};
const itemTypeIds = Object.keys(items);
// const telemRedisStreamMessagesSentCounter = telemetry.registerCounter('redis_stream_messages_sent', 'number of redis stream messages sent since process start');

export const indexes = {
  parcelTimestamps: `${process.env.REALM_NETWORK}:parcel:timestamps`,
};

export function initSharedRedisHelper(redisPublisher, loggerObj) {
  redis = redisPublisher;
  if (loggerObj) {
    logger = loggerObj;
  }
}

export function broadcastToPubSub(channel, data) {
  redis.publish(channel, JSON.stringify(data));
}

// submit to our Redis Streams unified logs. This log has consumers that do additional race condition processing
export async function submitToRedisStream(streamName, activityObj) {
  // logger.info('@@@@ submitToRedisStream', streamName, activityObj);
  // redis.xadd(streamName, '*', 'data', JSON.stringify(activityObj), function (err, result) {
  const activityObjToKeyValArray = _.flatMap(activityObj, (key, value) => [value, key]);
  await redis.xadd(streamName, 'MAXLEN', 100000, '*', ...activityObjToKeyValArray, function (err, result) {
    if (err) {
      logger.error(`shared.redis:submitToRedisStream error adding ${streamName} stream activity for:`, activityObj, err);
    } else {
      // telemRedisStreamMessagesSentCounter.inc();
      // logger.info(`shared.redis:submitToRedisStream ${streamName} success. Entry ID: ${result}`);
    }
  });
}

// load list of currently spawned map alchemica. This is typically loaded once on server boot and then kept up-to-date with pub/sub
// pass a mapId to load list relative to one map, otherwise a single object for all active maps is returned
// TODO: spawned-alchemica list can be huge so consider chunking via redis.hscanStream https://github.com/luin/ioredis#streamify-scanning
export async function loadSpawnedAlchemica(mapId) {
  let spawnedAlchemicaById = {};
  if (mapId) {
    spawnedAlchemicaById = await redis.hgetall(`spawned-alchemica.${mapId}`);
  } else {
    const alchLoadPromises = [];
    ENABLED_MAPS.forEach((mapId) => {
      // @ts-ignore
      alchLoadPromises.push(
        redis.hgetall(`spawned-alchemica.${mapId}`, function (err, resp) {
          if (err) {
            logger.warn('Redis loadSpawnedAlchemica error', err);
          } else {
            _.assign(spawnedAlchemicaById, resp);
          }
        })
      );
    });
    await Promise.allSettled(alchLoadPromises);
  }
  for (const [key, value] of Object.entries(spawnedAlchemicaById)) {
    // deserialize from strings
    // @ts-ignore
    spawnedAlchemicaById[key] = JSON.parse(value);
    // add the alchemica ID as an entry
    spawnedAlchemicaById[key].id = key;
  }
  return spawnedAlchemicaById;
}

// load map spawned items by type, this is only needed when servers first boot
// this is formatted to be used by multiple item types like map spawned enemies and Item Store items
// optionally pass an item ID to just load one item, this is used for ex. when enemies travel from server zones
export async function loadSpawnedItemsByKey(itemKey, itemId?) {
  if (itemId) {
    let spawnedItem = await redis.hget(itemKey, itemId);
    if (spawnedItem) {
      spawnedItem = JSON.parse(spawnedItem);
    }
    return spawnedItem;
  } else {
    const spawnedItemsById = await redis.hgetall(itemKey);
    for (const [key, value] of Object.entries(spawnedItemsById)) {
      // deserialize from strings
      // @ts-ignore
      spawnedItemsById[key] = JSON.parse(value);
      // add the item ID as an entry if not present
      if (!Object.prototype.hasOwnProperty.call(spawnedItemsById[key], 'id')) {
        spawnedItemsById[key].id = key;
      }
    }
    return spawnedItemsById;
  }
}

// clear out all gotchi level alchemica and other props, test servers only, executed from extras/mini-game-mode.js
export async function destroyAllGotchiProps() {
  /* TODO: SECURITY, if we want to lock this down in prod after demos
    if (process.env.APP_ENV === 'production'){
      return;
    }
    */

  // delete all gotchi:* keys in Redis DB, this is where gotchi level properties are like alchemica, health
  const totalKeysDeleted = await performBulkRedisOperation('gotchi:*', 'del', 100);
  logger.info(`${totalKeysDeleted} gotchi:* keys deleted.`);

  const totalPositionKeysDeleted = await performBulkRedisOperation('player.map.position:*', 'del', 100);
  logger.info(`${totalPositionKeysDeleted} player.map.position:* keys deleted.`);

  await redis.publish('players', JSON.stringify({ action: 'reset-player-properties' }));

  return totalKeysDeleted;
}

export function getConfigSettings(isMapConfig = false, mapId = MAP_ID_CITAADEL) {
  const defaultConfig = isMapConfig ? DEFAULT_MAP_CONFIG[mapId] : DEFAULT_GAME_CONFIG;
  const config = isMapConfig ? MAP_CONFIG_BY_ID[mapId] : GAME_CONFIG;
  const changeCache = isMapConfig ? CHANGED_MAP_CONFIG_CACHE[mapId] : CHANGED_GAME_CONFIG_CACHE;
  const keyName = isMapConfig ? `map-config-${mapId}` : 'game-config';
  return { defaultConfig, config, changeCache, keyName };
}

// update the game state config, save to Redis, and optionally broadcasts to all servers
export async function saveGameConfig(changesObj, broadcastToPubSub, isMapConfig = false, mapId = MAP_ID_CITAADEL) {
  const configChangesToBroadcast = {};
  const pipeline = redis.pipeline();

  const { defaultConfig, config, changeCache, keyName } = getConfigSettings(isMapConfig, mapId);

  for (const property in changesObj) {
    if (!_.has(defaultConfig, property)) {
      logger.warn(`saveGameConfig: property ${property} doesn't exist in standard props and will be ignored.`);
      delete changesObj[property];
      continue;
    } else {
      // check if we are loading a seralized nested object change using dot notation
      if (property.indexOf('.') !== -1) {
        const [parentObjName, nestedPropName] = property.split('.');
        // reflect the nested object change in changesObj by copying the entire nested source object
        // and overriding this property. This guarantees that various logic doesn't overwrite the whole object
        // with the one+ custom values
        if (!configChangesToBroadcast[parentObjName]) {
          configChangesToBroadcast[parentObjName] = Object.assign({}, defaultConfig[parentObjName], changeCache[parentObjName]);
        }
        configChangesToBroadcast[parentObjName][nestedPropName] = changesObj[property];
      } else if (config[property] !== changesObj[property]) {
        // only broadcast if current value isn't the same
        configChangesToBroadcast[property] = changesObj[property];
      }
    }

    // we only save changes to the DB when they differ from our original gameConfig defaults (DEFAULT_GAME_CONFIG)
    if (changesObj[property] !== defaultConfig[property]) {
      changeCache[property] = changesObj[property];
      pipeline.hset(keyName, property, JSON.stringify(changesObj[property]));
    } else {
      // otherwise we just delete previous changes from defaults from the DB
      delete changeCache[property];
      pipeline.hdel(keyName, property);
    }
  }

  // flush redis pipeline of changes
  await pipeline.exec();

  // finally dispatch to all running servers so they update in realtime
  if (broadcastToPubSub && _.keys(configChangesToBroadcast).length) {
    if (isMapConfig) {
      // @ts-ignore
      await publishEventForMap(redis, mapId, 'map-config-update', null, null, configChangesToBroadcast);
    } else {
      await redis.publish('game-config-update', JSON.stringify(configChangesToBroadcast));
    }
  }
}

// load latest persistant game state override variables to merge into defaults, this happens on server init, including after a crash
export async function reloadGameConfig(isMapConfig = false, mapId = MAP_ID_CITAADEL) {
  // FYI the redis array response is converted to an object automagically via https://github.com/luin/ioredis#transforming-arguments--replies
  const { defaultConfig, config, changeCache, keyName } = getConfigSettings(isMapConfig, mapId);

  let savedMapConfigObj = await redis.hgetall(keyName);
  if (savedMapConfigObj && _.keys(savedMapConfigObj).length) {
    // convert props saved as strings back into native types
    savedMapConfigObj = _.mapValues(savedMapConfigObj, function (value) {
      try {
        return JSON.parse(value);
      } catch (er) {
        return value;
      }
    });

    // update changed-from-default-properties cache to send to FE clients
    for (const property in savedMapConfigObj) {
      if (!_.has(defaultConfig, property)) {
        logger.warn(`reloadGameConfig: loaded an unknown prop from DB for map "${isMapConfig ? mapId : 'GLOBAL'}". Deleting: ${property}=${savedMapConfigObj[property]}`);
        // if the property doesn't exist in our default object it is a renamed or no longer used prop, delete it
        delete savedMapConfigObj[property];
        redis.hdel(keyName, property);
        continue;
      }

      // check if the property value being deserialized is a nested object
      // in that case it may be an override of just 1 key in that object, so we merge existing and default values
      if (Object.getPrototypeOf(savedMapConfigObj[property]) === Object.prototype) {
        savedMapConfigObj[property] = Object.assign({}, defaultConfig[property], changeCache[property], savedMapConfigObj[property]);
      }

      // if we are loading a seralized nested object change using dot notation
      if (property.indexOf('.') !== -1) {
        const [parentObjName, nestedPropName] = property.split('.');
        // set the nested value
        config[parentObjName][nestedPropName] = savedMapConfigObj[property];
        // reflect the nested object change in changeCache by copying the entire nested source object
        // and overriding this property. This guarantees that various logic doesn't overwrite the whole object
        // with the one+ custom values
        if (!changeCache[parentObjName]) {
          changeCache[parentObjName] = Object.assign({}, defaultConfig[parentObjName]);
        }
        changeCache[parentObjName][nestedPropName] = savedMapConfigObj[property];
        // then delete the item as its not a real parent level property
        delete savedMapConfigObj[property];
      } else {
        if (savedMapConfigObj[property] !== defaultConfig[property]) {
          changeCache[property] = savedMapConfigObj[property];
        } else {
          delete changeCache[property];
        }
      }
    }
    _.assign(config, savedMapConfigObj);
  }
  return savedMapConfigObj;
}
/**
 * Message all connected players with a brief toast message.
 * If `mapId` is passed, only the players connected to that map are notified
 * Pass a gotchiId to filter the message to just a single player.
 * Pass an alertType to change the icon and style of the toast: 'success', 'warn', 'info', 'error'
 **/
export async function notifyAllPlayers(message, gotchiId?, autoClose?, mapId?, alertType = 'success') {
  const payload = {
    message: message,
    type: alertType,
    gotchiId,
    autoClose,
  };
  if (mapId) {
    await publishEventForMap(redis, mapId, 'notify-map-players', null, null, payload);
  } else {
    await redis.publish(
      'notify-all-players',
      JSON.stringify({
        message: message,
        type: alertType,
        gotchiId,
        autoClose,
      })
    );
  }
}

const collisionCacheByMap = {};
// load a map's collision cache or generate it if it doesn't exist
// pass `includeHazards` True to include hazards that don't act like walls but still damage, this is used by Enemies logic
export async function loadCollisionsCache(mapId, includeHazards = false) {
  let collisionCacheLabel = mapId + `${includeHazards ? '-hazards' : ''}`;
  if (!collisionCacheByMap[collisionCacheLabel]) {
    // manually generate and save a new map based collision cache and save it
    // logger.warn(`loadCollisionsCache for map "${mapId}" doesn't exist, creating it.`);
    const blocksJSON = require(`../data/maps/${mapId}/collisions/blocks.json`);
    // hazards that act like walls
    const hazardBlocksJSON = require(`../data/maps/${mapId}/collisions/hazardBlocks.json`);
    // hazards that don't act like walls but still damage
    const hazardJSON = require(`../data/maps/${mapId}/collisions/hazards.json`);
    // objects like tents
    const objectsBlocksJSON = require(`../data/maps/${mapId}/collisions/objects.json`);
    const newCollisionCache = [].concat(parseCollisionsFile(blocksJSON, 'wall'), parseCollisionsFile(hazardBlocksJSON, 'hazard-wall'), parseCollisionsFile(objectsBlocksJSON, 'objects-wall'));
    if (includeHazards) {
      newCollisionCache.push(...parseCollisionsFile(hazardJSON, 'hazard'));
    }
    collisionCacheByMap[collisionCacheLabel] = newCollisionCache;
  }
  return collisionCacheByMap[collisionCacheLabel];
}

// helper parser for above
export function parseCollisionsFile(objectsJSON, type) {
  const parsedCollisions = [];
  const parseObject = function (objectJSON) {
    // these hard coded offsets adjustments are requires per original buildBlock logic
    const offset = {
      x: 0,
      y: 0,
    };
    if (objectJSON.type === 'statue') {
      offset.y = objectJSON.dimensions.height - 1;
      if (objectJSON.use === 'statue_prince') {
        offset.y = objectJSON.dimensions.height - 2;
        offset.x = -1;
      }
    } else if (objectJSON.type === 'tent' || objectJSON.type === 'dao_office' || objectJSON.type === 'potion_shop') {
      offset.y = 7;
      offset.x = 0;
    } else if (objectJSON.type === 'deposite') {
      offset.x = objectJSON.dimensions.width / 2;
      offset.y = objectJSON.dimensions.height / 2 + 0.5;
    } else if (objectJSON.type === 'light') {
      offset.x = -0.5;
      offset.y = objectJSON.dimensions.height - 0.5;
    }
    const isWorldRoom =
      objectJSON.type === 'tent' || objectJSON.type === 'dao_office' || objectJSON.type === 'potion_shop';
    // Keep original center; shrink footprint 2 tiles (1 per side) to match land_wip platform.
    const rawW = objectJSON.dimensions.width;
    const rawH = objectJSON.dimensions.height;
    const width = isWorldRoom ? Math.max(1, rawW - 2) : rawW;
    const height = isWorldRoom ? Math.max(1, rawH - 2) : rawH;
    return {
      x: (objectJSON.position.x - offset.x) * TILE_SIZE + (rawW * TILE_SIZE) / 2,
      y: (objectJSON.position.y - offset.y) * TILE_SIZE + (rawH * TILE_SIZE) / 2,
      width: width * TILE_SIZE,
      height: height * TILE_SIZE,
      type,
    };
  };
  if (_.isArray(objectsJSON)) {
    _.each(objectsJSON, (block) => {
      // @ts-ignore
      parsedCollisions.push(parseObject(block, type));
    });
  } else {
    // citaadel collision files are further sub-divided by hoods in the file so we have to drill down
    _.forOwn(objectsJSON, (blocks) => {
      _.each(blocks, (block) => {
        // @ts-ignore
        parsedCollisions.push(parseObject(block, type));
      });
    });
  }
  return parsedCollisions;
}

// utility function to perform a mass redis key operation against a wildcard key selection using:
// redis.scanStream to efficiently query for wildcard redis keys 100 at a time
// Redis.pipline to batch execute single redis commands 100 at a time
// See details of redis.scanStream here: https://github.com/luin/ioredis#streamify-scanning
// And details of redis.pipeline here: https://github.com/luin/ioredis#pipelining

// returns the number of keys processed
// Example delete all gotchi:${id} would be: performBulkRedisOperation('gotchi:*', 'del', 100)
// Example rename all `gotchi.online.DATE` keys to gotchi.online:DATE` would be: performBulkRedisOperation('gotchi.online.*', 'rename', 100, 'gotchi.online:')
export async function performBulkRedisOperation(wildcardKey, operation, batchCount, newName?) {
  let nameToReplace;
  if (operation === 'rename') {
    if (!newName) {
      return;
    } else {
      nameToReplace = wildcardKey.split('*').join('');
    }
  }
  return new Promise(async (resolve, reject) => {
    let totalKeysToAction = [];
    let currentBatchKeysToAction = [];

    // we use Redis.pipline to batch execute single redis commands $batchCount at a time
    let pipeline = redis.pipeline();

    const onAllKeysProcessed = function () {
      resolve(totalKeysToAction.length);
    };

    // we use redis.scanStream to efficiently query for wildcard redis keys $batchCount at a time
    const stream = redis.scanStream({
      // only returns keys following the pattern
      match: wildcardKey,
      // only return objects that match a given type,
      // type: 'hash',
      // returns approximately $batchCount keys per call
      count: batchCount,
    });

    stream.on('data', async function (resultKeys) {
      if (resultKeys.length) {
        totalKeysToAction = totalKeysToAction.concat(resultKeys);
        currentBatchKeysToAction = currentBatchKeysToAction.concat(resultKeys);
        for (let i = 0; i < resultKeys.length; i++) {
          if (operation === 'copy') {
            // Bulk rename attempt 1:
            // pipeline.rename(resultKeys[i], resultKeys[i].split(nameToReplace).join(newName));
            // Bulk rename attempt 2:
            // turns out that for bulk renames we can't use the rename method as cluster keys "must be in the same hash slot"
            // so instead we duplicate the key into a new key using the new name, and delete the old key
            // await redis.copy(resultKeys[i], resultKeys[i].split(nameToReplace).join(newName));
            // await redis.del(resultKeys[i]);
            // Bulk rename attempt 3 (works by exporting and then importing):
            // turns out nonsensically Redis doesn't allow a copy command in a cluster env for the same reason
            // this returns the same CROSSSLOT Keys in request don't hash to the same slot error
            // const copyContent = await redis.dumpBuffer(resultKeys[i]);
            // await redis.restore(resultKeys[i].split(nameToReplace).join(newName), 0, copyContent);
            // Bulk rename attempt 4 - manual pull data and manual create new key
            // All these attempts work perfectly on local but again this doesn't work on prod / Redis Enterprise
            // but this time with terrible error handling by Redis: ReplyError: ERR unknown command `dump`, with args beginning with: key-name
            // This error occurs despite using the correct dumpBuffer command and the dump command itself being legitimate
            // this hacky final solution currently only works on string key types
            const copyContent = await redis.get(resultKeys[i]);
            await redis.set(resultKeys[i].split(nameToReplace).join(newName), copyContent);
          } else {
            pipeline[operation](resultKeys[i]);
          }
        }
        if (currentBatchKeysToAction.length >= batchCount) {
          // note: pausing the stream while performing the action on the current batch is the default here, but it's not required
          stream.pause();
          pipeline.exec(() => {
            // logger.info('one batch complete');
            stream.resume();
          });
          // reset the current batch and pipeline to do another chunk
          currentBatchKeysToAction = [];
          pipeline = redis.pipeline();
        }
      }
    });

    stream.on('end', () => {
      if (totalKeysToAction.length) {
        // process final batch if any
        if (currentBatchKeysToAction.length) {
          pipeline.exec(() => {
            onAllKeysProcessed();
          });
        } else {
          onAllKeysProcessed();
        }
      } else {
        onAllKeysProcessed();
      }
    });
  });
}

// translate player address into a unique accountId. AccountId is identical to player address when GAME_CONFIG.allowConcurrentWalletGotchiLogins is false like on prod
// if GAME_CONFIG.allowConcurrentWalletGotchiLogins is true we pre-pend player.id (gotchi id) to player.owner to generate a unique ID for each player
// this accountId is what the players.online redis key uses to list all players online under a unique key
// The 2nd option allowConcurrent is an override of GAME_CONFIG.allowConcurrentWalletGotchiLogins for load test bots all under one wallet address
export function getAccountId(player, allowConcurrent?) {
  // if accountId is already generated it is returned
  if (player.accountId) {
    return player.accountId;
  }
  return allowConcurrent || GAME_CONFIG.allowConcurrentWalletGotchiLogins ? player.id + '_' + player.owner : player.owner;
}

// returns the count of currently connected players across all servers
// if true is passed, the list of player objects is also returned
export async function getGlobalAccountsOnline(getMetadata?, mapId?) {
  const total = mapId ? await redis.scard(`players.online.${mapId}`) : await redis.hlen('players.online');
  if (getMetadata) {
    const players = await loadGlobalPlayersMetadata(null, mapId);
    return { players, total };
  }
  return total;
}

export async function getPlayersCurrentMapId(playerId) {
  const playerInCitadell = await redis.sismember(`players.online.${MAP_ID_CITAADEL}`, playerId);
  if (playerInCitadell !== '0') {
    return MAP_ID_CITAADEL;
  }
  const playerInArena = await redis.sismember(`players.online.${MAP_ID_AARENA}`, playerId);
  if (playerInArena !== '0') {
    return MAP_ID_AARENA;
  }

  return null;
}

// Remove account from global list of active players
// Returns 1 if successful.
export function removeAccountFromGlobalConnections(player, mapId?) {
  if (LOG_CONNECT_DISCONNECT) {
    logger.info(`removeAccountFromGlobalConnections: attempting to remove player id ${player.id} accountId ${player.accountId}`);
  }
  return new Promise(async (resolve, reject) => {
    const unresolvedPromises = [];
    if (!player || !player.accountId || !player.id || !player.owner) {
      logger.warn(`Redis removeAccountFromGlobalConnections: no player passed or missing id: ${player?.id} - ${player?.owner} - ${player?.accountId}`);
      resolve(true);
      return;
    }
    // @ts-ignore
    unresolvedPromises.push(redis.hdel('players.online', player.accountId));
    // @ts-ignore
    unresolvedPromises.push(redis.srem('addresses.online', player.owner));
    // @ts-ignore
    unresolvedPromises.push(redis.srem('gotchis.online', player.id));

    // if mapId passed, removed from one map
    if (mapId) {
      // @ts-ignore
      unresolvedPromises.push(redis.srem(`players.online.${mapId}`, player.accountId));
    } else {
      // otherwise remove from all active maps
      ENABLED_MAPS.forEach((mapId) => {
        // @ts-ignore
        unresolvedPromises.push(redis.srem(`players.online.${mapId}`, player.accountId));
      });
    }
    if (player.isSpectator) {
      // @ts-ignore
      unresolvedPromises.push(redis.srem('spectators.online', player.id));
    }

    await Promise.allSettled(unresolvedPromises);
    resolve(true);
  });
}

// loads player metadata for all players currently live across all servers
// pass one accountId to retrieve just a single player
// pass a mapId to load relative to a single map, EG  "citaadel" or "aarena"
export async function loadGlobalPlayersMetadata(accountId?, mapId?) {
  // If accountId return only one playermetadata, else return all online players
  let data = accountId ? null : [];
  if (accountId) {
    const r = await redis.hget('players.online', accountId);
    if (r) data = JSON.parse(r);
  } else {
    if (!mapId) {
      const r = await redis.hgetall('players.online');
      if (r) data = _.map(r, (p) => JSON.parse(p));
    } else {
      const playerIdsOnlineForMap = await redis.smembers(`players.online.${mapId}`);
      if (playerIdsOnlineForMap?.length) {
        const loadedPlayerMetaDatas = await redis.hmget('players.online', ...playerIdsOnlineForMap);
        loadedPlayerMetaDatas.forEach((playerMetaData, index) => {
          if (playerMetaData) {
            // @ts-ignore
            data.push(JSON.parse(playerMetaData));
          } else {
            // player ID existed in online IDs for map but player metadata was not found in the global players.online metadata object, skip
            logger.warn(`loadGlobalPlayersMetadata: error loading player ${playerIdsOnlineForMap[index]} metadata for map ${mapId}`);
          }
        });
      }
    }
  }
  return data;
}

export async function isDiscordVerifiedAddress(address) {
  if (address) {
    return await redis.hexists('discord-verified-addresses', address);
  }
}

export async function getDiscordLinkedAccountData(address) {
  if (address) {
    let discordData = await redis.hget('discord-verified-addresses', address);
    if (discordData) {
      if (isNaN(discordData)) {
        // new format, stringified json obj
        discordData = JSON.parse(discordData);
      } else {
        // old format, just a numeric score
        discordData = { score: discordData };
      }
    }
    return discordData;
  }
}

export async function getPlayerLoginData(playerIdOrOwnerId, firstLoginInsteadOfLast?) {
  let responseObj;
  if (playerIdOrOwnerId.indexOf('0x') === 0) {
    responseObj = await redis.hget(`${firstLoginInsteadOfLast ? 'first' : 'last'}-logins-owner`, playerIdOrOwnerId);
  } else {
    responseObj = await redis.hget(`${firstLoginInsteadOfLast ? 'first' : 'last'}-logins-gotchi`, playerIdOrOwnerId);
  }
  if (responseObj) {
    responseObj = JSON.parse(responseObj);
  }
  return responseObj;
}

// save global alchemica state config to Redis
export async function saveAlchemicaConfig(changesObj, broadcastToPubSub?) {
  const pipeline = redis.pipeline();

  for (const property in changesObj) {
    if (!_.has(ALCHEMICA_CONFIG, property)) {
      logger.warn(`saveAlchemicaConfig: property ${property} doesn't exist in alchemica props and will be ignored.`);
      continue;
    }
    pipeline.hset(ALCHEMICA_CONFIG_REDIS_KEY, property, JSON.stringify(changesObj[property]));
  }

  // flush redis pipeline of changes
  await pipeline.exec();

  // update local script object in case it's re-referenced
  _.assign(ALCHEMICA_CONFIG, changesObj);

  if (broadcastToPubSub) {
    await redis.publish('alchemica-config-update', JSON.stringify(changesObj));
  }
}

// load latest persistant alchemica variables to merge into defaults, this happens on server init, including after a crash
// as well as before important events like automatic alchemica spawning to ensure latest changes in redis are always reflected
export async function reloadAlchemicaConfig() {
  // FYI the redis array response is converted to an object automagically via https://github.com/luin/ioredis#transforming-arguments--replies
  let savedAlchemicaConfigObj = await redis.hgetall(ALCHEMICA_CONFIG_REDIS_KEY);
  if (savedAlchemicaConfigObj && _.keys(savedAlchemicaConfigObj).length) {
    // convert props saved as strings back into native types
    savedAlchemicaConfigObj = _.mapValues(savedAlchemicaConfigObj, function (value) {
      try {
        return JSON.parse(value);
      } catch (er) {
        return value;
      }
    });

    // update changed-from-default-properties cache to send to FE clients
    for (const property in savedAlchemicaConfigObj) {
      if (!_.has(ALCHEMICA_CONFIG, property)) {
        logger.warn(`reloadAlchemicaConfig: loaded an unknown prop from DB. Deleting: ${property}=${savedAlchemicaConfigObj[property]}`);
        // if the property doesn't exist in our default object it is a renamed or no longer used prop, delete it
        delete savedAlchemicaConfigObj[property];
        redis.hdel(ALCHEMICA_CONFIG_REDIS_KEY, property);
        continue;
      }
    }
    _.assign(ALCHEMICA_CONFIG, savedAlchemicaConfigObj);
  } else {
    // if savedAlchemicaConfigObj is an empty object it means the key has never been initialized, initialize it to defaults now
    logger.warn(`reloadAlchemicaConfig, no ${ALCHEMICA_CONFIG_REDIS_KEY} redis key found. Saving defaults:`, ALCHEMICA_CONFIG);
    await saveAlchemicaConfig(ALCHEMICA_CONFIG);
  }
  // logger.info('ALCHEMICA_CONFIG', ALCHEMICA_CONFIG, savedAlchemicaConfigObj);
  return savedAlchemicaConfigObj;
}

export function recordAlchemicaDeposit(depositObj) {
  return new Promise(async (resolve, reject) => {
    // logger.info('submit to redis log', depositObj);

    redis.hset(`gotchi:${depositObj.gotchi}`, 'alchemica', JSON.stringify([0, 0, 0, 0]), async (_err, result) => {
      // first arg is error,
      // success returns the number of keys added, 0 keys get added if key already exists and is just being updated
      if (_err) {
        logger.error('recordAlchemicaDeposit gotchi alchemica reset failed, aborting sending deposit to deposit stream for ', `gotchi:${depositObj.gotchi}`);
        reject(_err);
      } else {
        // logger.info('recordAlchemicaDeposit: remove alchemica counters done ', `gotchi:${depositObj.gotchi}`);
        // delay stream submit until alchemica syncs between redis instances
        _.delay(async function () {
          await submitToRedisStream(ALCHEMICA_DEPOSIT_STREAM_NAME, depositObj);
          // logger.info('recordAlchemicaDeposit: submitToRedisStream SUCCESS ', `gotchi:${depositObj.gotchi}`);
        }, 500);
        resolve(true);
      }
    });
  });
}

// del steam by name, xinfo will return error and next XADD will recreate
export async function clearStream(streamId) {
  await redis.del(`${streamId}-stream`);
  // recreate the consumer group to not break the service-consumers process on new entry
  await redis.xgroup('CREATE', `${streamId}-stream`, `${streamId}-consumers`, 0, 'MKSTREAM');
}

// return analytics on various Redis stream consumers like alchemica take and channeling spillover
export async function fetchConsumerStats() {
  let streamInfo = '';
  const streams = ['spillover-stream', 'alchemica-take-stream', 'alchemica-deposit-stream', 'installations-stream', 'resync-stream'];
  for (let i = 0; i < streams.length; i++) {
    const streamName = streams[i];
    let streamInfoData;
    try {
      streamInfoData = await redis.xinfo('STREAM', streamName);
    } catch (error) {
      streamInfo += `${streamName}:\r\n`;
      streamInfo += 'Steam Cleared! \r\n';
    }
    if (streamInfoData) {
      streamInfo += `${streamName}:\r\n`;
      streamInfo += `Tasks in queue: ${streamInfoData[1]}\r\n`;
      const lastProcessedEntryTimestamp = streamInfoData[7];
      if (lastProcessedEntryTimestamp) {
        streamInfo += `Last entry added: ${lastProcessedEntryTimestamp} (Created ${format(lastProcessedEntryTimestamp?.split('-')[0])})\r\n`;
      }
      const firstAddedEntry = streamInfoData[11];
      if (firstAddedEntry) {
        const firstAddedEntryTimestamp = firstAddedEntry[0];
        const firstAddEntryObj = firstAddedEntry[1];
        streamInfo += `Current entry processing: ${firstAddedEntryTimestamp} (Created ${format(firstAddedEntryTimestamp?.split('-')[0])})\r\n`;
        streamInfo += `Current entry data: ${JSON.stringify(firstAddEntryObj)}\r\n`;
      }
    }
    streamInfo += '\r\n';
  }
  return streamInfo;
}

export async function setParcelOwner(tokenId, owner) {
  const parcelId = PARCELS_BY_TOKEN_ID[tokenId].parcelId;
  if (parcelId) {
    const currentOwner = await getParcelOwnerById(parcelId);

    if (owner && currentOwner && currentOwner.toLowerCase() !== owner.toLowerCase()) {
      await redis.hset(`${process.env.ALCHEMICA_NETWORK}.parcel.owner`, parcelId, owner);

      logger.info(`Parcel ${parcelId} owner changed from ${currentOwner} to ${owner}! Resseting NFTDisplay Data for parcel ${parcelId}`);

      // also clear NFT data for the same parcel that just moved to a new owner
      const installationIds = JSON.parse(await getInstallationsByParcelId(parcelId)) || [];
      for (let i = 0; i < installationIds.length; i++) {
        const installationId = installationIds[i];
        const installationType = getInstallationTypeById(installationId);
        if (installationType?.installationType === 5) {
          await setNFTDisplay(installationId);
        }
      }
    }
  }
}

export async function getParcelOwnerById(parcelId) {
  return await redis.hget(`${process.env.ALCHEMICA_NETWORK}.parcel.owner`, parcelId);
}

export async function getParcelOwnerByTokenId(tokenId) {
  const parcelId = PARCELS_BY_TOKEN_ID[tokenId].parcelId;
  return await redis.hget(`${process.env.ALCHEMICA_NETWORK}.parcel.owner`, parcelId);
}

export async function getAllOwners() {
  return await redis.hget(`${process.env.ALCHEMICA_NETWORK}.parcel.owner`);
}

export async function setInstallationsByParcelId(parcelId, ids, remove, resync?) {
  // logger.info('@setInstallationByParceId init setter with data', parcelId, ids, remove, resync);
  if (!resync) {
    // get ids to not override the current ids.
    const currentIds = JSON.parse(await getInstallationsByParcelId(parcelId)) || [];
    // console.log('CurrentIds', currentIds, 'vs', ids);

    // check upgrades
    // loop through each current and new ids to find installations on the same position.
    _.each(currentIds, (currentId) => {
      if (!currentIds.length || !currentId) return;
      const currentX = currentId.split('_')[2];
      const currentY = currentId.split('_')[3];
      _.each(ids, (id) => {
        const x = id.split('_')[2];
        const y = id.split('_')[3];
        const type = id.split('_')[4];
        if (type !== '1' && currentX === x && currentY === y) {
          // console.log('Upgrade found for ', currentId, ' replaced with ', id);
          // if is on the same position and has the same type, pull out and it will be replace by union
          _.pull(currentIds, currentId);
          // console.log('List after replace', currentIds);
        }
      });
    });

    // console.log('CurrentState after upgrade ', currentIds, 'vs', ids);

    if (remove) {
      _.each(ids, (id) => {
        if (currentIds?.includes(id)) {
          _.pull(currentIds, id);
        }
      });
      ids = [];
    }

    ids = _.union(currentIds, ids);
    // logger.info(`Final ids for parcel ${parcelId}: `, ids);
  }

  if (!ids.length) {
    // usually for resyncs
    return await redis.hdel(`${process.env.ALCHEMICA_NETWORK}.parcel.installations`, parcelId);
  } else {
    return await redis.hset(`${process.env.ALCHEMICA_NETWORK}.parcel.installations`, parcelId, JSON.stringify(ids));
  }
}

export async function getInstallationsByParcelId(parcelId) {
  return await redis.hget(`${process.env.ALCHEMICA_NETWORK}.parcel.installations`, parcelId);
}

export async function getAllInstallations(keyByParcel?) {
  // redis.del(`${process.env.ALCHEMICA_NETWORK}.parcel.installations`);
  const r = await redis.hgetall(`${process.env.ALCHEMICA_NETWORK}.parcel.installations`);
  if (r && _.keys(r).length) {
    if (keyByParcel) {
      _.each(r, (val, key) => {
        r[key] = JSON.parse(val);
      });
      return r;
    } else {
      return _.flatMapDepth(_.map(_.values(r), (i) => JSON.parse(i)));
    }
  }
}

export async function setNFTDisplay(installationId, data?) {
  // console.log('@setNFTDisplay', installationId, JSON.stringify(data));
  if (data) {
    return await redis.hset(`${process.env.ALCHEMICA_NETWORK}.installation.nft`, installationId, JSON.stringify(data));
  } else {
    logger.info('@setNFTDisplay: Reset NFT data for:', installationId);
    await redis.hdel(`${process.env.ALCHEMICA_NETWORK}.installation.nft`, installationId);
    const parcelId = installationId.split('_')[0];
    await clearParcelResyncTimestamp(parcelId);
  }
}

export async function getNFTDisplay(installationId) {
  let nftData;
  nftData = await redis.hget(`${process.env.ALCHEMICA_NETWORK}.installation.nft`, installationId);
  if (nftData) {
    nftData = JSON.parse(nftData);
  }
  return nftData;
}

export async function getAllNFTs(keyByInstallation) {
  // redis.del(`${process.env.ALCHEMICA_NETWORK}.installation.nft`);
  const r = await redis.hgetall(`${process.env.ALCHEMICA_NETWORK}.installation.nft`);
  if (r && _.keys(r).length) {
    if (keyByInstallation) {
      _.each(r, (val, key) => {
        r[key] = JSON.parse(val);
      });
      return r;
    } else {
      return _.flatMapDepth(_.map(_.values(r), (i) => JSON.parse(i)));
    }
  }
}

// cache moralis response for 30s
export function getWalletNFTs(address, network) {
  return redis.get(`${process.env.REALM_NETWORK}:moralis:${network}:${address}`);
}

export function cacheWalletNFTs(address, network, res, ttl = 30) {
  return redis.set(`${process.env.REALM_NETWORK}:moralis:${network}:${address}`, res, 'ex', ttl);
}

// cache parcel resync for an hour
export async function getParcelResyncTimestamp(parcelId) {
  const time = await redis.hget(indexes.parcelTimestamps, parcelId);
  return time ? parseInt(time) : 0;
}
export async function getParcelResyncTimestamps(parcelIds) {
  const times = await redis.hmget(indexes.parcelTimestamps, JSON.stringify(parcelIds));
  if (times) {
    return times.map((t) => (t ? parseInt(t) : 0));
  }
  return [];
}

export function setParcelResyncTimestamp(parcelId) {
  return redis.hset(indexes.parcelTimestamps, parcelId, Date.now() / 1000);
}

export function clearParcelResyncTimestamp(parcelId) {
  return redis.hset(indexes.parcelTimestamps, parcelId, 0);
}

export function setParcelResyncTimestamps(parcelIds) {
  const params = {};
  const now = Date.now() / 1000;
  parcelIds.forEach((parcelId) => {
    params[parcelId] = now;
  });
  return redis.hmset(indexes.parcelTimestamps, params);
}

export async function saveParcelEvent(bounceGateEvent) {
  await redis.hset(`${process.env.REALM_NETWORK}.parcel.events`, bounceGateEvent.id, JSON.stringify(new BounceGateEvent(bounceGateEvent)));
}

export async function deleteParcelEvent(bounceGateEventId) {
  await redis.hdel(`${process.env.REALM_NETWORK}.parcel.events`, bounceGateEventId);
}

export async function fetchParcelEvent(parcelTokenId, noFallbackToSubgraph?) {
  let parcelEvent;
  // first check redis cache
  parcelEvent = await redis.hget(`${process.env.REALM_NETWORK}.parcel.events`, parcelTokenId);
  if (parcelEvent) {
    parcelEvent = JSON.parse(parcelEvent);
  } else if (!noFallbackToSubgraph) {
    logger.warn(`fetchParcelEvent: bounce gate event not found by parcelTokenId: ${parcelTokenId}, for "${process.env.REALM_NETWORK}" trying subgraph`);
    // next try subgraph
    const graph = isMumbai ? 'https://api.thegraph.com/subgraphs/name/froid1911/relm-1689' : gotchiverseSubgraph;
    const query = getParcelEvent(parcelTokenId);
    try {
      const res = (await useSubgraphCall(query, graph)) as { bounceGateEvents: any[] };
      if (res?.bounceGateEvents?.length) {
        parcelEvent = res.bounceGateEvents[0];

        if (parcelEvent) {
          await saveParcelEvent(parcelEvent);
        }
      } else {
        logger.warn(`fetchParcelEvent: bounce gate event not found by parcelTokenId: ${parcelTokenId} for "${process.env.REALM_NETWORK}" in subgraph either`);
      }
    } catch (error) {
      logger.warn(`fetchParcelEvent: bounce gate event not found by parcelTokenId: ${parcelTokenId},for "${process.env.REALM_NETWORK}" error checking subgraph`);
    }
  }
  return parcelEvent ? new BounceGateEvent(parcelEvent) : null;
}

// used to fetch all bounce gate events for all parcels
// pass true to rebuild redis cache directly from the subgraph
export async function fetchAllParcelEvents(rebuildFromSubgraph) {
  let parcelEvents;
  if (rebuildFromSubgraph) {
    // first remove all events assigned to this key
    await redis.del(`${process.env.REALM_NETWORK}.parcel.events`);
    const query = getAllParcelEvents();
    try {
      const graph = isMumbai ? 'https://api.thegraph.com/subgraphs/name/froid1911/relm-1689' : gotchiverseSubgraph;
      const res = (await useSubgraphCall(query, graph)) as { bounceGateEvents: any[] };
      // manual filter out wrong events
      parcelEvents = (res?.bounceGateEvents ? _.filter(res.bounceGateEvents, ({ endTime }) => endTime.toString().length <= 10) : []).map((evt) => new BounceGateEvent(evt));
    } catch (error) {
      logger.warn('fetchAllParcelEvents: error rebuilding parcel events cache from subgraph:', error);
    }
    // pulled latest list from subgraph, now save in Redis
    if (parcelEvents?.length) {
      parcelEvents = _.keyBy(parcelEvents, 'id');
      _.forEach(parcelEvents, (value, index) => {
        parcelEvents[index] = JSON.stringify(value);
      });
      // IORedis HMSET argument transformer automatically translates objects into the array format needed for Redis
      await redis.hmset(`${process.env.REALM_NETWORK}.parcel.events`, parcelEvents);
    }
  }
  // load all parcel events from Redis
  parcelEvents = await redis.hgetall(`${process.env.REALM_NETWORK}.parcel.events`);
  if (parcelEvents) {
    parcelEvents = _.map(parcelEvents, (parcelEvent) => new BounceGateEvent(JSON.parse(parcelEvent)));
  }
  return parcelEvents || [];
}

export async function fetchOwnerNoBanWhitelistEntry(owner, dontCheckAutoBanWhitelist?, dontCheckBanWhitelist?) {
  // if owner is on no a ban whitelist, this returns the reason that was added to the entry
  // if no reason boolean true is returned
  let reason;
  let list;
  if (!dontCheckAutoBanWhitelist) {
    const noBanReason = await redis.hget('no-auto-ban-owner-whitelist', owner);
    if (noBanReason) {
      reason = noBanReason;
      list = 'no-auto-ban-owner-whitelist';
    }
  }
  if (!dontCheckBanWhitelist && !list) {
    const noBanReason = await redis.hget('no-ban-owner-whitelist', owner);
    if (noBanReason) {
      reason = noBanReason;
      list = 'no-ban-owner-whitelist';
    }
  }
  if (reason) {
    try {
      reason = JSON.parse(reason);
    } catch (er) {}
  }
  return { reason, list };
}

export async function shadowBanOwner(owner, hourlyDuration, source, optionalIp, wasAutomatic?, forceBan?) {
  const banResults = {
    wasAddressBanned: false,
    newlyBannedIP: null,
    prevented: false,
    preventedReason: '',
  };
  let iP2Ban;
  if (owner) {
    if (forceBan) {
      await redis.hdel('no-auto-ban-owner-whitelist', owner);
      await redis.hdel('no-ban-owner-whitelist', owner);
    }
    // automatic bans like recaptcha low score check against both the no-automatic-ban whitelist and regular whitelist
    // not automatic = check only the regular whitelist
    const { list, reason } = await fetchOwnerNoBanWhitelistEntry(owner, !wasAutomatic);
    if (list) {
      const banType = wasAutomatic ? 'automatic' : 'manual';
      logger.warn(`shadowBanOwner: PREVENTED - a ${banType} ban for ${owner} ip: ${optionalIp} by source: ${source} was prevented by ${list} reason: ${JSON.stringify(reason)}`);
      banResults.prevented = true;
      banResults.preventedReason = `On ${list} reason: ${reason}`;
      return banResults;
    }
    const banTime = Date.now();
    const lastLoginData = await getPlayerLoginData(owner);
    const data = { banTime, source };
    if (hourlyDuration && Number(hourlyDuration) !== 0) _.assign(data, { hourlyDuration });

    // firstly ban on IP as owner can change address easily
    iP2Ban = optionalIp || lastLoginData?.ip;
    // look up new IP location to attach to the ban
    let ipLocation;
    if (iP2Ban) {
      ipLocation = await getPlayerLocationDataByIP(iP2Ban);
      const shadowBanCountry = ipLocation?.country;
      // don't ban by IP in whitelist countries not known for botting
      if (!GAME_CONFIG.shadowBanIpCountryWhiteList.includes(shadowBanCountry)) {
        // check if IP ban is already present
        const prevIPBan = await redis.hexists('shadow-banned-ips', iP2Ban);
        if (!prevIPBan) {
          banResults.newlyBannedIP = iP2Ban;
          await redis.hmset('shadow-banned-ips', iP2Ban, JSON.stringify(_.assign(data, { owner: owner, ipLocation })));
        }
      }
    }

    const existingOwnerBan = await redis.hexists('shadow-banned-owners', owner);
    if (!existingOwnerBan) {
      banResults.wasAddressBanned = true;
      await redis.hmset('shadow-banned-owners', owner, JSON.stringify(_.assign({}, data, { ip: lastLoginData?.ip || 'Unknown', ipLocation })));
      logger.warn(`shadowBanOwner: BANNED - ${owner} ip: ${iP2Ban} by source: ${source}`);
      // shadowBan online players
      /*
      if (lastLoginData?.gotchi) {
        // if player is online we need to update all other servers via redis pub/sub so an admin there will see the player state reflected live as well
        await redis.publish('players', JSON.stringify({ action: 'update-player-prop', data: { id: lastLoginData.gotchi, props: { isShadowBanned: true } } }));
      }
      */
      // broadcast a kick of this player and any other IPs this player is associated with
      broadcastToPubSub('kick', { ip: iP2Ban, owner: owner });
      // save a sample of shadow banned player socket data for analysis
      redis.publish('players', JSON.stringify({ action: 'sample-player-socket', data: { owner: owner } }));
    } else {
      banResults.prevented = true;
      banResults.preventedReason = 'Already on shadow banned owners list';
    }
  }
  return banResults;
}

export async function fetchShadowBannedOwnerEntry(owner, noIPCheck) {
  let isBanned = owner && (await redis.hget('shadow-banned-owners', owner));
  if (isBanned) {
    isBanned = JSON.parse(isBanned);
  }
  if (!isBanned && owner && !noIPCheck) {
    // check last login IP
    let lastLoginData = await redis.hget('last-logins-owner', owner);
    if (lastLoginData) {
      lastLoginData = JSON.parse(lastLoginData);
    }
    if (lastLoginData?.ip) {
      isBanned = await redis.hget('shadow-banned-ips', lastLoginData.ip);
    }
  }
  return isBanned;
}

export async function unbanOwner(owner, ip2Unban, isShadowBan = false, source?, addToNoAutoBanWhitelist?, addToNeverBanWhitelist?) {
  let unbanned = false;
  if (ip2Unban && !_.isArray(ip2Unban)) {
    ip2Unban = [ip2Unban];
  }
  if (!ip2Unban) {
    ip2Unban = [];
  }
  if (owner) {
    const banStatusObj = await redis.hget(isShadowBan ? 'shadow-banned-owners' : 'banned-owners', owner);
    if (banStatusObj) {
      if (banStatusObj.ip) {
        ip2Unban.push(banStatusObj.ip);
      }
      await redis.hdel(isShadowBan ? 'shadow-banned-owners' : 'banned-owners', owner);
      unbanned = true;
      if (isShadowBan) {
        // when unbanning a player, we also should check for last login IP and unban that as it was likely banned
        // and may be different then the IP that was originally banned
        const lastOwnerLoginData = await getPlayerLoginData(owner);
        if (lastOwnerLoginData?.ip) {
          ip2Unban.push(lastOwnerLoginData.ip);
        }
        const onlinePlayer = _.find(PLAYERS_BY_ID, ['owner', owner]);
        if (onlinePlayer) {
          onlinePlayer.isShadowBanned = false;
          // if player is online we need to update all other servers via redis pub/sub so an admin there will see the player state reflected live as well
          await redis.publish('players', JSON.stringify({ action: 'update-player-prop', data: { id: onlinePlayer.id, props: { isShadowBanned: false } } }));
        }
      }
    }
    // when an address gets unbanned we now add the address to a whitelist to not auto-ban again
    // since sometimes the reCAPTCHA algo will constantly reban the same owners
    if (addToNoAutoBanWhitelist) {
      addToNoBanWhitelist(owner, true, source || true);
    }
    if (addToNeverBanWhitelist) {
      addToNoBanWhitelist(owner, false, source || true);
    }
  }
  if (ip2Unban) {
    if (_.isArray(ip2Unban)) {
      for (const num in ip2Unban) {
        const ip = ip2Unban[num];
        if (ip) {
          const deleteCount = await redis.hdel('shadow-banned-ips', ip);
          if (deleteCount) {
            unbanned = true;
          }
        }
      }
    } else {
      const deleteCount = await redis.hdel('shadow-banned-ips', ip2Unban);
      if (deleteCount) {
        unbanned = true;
      }
    }
  }
  return unbanned;
}

export async function addToNoBanWhitelist(owner, autoBansOnly, source) {
  if (owner) {
    if (autoBansOnly) {
      redis.hmset('no-auto-ban-owner-whitelist', owner, JSON.stringify({ source: source || true, time: Date.now() }));
    } else {
      redis.hmset('no-ban-owner-whitelist', owner, JSON.stringify({ source: source || true, time: Date.now() }));
    }
  }
}

// if isShadowBan = true you can pass an IP to additionally check for shadow ban at the IP level
export async function getBanStatus(owner, isShadowBan?, ipToCheckShadowBan?) {
  let banStatusObj;
  if (owner) {
    banStatusObj = await redis.hget(isShadowBan ? 'shadow-banned-owners' : 'banned-owners', owner);
    // if a ban status object exists, check if it's expired
    if (banStatusObj) {
      banStatusObj = JSON.parse(banStatusObj);
      if (!banStatusObj.hourlyDuration) {
        banStatusObj.indefinite = true;
      } else {
        const currentTime = Date.now();
        const banSecondsLeft = banStatusObj.banTime / 1000 + banStatusObj.hourlyDuration * 3600 - currentTime / 1000;
        if (banSecondsLeft <= 0) {
          // ban time has ended, delete the ban entry
          unbanOwner(owner, banStatusObj.ip, isShadowBan);
          banStatusObj = null;
        } else {
          banStatusObj.banSecondsLeft = banSecondsLeft;
        }
      }
    }
  }
  if (!banStatusObj && isShadowBan && ipToCheckShadowBan) {
    // {"banTime":1650329016937,"source":"manual","owner":"0x346e7d415382b91905080ccdae6e5147866a6561"}
    let banStatusObjIP = await redis.hget('shadow-banned-ips', ipToCheckShadowBan);
    // the owner did not have a ban on owner address but DID have one on IP
    if (banStatusObjIP) {
      // firt check if the IP ban is stale and should be cleared
      const discordScore = (await getDiscordLinkedAccountData(owner))?.score;
      if (discordScore >= 12) {
        logger.warn(`banStatus: IPHIT with discord >12 = Unban IP ${ipToCheckShadowBan} for owner:${owner}`);
        await unbanOwner(owner, ipToCheckShadowBan, true, 'high-discord-score-ip-hit-unban');
        banStatusObjIP = null;
      }
    }
    return banStatusObjIP ? _.assign({ ipHit: ipToCheckShadowBan }, banStatusObjIP) : null;
  }
  return banStatusObj;
}

// utility method for bot banning / analytics purposes
export async function getPlayerLocationDataByIP(ip) {
  if (!ip) {
    return;
  }
  let ipLocData;
  const cachedIPLocData = await redis.hget('ip-location-cache', ip);
  if (cachedIPLocData) {
    ipLocData = JSON.parse(cachedIPLocData);
  }
  if (!ipLocData || ipLocData.country === 'UNKNOWN') {
    // add delay to avoid free location api rate limit
    await new Promise((resolve) => setTimeout(() => resolve(true), Math.round(Math.random() * 1000)));
    let fetchedLocData;
    try {
      // This uses a free IP lookup API: https://ipapi.co/ that is limited to 30k lookups a month (1k in 24 hours) for the free no-api key version so we cache in Redis
      // There is also a minutely rate limit that is unclear so we make calls to this service slowly every .5 sec
      fetchedLocData = await axios.get(`https://ipapi.co/${ip}/json/`);
    } catch (er) {
      console.warn('getPlayerLocationDataByIP: Error running IP lookup', er?.message);
    }
    const country = fetchedLocData?.data?.country_name || 'UNKNOWN';
    const city = fetchedLocData?.data?.city || 'UNKNOWN';
    const region = fetchedLocData?.data?.region || 'UNKNOWN';
    const provider = fetchedLocData?.data?.org || 'UNKNOWN';
    ipLocData = { country, city, region, provider };
    // don't cache failed lookups
    if (country && country !== 'UNKNOWN') {
      await redis.hmset('ip-location-cache', ip, JSON.stringify(ipLocData));
    }
  }
  return ipLocData;
}

export async function getGotchiLastLoginData(gotchiId) {
  return redis.hget('last-logins-gotchi', gotchiId);
}

export async function fetchGotchiRealmStats(gotchiId) {
  const gotchiStats = {
    isOnline: false,
    lastLoginUTCday: null,
    lastLoginTimestamp: null,
    lastLoginOwner: null,
    pocketAlchemica: null,
    lastMapPos: null,
    name: '',
    isLent: false,
    lastLoginTimeAgo: null,
    lastLoginIp: '',
    lastLoginLocation: '',
    banStatus: null,
    shadowBanStatus: null,
    alchemicaRefundable: null,
    server: null,
    discordLinked: false,
    discordData: null,
  };
  // first verify that gotchi has ever logged into Realm
  let lastLoginData = await getGotchiLastLoginData(gotchiId);
  if (lastLoginData) {
    lastLoginData = JSON.parse(lastLoginData);
    const lastOwner = lastLoginData.owner;
    const accountId = getAccountId({ id: gotchiId, owner: lastOwner });
    const isLoggedIn = await redis.hexists('players.online', accountId);
    gotchiStats.name = `"${lastLoginData.name}"`;
    gotchiStats.lastLoginUTCday = lastLoginData.date;
    gotchiStats.isLent = lastLoginData.isLent;
    const timeAgo = format(lastLoginData.time);
    gotchiStats.lastLoginTimestamp = lastLoginData.time;
    // @ts-ignore
    gotchiStats.lastLoginTimeAgo = timeAgo;
    gotchiStats.lastLoginOwner = lastOwner;
    gotchiStats.lastLoginIp = lastLoginData.ip;
    gotchiStats.lastLoginLocation = await getPlayerLocationDataByIP(lastLoginData.ip);
    gotchiStats.banStatus = await getBanStatus(lastOwner);
    gotchiStats.shadowBanStatus = await getBanStatus(lastOwner, true, lastLoginData?.ip);
    let alchemicaRefundableObj = await redis.hget('auto-shadow-ban-funds-recovery', gotchiId);
    if (alchemicaRefundableObj) {
      alchemicaRefundableObj = JSON.parse(alchemicaRefundableObj);
      gotchiStats.alchemicaRefundable = alchemicaRefundableObj.alchemica;
    }
    gotchiStats.server = lastLoginData.server;
    gotchiStats.isOnline = !!isLoggedIn;
    // gotchiProps { alchemica: '[0.2,0.2,0.3,1.3]', health: '100' }
    const gotchiProps = await redis.hgetall(`gotchi:${gotchiId}`);
    const alchemica = gotchiProps.alchemica && JSON.parse(gotchiProps.alchemica);
    gotchiStats.pocketAlchemica = alchemica;
    let gotchiMapPos = await redis.get(`player.map.position:${lastOwner}-${gotchiId}`);
    if (gotchiMapPos) {
      gotchiMapPos = gotchiMapPos.split(',');
      if (gotchiMapPos.length === 2) {
        gotchiMapPos[0] = Math.round(gotchiMapPos[0]);
        gotchiMapPos[1] = Math.round(gotchiMapPos[1]);
      }
    }
    gotchiStats.lastMapPos = gotchiMapPos;
    const discordConnectData = await getDiscordLinkedAccountData(lastOwner);
    gotchiStats.discordLinked = Boolean(discordConnectData);
    gotchiStats.discordData = discordConnectData;
    if (discordConnectData) {
      discordConnectData.linkedTimeAgo = format(discordConnectData.time);
    }
  }
  return gotchiStats;
}

export async function loadPlayerGlobalPosition(id, owner) {
  const playerPosString = await redis.get(`player.map.position:${owner}-${id}`);
  if (playerPosString) {
    const x = Number(playerPosString.split(',')[0]);
    const y = Number(playerPosString.split(',')[1]);
    return {
      x,
      y,
    };
  }
  return {};
}

// generate Gotchi's player.equippedQuickslots array with ex. [{ id: itemId, quantity: 5}, ....]
// first leverage saved slots explicitly set by the user in player.quickslots which contains a map of quickslot index to inventory itemId
// note that quickslot slots and inventory slot positions can be different for future proofing as quickslot can come from any inventory item
// we then auto populate null quickslots with inventory items from full inventory using the chronological order they exist there
// each quickslot index is then expanded to include the quantity remaining.
// This is saved in player.equippedQuickslots so player.quickslots can be re-referenced to rebuild it if necesssary
// pass dispatchChanges = true to dispatch pub/sub update if existing quickslots change
export async function populateGotchiQuickslots(player, dispatchChanges) {
  let quickslots;
  if (player?.id) {
    // first load user manually eqipped slots if not already loaded
    if (!player.quickslots) {
      const loadedSlots = await redis.hget(`gotchi:${player.id}`, 'quickslots');
      player.quickslots = loadedSlots ? JSON.parse(loadedSlots) : [];
    }
    quickslots = player?.quickslots?.slice(0) || [];
    const populatedQuickslotCount = quickslots.filter((item) => Boolean(item));
    // pad out empty slots with inventory items
    let extraInventoryItemIds = [];
    if (populatedQuickslotCount !== GAME_CONFIG.inventoryQuickslots) {
      extraInventoryItemIds = await fetchGotchiInventoryItemIdsByPosition(player.id, GAME_CONFIG.inventoryQuickslots);
      // filter down to inventory items that aren't already in inventory
      extraInventoryItemIds = extraInventoryItemIds.filter((itemId) => !quickslots.includes(itemId));
    }

    // if all quickslots aren't expicitly equipped and we have inventory items not equipped, populate them
    if (populatedQuickslotCount < GAME_CONFIG.inventoryQuickslots && extraInventoryItemIds.length) {
      for (let i = 0; i < GAME_CONFIG.inventoryQuickslots; i++) {
        if (!quickslots[i]) {
          quickslots[i] = extraInventoryItemIds.shift();
        }
        if (!extraInventoryItemIds.length) {
          break;
        }
      }
    }

    const quickslotItemIdsNeedingQuantity = quickslots.filter((item) => Boolean(item));
    const quickslotToItemCount = await fetchGotchiInventoryItemQuantitiesByItemIds(player.id, quickslotItemIdsNeedingQuantity);
    quickslotToItemCount.forEach((item, index) => {
      const itemId = quickslotItemIdsNeedingQuantity[index];
      const quantity = Number(item) || 0;
      const quickslotIndex = quickslots.indexOf(itemId);
      if (quickslotIndex !== -1) {
        quickslots[quickslotIndex] = { id: itemId, quantity, slotIndex: quickslotIndex };
      }
      if (!player.quickslots.includes(itemId)) {
        quickslots[quickslotIndex].auto = true;
      }
    });
  }

  // if dispatch changes flag is set it means there was a gotchi inventory change that might have updated quickslots
  // in this case if player.equippedQuickslots already exists, diff and dispatch any changes before overwriting the previous state
  if (dispatchChanges && player.mapId) {
    const maxQuickslotsLength = Math.max(player.equippedQuickslots?.length || 0, quickslots.length);
    const quickSlotChanges = {};
    for (let slotIndex = 0; slotIndex < maxQuickslotsLength; slotIndex++) {
      let idChanged, quantityChanged;
      if (!player.equippedQuickslots || !quickslots[slotIndex] || player.equippedQuickslots[slotIndex]?.id !== quickslots[slotIndex]?.id) {
        idChanged = true;
      }
      if (!player.equippedQuickslots || !quickslots[slotIndex] || player.equippedQuickslots[slotIndex]?.quantity !== quickslots[slotIndex]?.quantity) {
        quantityChanged = true;
      }
      if (idChanged || quantityChanged) {
        if (!quickslots[slotIndex]) {
          // slot was deleted, send a null object to represent that
          quickSlotChanges[slotIndex] = null;
        } else {
          quickSlotChanges[slotIndex] = {};
          if (idChanged) {
            quickSlotChanges[slotIndex].id = quickslots[slotIndex].id;
            // add auto: true if item is not part of player's manual set quickslot items
            if (player.quickslots && !player.quickslots.includes(quickslots[slotIndex].id)) {
              quickSlotChanges[slotIndex].auto = true;
            }
          }
          // quantity always changes if ID changes
          quickSlotChanges[slotIndex].quantity = quickslots[slotIndex].quantity;
        }
      }
    }
    if (Object.keys(quickSlotChanges).length) {
      publishEventForMap(redis, player.mapId, 'inventory', null, null, { action: 'quickslot-update', data: { gotchiId: player.id, updatesByIndex: quickSlotChanges } }, false);
    }
  }
  player.equippedQuickslots = quickslots;
  return quickslots;
}

// return an array of itemIds for the first X chronlogical gotchi inventory positions
// note this is for the general inventory, not quickslots
export async function fetchGotchiInventoryItemIdsByPosition(gotchiId, slotCount) {
  let inventoryIds = [];
  if (gotchiId && slotCount) {
    inventoryIds = await redis.lrange(`gotchi:${gotchiId}:inventory-positions`, 0, slotCount - 1);
  }
  return inventoryIds;
}

// return an an object hash of itemIds to quantities for an array of itemIdsAr
export async function fetchGotchiInventoryItemQuantitiesByItemIds(gotchiId, itemIdsAr) {
  let itemQuantities = [];
  if (gotchiId && itemIdsAr?.length) {
    itemQuantities = await redis.hmget(`gotchi:${gotchiId}:inventory`, ...itemIdsAr);
  }
  return itemQuantities;
}

// return an array of {id: itemId, quantity: itemQuantity} for the first X chronlogical gotchi inventory positions
export async function fetchGotchiInventoryItemsByPosition(gotchiId, slotCount) {
  const inventoryItems = [];
  if (gotchiId && slotCount) {
    const inventoryIds = await fetchGotchiInventoryItemIdsByPosition(gotchiId, slotCount);
    if (inventoryIds?.length) {
      const itemQuantities = await fetchGotchiInventoryItemQuantitiesByItemIds(gotchiId, inventoryIds);
      inventoryIds.forEach((id, index) => {
        // @ts-ignore
        inventoryItems[index] = { id, quantity: Number(itemQuantities[index]) || 0 };
      });
    }
  }
  return inventoryItems;
}

export function getGotchiAlchemica(gotchiId) {
  return redis.hget(`gotchi:${gotchiId}`, 'alchemica');
}

// return an key val map of active Item Store items to current quantity remaining for sale
export async function fetchItemStoreInventory() {
  const itemStoreItemsToQuantities = await redis.hgetall('item-shop-quantity');

  Object.keys(itemStoreItemsToQuantities).forEach((key) => {
    itemStoreItemsToQuantities[key] = Number(itemStoreItemsToQuantities[key]) || 0;
  });

  return itemStoreItemsToQuantities;
}

// used to fetch the Redis based player wallet for an address
// response looks like this: {FUD: 0.43, FOMO: 23.4, ...} or an empty object is returned
export async function loadPlayerWallet(address) {
  const playerWallet = (await redis.hgetall(`wallet:${address}`)) || {};
  // convert values back from serialized strings back to numbers
  for (const [key, value] of Object.entries(playerWallet)) {
    playerWallet[key] = Number(value);
  }
  return playerWallet;
}

export async function logAlchemicaPickup(playerId, item) {
  const type = item.label.toLowerCase();
  const fud = type === 'fud' ? item.quantity : 0;
  const fomo = type === 'fomo' ? item.quantity : 0;
  const alpha = type === 'alpha' ? item.quantity : 0;
  const kek = type === 'kek' ? item.quantity : 0;

  // intentionally using short vars here for less redis data to store
  return redis.lpush(
    PLAYER_PICKUP_LOGS,
    JSON.stringify({
      p: playerId,
      a: [fud, fomo, alpha, kek],
      t: Date.now(),
    })
  );
}

export async function logPlayerWithdraw(transactionId, { gotchi, quantity, alchemica, playerPos, ip }) {
  const alchemicaArray = JSON.parse(alchemica);
  // coordinates aren't passed if withdraw is initiated by the end of a lending contract
  const coords = playerPos ? playerPos.split(',') : null;

  // intentionally using short vars here for less redis data to store
  return redis.lpush(
    PLAYER_WITHDRAW_LOGS,
    JSON.stringify({
      p: gotchi,
      a: alchemicaArray,
      t: Date.now(),
      id: transactionId,
      q: parseFloat(quantity),
      pos: {
        x: coords ? parseInt(coords[0]) : null,
        y: coords ? parseInt(coords[1]) : null,
      },
      ip,
    })
  );
}

export async function getPickups(start, count) {
  return redis.lrange(PLAYER_PICKUP_LOGS, start, start + count);
}

export async function getWithdraws(start, count) {
  return redis.lrange(PLAYER_WITHDRAW_LOGS, start, start + count);
}

export function emptyPickups() {
  return redis.del(PLAYER_PICKUP_LOGS);
}

export function emptyWithdraws() {
  return redis.del(PLAYER_WITHDRAW_LOGS);
}

export function getCacheKey(key) {
  return redis.get(`cache:${process.env.REALM_NETWORK}:${key}`);
}

export function setCacheKey(key, ttl = 300) {
  return redis.set(`cache:${process.env.REALM_NETWORK}:${key}`, Date.now(), 'ex', ttl);
}

export function clearCacheKey(key) {
  return redis.del(`cache:${process.env.REALM_NETWORK}:${key}`);
}

export function storeJoinQueueSize(mapId, size) {
  return redis.set(`join-queue-size:${mapId}`, size);
}
export function getJoinQueueSize(mapId) {
  return redis.get(`join-queue-size:${mapId}`);
}

const allTimeKey = 'all-time';
export const damageTypes = ['melee', 'range', 'rush', 'snipe', 'hazard'];

const leaderboardIndexes = {
  lastHitTime: 'leaderboard:last-hit-time',
  lastDeathTime: 'leaderboard:last-death-time',
  killStreak: 'leaderboard:kill-streak',
  bestKillStreak: 'leaderboard:best-kill-streak',
  killDeathRatio: 'leaderboard:kd-ratio',
};

const leaderboardIndexesByDay = {
  hitsSent: (day) => `leaderboard:${day}:hits-sent`,
  hitsReceived: (day) => `leaderboard:${day}:hits-received`,
  kills: (day) => `leaderboard:${day}:kills:all`,
  deaths: (day) => `leaderboard:${day}:deaths:all`,
  tips: (day) => `leaderboard:${day}:tips`,
  spawnCount: (day) => `leaderboard:${day}:spawn-count`,
  sessionTimes: (day) => `leaderboard:${day}:session-times`,
};

const leaderboardIndexesByDamageType = {
  kills: (day, type) => `leaderboard:${day}:kills:${type.toLowerCase()}`,
  deaths: (day, type) => `leaderboard:${day}:deaths:${type.toLowerCase()}`,
  damageDealt: (day, type) => `leaderboard:${day}:damage-dealt:${type.toLowerCase()}`,
  damageTaken: (day, type) => `leaderboard:${day}:damage-taken:${type.toLowerCase()}`,
};

const leaderboardIndexesByAlchemicaType = {
  pickups: (day, alc) => `leaderboard:${day}:pickups:${alc.toLowerCase()}`,
  drops: (day, alc) => `leaderboard:${day}:drops:${alc.toLowerCase()}`,
  tipsSent: (day, alc) => `leaderboard:${day}:tips-sent:${alc.toLowerCase()}`,
};

// enemy aka destructible
const enemyTypes = Object.keys(ENEMY_DEFAULTS);
const leaderboardIndexesByDestructibleType = {
  kills: (day, type) => `leaderboard:${day}:destructible:${type.toLowerCase()}:kills`,
  hits: (day, type) => `leaderboard:${day}:destructible:${type.toLowerCase()}:hits`,
  spawns: (day, type) => `leaderboard:${day}:destructible:${type.toLowerCase()}:spawns`,
  purchases: (day, type) => `leaderboard:${day}:destructible:${type.toLowerCase()}:purchases`,
  playersKilled: (day, type) => `leaderboard:${day}:destructible:${type.toLowerCase()}:players-killed`,
  playersHit: (day, type) => `leaderboard:${day}:destructible:${type.toLowerCase()}:players-hit`,
};

const leaderboardIndexesByItemTypeId = {
  uses: (day, itemTypeId) => `leaderboard:${day}:item:${itemTypeId}:uses`,
};

const convertObjToSortedList = (obj) => {
  const list = [];

  if (obj) {
    const keys = Object.keys(obj);
    keys.forEach((key) => {
      // @ts-ignore
      list.push({
        player: key,
        value: obj[key],
      });
    });
    // @ts-ignore
    list.sort((a, b) => b.value - a.value);
  }

  return list;
};

export const leaderboard = {
  getListByDay: {
    async hitsSent(day) {
      const key = leaderboardIndexesByDay.hitsSent(day);
      const obj = await redis.hgetall(key);
      return convertObjToSortedList(obj);
    },
    async bestKillStreak() {
      const key = leaderboardIndexes.bestKillStreak;
      const obj = await redis.hgetall(key);
      return convertObjToSortedList(obj);
    },
    async spawnCount(day) {
      const key = leaderboardIndexesByDay.spawnCount(day);
      const obj = await redis.hgetall(key);
      return convertObjToSortedList(obj);
    },
    async kills(day, type) {
      const key = type ? leaderboardIndexesByDamageType.kills(day, type) : leaderboardIndexesByDay.kills(day);
      const obj = await redis.hgetall(key);
      return convertObjToSortedList(obj);
    },
    async deaths(day, type) {
      const key = type ? leaderboardIndexesByDamageType.deaths(day, type) : leaderboardIndexesByDay.deaths(day);
      const obj = await redis.hgetall(key);
      return convertObjToSortedList(obj);
    },
    async killDeathRatio(day, type?) {
      const key = type ? leaderboardIndexesByDamageType.kills(day, type) : leaderboardIndexesByDay.kills(day);
      const obj = await redis.hgetall(key);
      return convertObjToSortedList(obj);
    },
    async tips(day) {
      const key = leaderboardIndexesByDay.tips(day);
      const obj = await redis.hgetall(key);
      return convertObjToSortedList(obj);
    },
    async tipsSent(day) {
      const obj = {};
      for (let i = 0; i < alchTypes.length; i++) {
        const alchType = alchTypes[i];
        const key = leaderboardIndexesByAlchemicaType.tipsSent(day, alchType);
        const alchValue = alchValues[alchType];
        const current = await redis.hgetall(key);
        Object.keys(current).forEach((playerId) => {
          if (!obj[playerId]) {
            obj[playerId] = {
              total: 0,
              weightedTotal: 0,
            };
          }
          const qty = parseFloat(current[playerId]) || 0;
          obj[playerId].total += qty;
          obj[playerId].weightedTotal += qty * alchValue;
        });
      }
      return convertObjToSortedList(obj);
    },
    async damageDealt(day) {
      const obj = {};
      for (let i = 0; i < damageTypes.length; i++) {
        const damageType = damageTypes[i];
        const key = leaderboardIndexesByDamageType.damageDealt(day, damageType);
        const current = await redis.hgetall(key);
        Object.keys(current).forEach((playerId) => {
          if (!obj[playerId]) {
            obj[playerId] = 0;
          }
          const qty = parseFloat(current[playerId]) || 0;
          obj[playerId] += qty;
        });
      }
      return convertObjToSortedList(obj);
    },
    async pickups(day) {
      const obj = {};
      for (let i = 0; i < alchTypes.length; i++) {
        const alchType = alchTypes[i];
        const key = leaderboardIndexesByAlchemicaType.pickups(day, alchType);
        const current = await redis.hgetall(key);
        Object.keys(current).forEach((playerId) => {
          if (!obj[playerId]) {
            obj[playerId] = 0;
          }
          const qty = parseFloat(current[playerId]) || 0;
          obj[playerId] += qty;
        });
      }
      return convertObjToSortedList(obj);
    },
    async sessionTimes(day) {
      const key = leaderboardIndexesByDay.sessionTimes(day);
      const obj = await redis.hgetall(key);
      return convertObjToSortedList(obj);
    },
    async itemsUsed(day) {
      const obj = {};
      for (let i = 0; i < itemTypeIds.length; i++) {
        const itemTypeId = itemTypeIds[i];
        const key = leaderboardIndexesByItemTypeId.uses(day, itemTypeId);
        const current = await redis.hgetall(key);
        Object.keys(current || []).forEach((playerId) => {
          if (!obj[playerId]) {
            obj[playerId] = 0;
          }
          const qty = parseFloat(current[playerId]) || 0;
          obj[playerId] += qty;
        });
      }
      return convertObjToSortedList(obj);
    },
  },

  getListAllTime: {
    hitsSent: () => leaderboard.getListByDay.hitsSent(allTimeKey),
    bestKillStreak: () => leaderboard.getListByDay.bestKillStreak(),
    spawnCount: () => leaderboard.getListByDay.spawnCount(allTimeKey),
    killDeathRatio: () => leaderboard.getListByDay.killDeathRatio(allTimeKey),
    kills: (type) => leaderboard.getListByDay.kills(allTimeKey, type),
    damageDealt: (type) => leaderboard.getListByDay.damageDealt(allTimeKey),
    tips: () => leaderboard.getListByDay.tips(allTimeKey),
    tipsSent: () => leaderboard.getListByDay.tipsSent(allTimeKey),
    deaths: (type) => leaderboard.getListByDay.deaths(allTimeKey, type),
    pickups: () => leaderboard.getListByDay.pickups(allTimeKey),
    sessionTimes: () => leaderboard.getListByDay.sessionTimes(allTimeKey),
    itemsUsed: () => leaderboard.getListByDay.itemsUsed(allTimeKey),
  },

  getPlayerByDay: {
    async lastHitTime(player) {
      const key = leaderboardIndexes.lastHitTime;
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async killDeathRatio(player) {
      const key = leaderboardIndexes.killDeathRatio;
      const value = await redis.hget(key, player);
      return parseFloat(value) || 0;
    },
    async killStreak(player) {
      const key = leaderboardIndexes.killStreak;
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async bestKillStreak(player) {
      const key = leaderboardIndexes.bestKillStreak;
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async hitsSent(day, player) {
      const key = leaderboardIndexesByDay.hitsSent(day);
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async hitsReceived(day, player) {
      const key = leaderboardIndexesByDay.hitsReceived(day);
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async spawnCount(day, player) {
      const key = leaderboardIndexesByDay.spawnCount(day);
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async kills(day, player, type?) {
      if (!type) {
        const key = leaderboardIndexesByDay.kills(day);
        const value = await redis.hget(key, player);
        return parseInt(value) || 0;
      }

      const key = leaderboardIndexesByDamageType.kills(day, type);
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async deaths(day, player, type?) {
      if (!type) {
        const key = leaderboardIndexesByDay.deaths(day);
        const value = await redis.hget(key, player);
        return parseInt(value) || 0;
      }

      const key = leaderboardIndexesByDamageType.deaths(day, type);
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async damageDealt(day, player, type) {
      if (!type) {
        // return all types
        let total = 0;
        for (let i = 0; i < damageTypes.length; i++) {
          const t = damageTypes[i];
          const key = leaderboardIndexesByDamageType.damageDealt(day, t);
          const value = await redis.hget(key, player);
          if (value) {
            total += parseInt(value);
          }
        }
        return total;
      }

      const key = leaderboardIndexesByDamageType.damageDealt(day, type);
      const value = await redis.hget(key, player);
      return parseFloat(value) || 0;
    },
    async damageTaken(day, player, type) {
      if (!type) {
        // return all types
        let total = 0;
        for (let i = 0; i < damageTypes.length; i++) {
          const t = damageTypes[i];
          const key = leaderboardIndexesByDamageType.damageTaken(day, t);
          const value = await redis.hget(key, player);
          if (value) {
            total += parseInt(value);
          }
        }
        return total;
      }

      const key = leaderboardIndexesByDamageType.damageTaken(day, type);
      const value = await redis.hget(key, player);
      return parseFloat(value) || 0;
    },
    async lastDeathTime(player) {
      const key = leaderboardIndexes.lastDeathTime;
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async pickups(day, player) {
      const alchemica = [];
      for (let i = 0; i < alchTypes.length; i++) {
        const alchType = alchTypes[i];
        const key = leaderboardIndexesByAlchemicaType.pickups(day, alchType);
        const current = await redis.hget(key, player);
        // @ts-ignore
        alchemica.push(parseFloat(current) || 0);
      }
      return alchemica;
    },
    async drops(day, player) {
      const alchemica = [];
      for (let i = 0; i < alchTypes.length; i++) {
        const alchType = alchTypes[i];
        const key = leaderboardIndexesByAlchemicaType.drops(day, alchType);
        const current = await redis.hget(key, player);
        // @ts-ignore
        alchemica.push(parseFloat(current) || 0);
      }
      return alchemica;
    },
    async tips(day, player) {
      // # of times tipped
      const key = leaderboardIndexesByDay.tips(day);
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async tipsSent(day, player) {
      // specific coins tipped
      const alchemica = [];
      let total = 0;
      let weightedTotal = 0;
      for (let i = 0; i < alchTypes.length; i++) {
        const alchType = alchTypes[i];
        const key = leaderboardIndexesByAlchemicaType.tipsSent(day, alchType);
        const alchValue = alchValues[alchType];
        const current = await redis.hget(key, player);
        const qty = parseFloat(current) || 0;
        // @ts-ignore
        alchemica.push(qty);
        weightedTotal += qty * alchValue;
        total += qty;
      }
      return {
        alchemica,
        total,
        weightedTotal,
      };
    },
    async sessionTimes(day, player) {
      const key = leaderboardIndexesByDay.sessionTimes(day);
      const currentPlayerTime = await redis.hget(key, player);
      return parseInt(currentPlayerTime) || 0;
    },
    async destructiblesKilled(day, player, type) {
      if (!type) {
        // return all types
        let total = 0;
        for (let i = 0; i < enemyTypes.length; i++) {
          const t = enemyTypes[i];
          const key = leaderboardIndexesByDestructibleType.kills(day, t);
          const value = await redis.hget(key, player);
          if (value) {
            total += parseInt(value);
          }
        }
        return total;
      }

      const key = leaderboardIndexesByDestructibleType.kills(day, type);
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async destructiblesHit(day, player, type) {
      if (!type) {
        // return all types
        let total = 0;
        for (let i = 0; i < enemyTypes.length; i++) {
          const t = enemyTypes[i];
          const key = leaderboardIndexesByDestructibleType.hits(day, t);
          const value = await redis.hget(key, player);
          if (value) {
            total += parseInt(value);
          }
        }
        return total;
      }

      const key = leaderboardIndexesByDestructibleType.hits(day, type);
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async destructiblesSpawn(day, player, type) {
      if (!type) {
        // return all types
        let total = 0;
        for (let i = 0; i < enemyTypes.length; i++) {
          const t = enemyTypes[i];
          const key = leaderboardIndexesByDestructibleType.spawns(day, t);
          const value = await redis.hget(key, player);
          if (value) {
            total += parseInt(value);
          }
        }
        return total;
      }

      const key = leaderboardIndexesByDestructibleType.spawns(day, type);
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async destructiblesPurchase(day, player, type) {
      if (!type) {
        // return all types
        let total = 0;
        for (let i = 0; i < enemyTypes.length; i++) {
          const t = enemyTypes[i];
          const key = leaderboardIndexesByDestructibleType.purchases(day, t);
          const value = await redis.hget(key, player);
          if (value) {
            total += parseInt(value);
          }
        }
        return total;
      }

      const key = leaderboardIndexesByDestructibleType.purchases(day, type);
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async destructiblesPlayersKilled(day, player, type) {
      if (!type) {
        // return all types
        let total = 0;
        for (let i = 0; i < enemyTypes.length; i++) {
          const t = enemyTypes[i];
          const key = leaderboardIndexesByDestructibleType.playersKilled(day, t);
          const value = await redis.hget(key, player);
          if (value) {
            total += parseInt(value);
          }
        }
        return total;
      }

      const key = leaderboardIndexesByDestructibleType.playersKilled(day, type);
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async destructiblesPlayersHit(day, player, type) {
      if (!type) {
        // return all types
        let total = 0;
        for (let i = 0; i < enemyTypes.length; i++) {
          const t = enemyTypes[i];
          const key = leaderboardIndexesByDestructibleType.playersHit(day, t);
          const value = await redis.hget(key, player);
          if (value) {
            total += parseInt(value);
          }
        }
        return total;
      }

      const key = leaderboardIndexesByDestructibleType.playersHit(day, type);
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
    async itemsUsed(day, player, itemTypeId) {
      if (!itemTypeId) {
        // return all types
        let total = 0;
        for (let i = 0; i < itemTypeIds.length; i++) {
          const t = itemTypeIds[i];
          const key = leaderboardIndexesByItemTypeId.uses(day, itemTypeId);
          const value = await redis.hget(key, player);
          if (value) {
            total += parseInt(value);
          }
        }
        return total;
      }

      const key = leaderboardIndexesByItemTypeId.uses(day, itemTypeId);
      const value = await redis.hget(key, player);
      return parseInt(value) || 0;
    },
  },

  getPlayerAllTime: {
    hitsSent: (player) => leaderboard.getPlayerByDay.hitsSent(allTimeKey, player),
    hitsReceived: (player) => leaderboard.getPlayerByDay.hitsReceived(allTimeKey, player),
    spawnCount: (player) => leaderboard.getPlayerByDay.spawnCount(allTimeKey, player),
    kills: (player, type) => leaderboard.getPlayerByDay.kills(allTimeKey, player, type),
    deaths: (player, type) => leaderboard.getPlayerByDay.deaths(allTimeKey, player, type),
    damageDealt: (player, type) => leaderboard.getPlayerByDay.damageDealt(allTimeKey, player, type),
    damageTaken: (player, type) => leaderboard.getPlayerByDay.damageTaken(allTimeKey, player, type),
    pickups: (player) => leaderboard.getPlayerByDay.pickups(allTimeKey, player),
    drops: (player) => leaderboard.getPlayerByDay.drops(allTimeKey, player),
    tips: (player) => leaderboard.getPlayerByDay.tips(allTimeKey, player),
    tipsSent: (player) => leaderboard.getPlayerByDay.tipsSent(allTimeKey, player),
    sessionTimes: (player) => leaderboard.getPlayerByDay.sessionTimes(allTimeKey, player),

    destructiblesKilled: (player, type) => leaderboard.getPlayerByDay.destructiblesKilled(allTimeKey, player, type),
    destructiblesHit: (player, type) => leaderboard.getPlayerByDay.destructiblesHit(allTimeKey, player, type),
    destructiblesSpawn: (player, type) => leaderboard.getPlayerByDay.destructiblesSpawn(allTimeKey, player, type),
    destructiblesPurchase: (player, type) => leaderboard.getPlayerByDay.destructiblesPurchase(allTimeKey, player, type),
    destructiblesPlayersKilled: (player, type) => leaderboard.getPlayerByDay.destructiblesPlayersKilled(allTimeKey, player, type),
    destructiblesPlayersHit: (player, type) => leaderboard.getPlayerByDay.destructiblesPlayersHit(allTimeKey, player, type),
    itemsUsed: (player, itemTypeId) => leaderboard.getPlayerByDay.itemsUsed(allTimeKey, player, itemTypeId),
  },

  async getAllForBackup() {
    const allTimeData = {};

    let allKeys = Object.keys(leaderboardIndexes);
    for (let x = 0; x < allKeys.length; x++) {
      const key = allKeys[x];
      const obj = await redis.hgetall(leaderboardIndexes[key]);
      allTimeData[key] = convertObjToSortedList(obj);
    }

    allKeys = Object.keys(leaderboardIndexesByDay);
    for (let x = 0; x < allKeys.length; x++) {
      const key = allKeys[x];
      const obj = await redis.hgetall(leaderboardIndexesByDay[key](allTimeKey));
      allTimeData[key] = convertObjToSortedList(obj);
    }

    for (let i = 0; i < damageTypes.length; i++) {
      const damageType = damageTypes[i];
      allKeys = Object.keys(leaderboardIndexesByDamageType);
      for (let x = 0; x < allKeys.length; x++) {
        const key = allKeys[x];
        const obj = await redis.hgetall(leaderboardIndexesByDamageType[key](allTimeKey, damageType));
        allTimeData[key] = convertObjToSortedList(obj);
      }
    }

    for (let i = 0; i < alchTypes.length; i++) {
      const alchType = alchTypes[i];
      allKeys = Object.keys(leaderboardIndexesByAlchemicaType);
      for (let x = 0; x < allKeys.length; x++) {
        const key = allKeys[x];
        const obj = await redis.hgetall(leaderboardIndexesByAlchemicaType[key](allTimeKey, alchType));
        allTimeData[key] = convertObjToSortedList(obj);
      }
    }

    for (let i = 0; i < enemyTypes.length; i++) {
      const enemyType = enemyTypes[i];
      allKeys = Object.keys(leaderboardIndexesByDestructibleType);
      for (let x = 0; x < allKeys.length; x++) {
        const key = allKeys[x];
        const obj = await redis.hgetall(leaderboardIndexesByDestructibleType[key](allTimeKey, enemyType));
        allTimeData[key] = convertObjToSortedList(obj);
      }
    }

    for (let i = 0; i < itemTypeIds.length; i++) {
      const itemTypeId = itemTypeIds[i];
      allKeys = Object.keys(leaderboardIndexesByItemTypeId);
      for (let x = 0; x < allKeys.length; x++) {
        const key = allKeys[x];
        const obj = await redis.hgetall(leaderboardIndexesByItemTypeId[key](allTimeKey, itemTypeId));
        allTimeData[key] = convertObjToSortedList(obj);
      }
    }
    return allTimeData;
  },
  async emptyLeaderboard() {
    let allKeys = Object.keys(leaderboardIndexes);
    for (let x = 0; x < allKeys.length; x++) {
      const key = allKeys[x];
      await redis.del(leaderboardIndexes[key]);
    }

    allKeys = Object.keys(leaderboardIndexesByDay);
    for (let x = 0; x < allKeys.length; x++) {
      const key = allKeys[x];
      await redis.del(leaderboardIndexesByDay[key](allTimeKey));
    }

    for (let i = 0; i < damageTypes.length; i++) {
      const damageType = damageTypes[i];
      allKeys = Object.keys(leaderboardIndexesByDamageType);
      for (let x = 0; x < allKeys.length; x++) {
        const key = allKeys[x];
        await redis.del(leaderboardIndexesByDamageType[key](allTimeKey, damageType));
      }
    }

    for (let i = 0; i < alchTypes.length; i++) {
      const alchType = alchTypes[i];
      allKeys = Object.keys(leaderboardIndexesByAlchemicaType);
      for (let x = 0; x < allKeys.length; x++) {
        const key = allKeys[x];
        await redis.del(leaderboardIndexesByAlchemicaType[key](allTimeKey, alchType));
      }
    }

    for (let i = 0; i < enemyTypes.length; i++) {
      const enemyType = enemyTypes[i];
      allKeys = Object.keys(leaderboardIndexesByDestructibleType);
      for (let x = 0; x < allKeys.length; x++) {
        const key = allKeys[x];
        await redis.del(leaderboardIndexesByDestructibleType[key](allTimeKey, enemyType));
      }
    }

    for (let i = 0; i < itemTypeIds.length; i++) {
      const itemTypeId = itemTypeIds[i];
      allKeys = Object.keys(leaderboardIndexesByItemTypeId);
      for (let x = 0; x < allKeys.length; x++) {
        const key = allKeys[x];
        await redis.del(leaderboardIndexesByItemTypeId[key](allTimeKey, itemTypeId));
      }
    }
  },

  log: {
    async spawn(player) {
      const day = new Date().toISOString().split('T')[0];
      const key = leaderboardIndexesByDay.spawnCount(day);
      const atKey = leaderboardIndexesByDay.spawnCount(allTimeKey);
      redis.hincrby(key, player, 1);
      redis.hincrby(atKey, player, 1);

      const killStreakKey = leaderboardIndexes.killStreak;
      redis.hset(killStreakKey, player, 0);
    },
    async hit(player, type, hitPlayer, damageDealt = 1) {
      const day = new Date().toISOString().split('T')[0];
      const lastHitKey = leaderboardIndexes.lastHitTime;

      const key = leaderboardIndexesByDay.hitsSent(day);
      const atKey = leaderboardIndexesByDay.hitsSent(allTimeKey);

      const keyHitsReceived = leaderboardIndexesByDay.hitsReceived(day);
      const atKeyHitsReceived = leaderboardIndexesByDay.hitsReceived(allTimeKey);

      const missileCreatorIsEnemy = isNaN(Number(player));

      if (player && !missileCreatorIsEnemy) {
        redis.hincrby(key, player, 1);
        redis.hincrby(atKey, player, 1);
        redis.hset(lastHitKey, player, Date.now());
      } else if (missileCreatorIsEnemy) {
        this.playerHitByDestructible(hitPlayer, player);
      }

      if (hitPlayer) {
        // log damage done from the hit
        if (player && !missileCreatorIsEnemy) {
          const damageDealtKey = leaderboardIndexesByDamageType.damageDealt(day, type);
          const atDamageDealtKey = leaderboardIndexesByDamageType.damageDealt(allTimeKey, type);
          redis.hincrbyfloat(damageDealtKey, player, damageDealt);
          redis.hincrbyfloat(atDamageDealtKey, player, damageDealt);
        }

        // log the hit on the player
        redis.hincrby(keyHitsReceived, hitPlayer, 1);
        redis.hincrby(atKeyHitsReceived, hitPlayer, 1);

        // log the damage taken on the player
        const damageTakenKey = leaderboardIndexesByDamageType.damageTaken(day, type);
        const atDamageTakenKey = leaderboardIndexesByDamageType.damageTaken(allTimeKey, type);
        redis.hincrbyfloat(damageTakenKey, hitPlayer, damageDealt);
        redis.hincrbyfloat(atDamageTakenKey, hitPlayer, damageDealt);
      }
    },
    async kill(player, type) {
      const day = new Date().toISOString().split('T')[0];

      const allKillsKey = leaderboardIndexesByDay.kills(day);
      const allKillsATKey = leaderboardIndexesByDay.kills(allTimeKey);
      await redis.hincrby(allKillsKey, player, 1);
      await redis.hincrby(allKillsATKey, player, 1);

      if (type) {
        const key = leaderboardIndexesByDamageType.kills(day, type);
        const atKey = leaderboardIndexesByDamageType.kills(allTimeKey, type);
        await redis.hincrby(key, player, 1);
        await redis.hincrby(atKey, player, 1);
      }

      const killStreakKey = leaderboardIndexes.killStreak;
      let currentStreakAmount = await redis.hincrby(killStreakKey, player, 1);
      currentStreakAmount = parseInt(currentStreakAmount) || 0;

      if (currentStreakAmount) {
        const bestKillStreakKey = leaderboardIndexes.bestKillStreak;
        let highestStreak = await redis.hget(bestKillStreakKey, player);
        highestStreak = parseInt(highestStreak) || 0;

        if (currentStreakAmount > highestStreak) {
          // set the new highest streak
          redis.hset(bestKillStreakKey, player, currentStreakAmount);
        }
      }

      leaderboard.log.resetKillDeath(player, day);
    },
    async death(player, type) {
      const day = new Date().toISOString().split('T')[0];
      const lastDeathKey = leaderboardIndexes.lastDeathTime;

      const allDeathsKey = leaderboardIndexesByDay.deaths(day);
      const allDeathsATKey = leaderboardIndexesByDay.deaths(allTimeKey);
      await redis.hincrby(allDeathsKey, player, 1);
      await redis.hincrby(allDeathsATKey, player, 1);

      if (type && damageTypes.includes(type)) {
        const key = leaderboardIndexesByDamageType.deaths(day, type);
        const atKey = leaderboardIndexesByDamageType.deaths(allTimeKey, type);
        await redis.hincrby(key, player, 1);
        await redis.hincrby(atKey, player, 1);
      } else if (type) {
        // death by enemy
        this.playerKilledByDestructible(player, type);
      }

      redis.hset(lastDeathKey, player, Date.now());

      const killStreakKey = leaderboardIndexes.killStreak;
      redis.hset(killStreakKey, player, 0);

      leaderboard.log.resetKillDeath(player, day);
    },
    async resetKillDeath(player, day) {
      let kills = await leaderboard.getPlayerByDay.kills(day, player);
      // @ts-ignore
      kills = parseInt(kills) || 0;
      let deaths = await leaderboard.getPlayerByDay.deaths(day, player);
      // @ts-ignore
      deaths = parseInt(deaths) || 0;

      const ratio = kills / (deaths || 1);

      const kdRatioKey = leaderboardIndexes.killDeathRatio;
      redis.hset(kdRatioKey, player, ratio);
    },
    async hazardDamageTaken(player, amount = 1) {
      // all other damage taken types happen in the "hit" from another player
      const day = new Date().toISOString().split('T')[0];
      const key = leaderboardIndexesByDamageType.damageTaken(day, 'hazard');
      const atKey = leaderboardIndexesByDamageType.damageTaken(allTimeKey, 'hazard');
      // @ts-ignore
      const floatAmt = parseFloat(amount);
      if (floatAmt && !isNaN(floatAmt)) {
        redis.hincrbyfloat(key, player, amount);
        redis.hincrbyfloat(atKey, player, amount);
      }
    },
    async pickup(player, type, amount) {
      const day = new Date().toISOString().split('T')[0];
      const key = leaderboardIndexesByAlchemicaType.pickups(day, type);
      const atKey = leaderboardIndexesByAlchemicaType.pickups(allTimeKey, type);
      const floatAmt = parseFloat(amount);

      if (floatAmt && !isNaN(floatAmt)) {
        redis.hincrbyfloat(key, player, floatAmt);
        redis.hincrbyfloat(atKey, player, floatAmt);
      }
    },
    async drop(player, type, amount) {
      const day = new Date().toISOString().split('T')[0];
      const key = leaderboardIndexesByAlchemicaType.drops(day, type);
      const atKey = leaderboardIndexesByAlchemicaType.drops(allTimeKey, type);
      const floatAmt = parseFloat(amount);

      if (floatAmt && !isNaN(floatAmt)) {
        redis.hincrbyfloat(key, player, floatAmt);
        redis.hincrbyfloat(atKey, player, floatAmt);
      }
    },
    async tip(fromPlayer, coins) {
      if (coins?.length) {
        const day = new Date().toISOString().split('T')[0];

        // set for # of tips
        const key = leaderboardIndexesByDay.tips(day);
        const atKey = leaderboardIndexesByDay.tips(allTimeKey);
        redis.hincrby(key, fromPlayer, 1);
        redis.hincrby(atKey, fromPlayer, 1);

        // for each coin included in the tip
        coins.forEach(({ type, amount }) => {
          const fromKey = leaderboardIndexesByAlchemicaType.tipsSent(day, type);
          const atFromKey = leaderboardIndexesByAlchemicaType.tipsSent(allTimeKey, type);

          redis.hincrbyfloat(fromKey, fromPlayer, amount);
          redis.hincrbyfloat(atFromKey, fromPlayer, amount);
        });
      }
    },
    async sessionTime(player, time) {
      const day = new Date().toISOString().split('T')[0];
      const key = leaderboardIndexesByDay.sessionTimes(day);
      const atKey = leaderboardIndexesByDay.sessionTimes(allTimeKey);
      const intTime = parseInt(time);

      if (intTime && !isNaN(intTime)) {
        redis.hincrby(key, player, intTime);
        redis.hincrby(atKey, player, intTime);
      }
    },
    async hitDestructible(player, type) {
      const day = new Date().toISOString().split('T')[0];
      const key = leaderboardIndexesByDestructibleType.hits(day, type);
      const atKey = leaderboardIndexesByDestructibleType.hits(allTimeKey, type);
      await redis.hincrby(key, player, 1);
      await redis.hincrby(atKey, player, 1);
    },
    async killDestructible(player, type) {
      const day = new Date().toISOString().split('T')[0];
      const key = leaderboardIndexesByDestructibleType.kills(day, type);
      const atKey = leaderboardIndexesByDestructibleType.kills(allTimeKey, type);
      await redis.hincrby(key, player, 1);
      await redis.hincrby(atKey, player, 1);
    },
    async spawnDestructible(player, type, quantity = 1) {
      const day = new Date().toISOString().split('T')[0];
      const key = leaderboardIndexesByDestructibleType.spawns(day, type);
      const atKey = leaderboardIndexesByDestructibleType.spawns(allTimeKey, type);
      await redis.hincrby(key, player, quantity);
      await redis.hincrby(atKey, player, quantity);
    },
    async purchaseDestructible(player, type) {
      const day = new Date().toISOString().split('T')[0];
      const key = leaderboardIndexesByDestructibleType.purchases(day, type);
      const atKey = leaderboardIndexesByDestructibleType.purchases(allTimeKey, type);
      await redis.hincrby(key, player, 1);
      await redis.hincrby(atKey, player, 1);
    },
    async playerKilledByDestructible(player, type) {
      const day = new Date().toISOString().split('T')[0];
      const key = leaderboardIndexesByDestructibleType.playersKilled(day, type);
      const atKey = leaderboardIndexesByDestructibleType.playersKilled(allTimeKey, type);
      await redis.hincrby(key, player, 1);
      await redis.hincrby(atKey, player, 1);
    },
    async playerHitByDestructible(player, type) {
      const day = new Date().toISOString().split('T')[0];
      const key = leaderboardIndexesByDestructibleType.playersHit(day, type);
      const atKey = leaderboardIndexesByDestructibleType.playersHit(allTimeKey, type);
      await redis.hincrby(key, player, 1);
      await redis.hincrby(atKey, player, 1);
    },
    async itemUse(player, itemTypeId, quantityUsed) {
      const day = new Date().toISOString().split('T')[0];
      const key = leaderboardIndexesByItemTypeId.uses(day, itemTypeId);
      const atKey = leaderboardIndexesByItemTypeId.uses(allTimeKey, itemTypeId);
      await redis.hincrby(key, player, quantityUsed);
      await redis.hincrby(atKey, player, quantityUsed);
    },
  },
};

export const itemStore = {
  purchaseLog: 'item-store-purchases',
  gotchiPurchaseLog: (gotchiId) => `item-store-purchases:gotchi:${gotchiId}`,
  itemUsageLog: 'item-store-usage',
  gotchiItemUsageLog: (gotchiId) => `item-store-usage:gotchi:${gotchiId}`,
  get: {
    byDate(start, end) {
      return redis.zrangebyscore(itemStore.purchaseLog, start || 0, end || 9999999999999);
    },
    byGotchi(gotchiId, start, end) {
      return redis.zrangebyscore(itemStore.gotchiPurchaseLog(gotchiId), start || 0, end || 9999999999999);
    },
  },
  getItemsUsed: {
    byDate(start, end) {
      return redis.zrangebyscore(itemStore.itemUsageLog, start || 0, end || 9999999999999);
    },
    byGotchi(gotchiId, start, end) {
      return redis.zrangebyscore(itemStore.gotchiItemUsageLog(gotchiId), start || 0, end || 9999999999999);
    },
  },
  log: {
    async purchase(gotchiId, itemId, quantity, puchaseAmountBySymbol) {
      // puchaseAmountBySymbol is per each quantity
      const timestamp = new Date().getTime();
      let lastLoginData = await getGotchiLastLoginData(gotchiId);
      let address = '';
      if (lastLoginData) {
        lastLoginData = JSON.parse(lastLoginData);
        address = lastLoginData.owner;
      }

      const data = JSON.stringify({
        gotchiId,
        address,
        itemId,
        quantity,
        puchaseAmountBySymbol,
        timestamp,
      });

      // store by gotchi
      await redis.zadd(itemStore.gotchiPurchaseLog(gotchiId), timestamp, data);

      // store by date
      return redis.zadd(itemStore.purchaseLog, timestamp, data);
    },
    async used(gotchiId, itemId, quantity) {
      const timestamp = new Date().getTime();
      let lastLoginData = await getGotchiLastLoginData(gotchiId);
      let address = '';
      if (lastLoginData) {
        lastLoginData = JSON.parse(lastLoginData);
        address = lastLoginData.owner;
      }

      const data = JSON.stringify({
        gotchiId,
        address,
        itemId,
        quantity,
        timestamp,
      });

      // store by gotchi
      await redis.zadd(itemStore.gotchiItemUsageLog(gotchiId), timestamp, data);

      // store by date
      return redis.zadd(itemStore.itemUsageLog, timestamp, data);
    },
  },
};
