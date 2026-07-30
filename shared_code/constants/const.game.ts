import { version } from '../package.json';
import { GameConfig } from '../types/config.types';
export const SHARED_CODE_VERSION = version;
// General
const ALPHA = true;
export const TILE_SIZE = 64;
export const DEFAULT_GAS_PRICE = '32';

// these are used only for the "citaadel" map which is divided into neighborhoods / districts
export const HOOD_SIZE = 1056; // hood size in gotchis
export const HOODS_EXCLUSION = ['C71', 'C81'];
export const SPAWN_DISTRICTS = ['1a', '1b', '1c', '1d', '1e', '1f']; // districts that players can select to spawn on
export const HOOD_COL_COUNT = 8; // how many hoods across in the current full map
export const HOOD_ROW_COUNT = 5; // how many hoods from top to bottom in the current full map
export const HOOD_WIDTH = HOOD_SIZE * TILE_SIZE; // in pixels
export const HOOD_HEIGHT = HOOD_SIZE * TILE_SIZE; // in pixels

export const CITAADEL_WIDTH = HOOD_WIDTH * HOOD_COL_COUNT; // in pixels
export const CITAADEL_HEIGHT = HOOD_HEIGHT * HOOD_ROW_COUNT; // in pixels
export const AARENA_WIDTH = 128 * TILE_SIZE;
export const AARENA_HEIGHT = AARENA_WIDTH;
/** Store interior is the entire map: 16×16 tiles. */
export const STORE_GRID_SIZE = 16;
export const STORE_WIDTH = STORE_GRID_SIZE * TILE_SIZE;
export const STORE_HEIGHT = STORE_WIDTH;
export const MAP_ID_CITAADEL = 'citaadel';
export const MAP_ID_AARENA = 'aarena';
export const MAP_ID_STORE = 'store';
export const MAP_ID_LODGE = 'lodge';
/** Lodge interior reuses store 16×16 dimensions. */
export const LODGE_GRID_SIZE = STORE_GRID_SIZE;
export const LODGE_WIDTH = STORE_WIDTH;
export const LODGE_HEIGHT = STORE_HEIGHT;
/** Zone servers only — store/lodge use secondary Colyseus rooms, not ENABLED_MAPS zones. */
export const ENABLED_MAPS = [MAP_ID_CITAADEL, MAP_ID_AARENA];
export const TOKEN_TO_ADDRESS = {
  FUD: '0x403E967b044d4Be25170310157cB1A4Bf10bdD0f',
  FOMO: '0x44A6e0BE76e1D9620A7F76588e4509fE4fa8E8C8',
  ALPHA: '0x6a3E7C3c6EF65Ee26975b12293cA1AAD7e1dAeD2',
  KEK: '0x42E5E06EF5b90Fe15F853F59299Fc96259209c5C',
  GLTR: '0x3801C3B3B5c98F88a9c9005966AA96aa440B9Afc',
};
export const PLAYER_WALLET_SUPPORTED_TOKENS = ['FUD', 'FOMO', 'ALPHA', 'KEK'];

// configure baseline properties for all maps, unless explicitly overridden below by each map
// this gets mixed into each map's list of constants
const BASE_MAP_CONFIG = {
  MAX_PLAYER_CAPACITY: 8000, // max player count before queuing (admins will always get through)
  PLAYER_CONTROLS: 'moba', // Can be 'moba' or 'arcade'
  SHOOT_MODE: '', // set to 'PVE' or 'PVP to equip all players with a shooting wearable and allow PVP or PVE (no friendly fire)
  MAX_MAP_ALCHEMICA_CHUNK_COUNT: 75000, // max amount of alchemica chunks that can be live on the map at one time, spawn methods will skip if above this
  SPRINT_RESOURCE: 'AP', // 'AP' if sprinting should take AP, 'HP' if it should take HP, default is AP
  GOTCHI_SPEED: 14, // gotchi movement speed per game loop.
  SPRINT_FACTOR: 2, // By how much is gotchi speed multiplied when sprinting
  ENABLE_INERTIA: true,
  RESPAWN_DELAY: 0, // number of seconds after death the user has to wait before spawning again
  RESPAWN_BUYBACK_ALLOWED: false, // if players can pay after death to respawn immediately
  RESPAWN_BUYBACK_TOKEN_COST: {
    // cost by token type to respawn early, if the feature is enabled
    KEK: 10,
  },
  RESPAWN_BUYBACK_SPILLOVER: true, // when player respawns early for a fee, should that fee get spilled over onto the map

  // any enclosed areas of the map that no alchemica, players, or enemies should ever spawn, in PX
  // this is used in logic where we don't have access to matterJS collisions like in Consumer
  NO_SPAWN_ZONES: [],
  // Area around which to make players spawn during combat testing
  COMBAT_TESTING_SPAWN_AREA: null,

  TIP_MIN_INTERVAL: 5, // the max frequency in seconds a player can tip
  TIP_MSG_CHAR_LIMIT: 40, // max tip message size
  TIP_MIN_TOKEN_AMOUNT: 1, // the min tip amount a player can tip in combined total tokens
  TIP_MAX_TOKEN_AMOUNT: 1000, // the max tip amount a player can tip in combined total tokens
  TIP_SUPPORTED_TOKENS: PLAYER_WALLET_SUPPORTED_TOKENS.slice(0), // which tokens by symbol are supported for tipping
  TIP_MIN_SPILLOVER_RADIUS: 10, // min tip spillover radius in gotchis. Spillover is based on Math.sqrt(tokenQuantity) with this as min
  TIP_MAX_SPILLOVER_RADIUS: 50, // max tip spillover radius in gotchis. Spillover is based on Math.sqrt(tokenQuantity) with this as max
  PINNED_ALERT: '', // any map specific pinned message
};

// game map config
export const MAP_CONFIG_BY_ID = {};

MAP_CONFIG_BY_ID[MAP_ID_CITAADEL] = Object.assign({}, BASE_MAP_CONFIG, {
  ID: MAP_ID_CITAADEL,
  WIDTH: HOOD_WIDTH * HOOD_COL_COUNT, // in pixels
  HEIGHT: HOOD_HEIGHT * HOOD_ROW_COUNT,
  AOI_COL_COUNT: 128,
  AOI_ROW_COUNT: 80,
  SPAWN_BOUNDS: {
    top: TILE_SIZE * 52,
    left: TILE_SIZE * 42,
    right: CITAADEL_WIDTH - TILE_SIZE,
    bottom: CITAADEL_HEIGHT - TILE_SIZE,
  },
  NO_SPAWN_ZONES: [
    // west gate
    {
      top: 198228,
      left: 0,
      right: 10149,
      bottom: 207594,
    },
    // north gate
    {
      top: 0,
      left: 299589,
      right: 308649,
      bottom: 10724,
    },
    // top right corner hidden hoods
    {
      top: 0,
      left: 405470,
      bottom: 67642,
      right: CITAADEL_WIDTH,
    },
    // inner citadel
    {
      top: 169940,
      left: 270309,
      bottom: 229974,
      right: 337967,
    },
  ],
  COMBAT_TESTING_SPAWN_AREA: {
    X: 396900,
    Y: 171700,
    RADIUS: 500,
  },
  PLAYER_CONTROLS: 'arcade',
  SHOOT_MODE: 'PVE',
  ENABLE_INERTIA: true,
  RESPAWN_DELAY: 5,
});

/** Parcel store interior — whole map is one 16×16 room (1024×1024). */
MAP_CONFIG_BY_ID[MAP_ID_STORE] = Object.assign({}, BASE_MAP_CONFIG, {
  ID: MAP_ID_STORE,
  WIDTH: STORE_WIDTH,
  HEIGHT: STORE_HEIGHT,
  AOI_COL_COUNT: 1,
  AOI_ROW_COUNT: 1,
  SPAWN_BOUNDS: {
    // Door interior (tx=7, ty=14) tile center
    top: TILE_SIZE * 14,
    left: TILE_SIZE * 7,
    right: TILE_SIZE * 8,
    bottom: TILE_SIZE * 15,
  },
  MAX_PLAYER_CAPACITY: 8,
  PLAYER_CONTROLS: 'arcade',
  SHOOT_MODE: '',
  GOTCHI_SPEED: 9,
  ENABLE_INERTIA: false,
  RESPAWN_DELAY: 0,
});

/** Parcel lodge interior — clone of store 16×16 room. */
MAP_CONFIG_BY_ID[MAP_ID_LODGE] = Object.assign({}, MAP_CONFIG_BY_ID[MAP_ID_STORE], {
  ID: MAP_ID_LODGE,
  WIDTH: LODGE_WIDTH,
  HEIGHT: LODGE_HEIGHT,
});

MAP_CONFIG_BY_ID[MAP_ID_AARENA] = Object.assign({}, BASE_MAP_CONFIG, {
  ID: MAP_ID_AARENA,
  WIDTH: AARENA_WIDTH,
  HEIGHT: AARENA_HEIGHT,
  AOI_COL_COUNT: 3,
  AOI_ROW_COUNT: 3,
  SPAWN_BOUNDS: {
    // when spawning in aarena, spawn at least 800px away from borders to avoid spawning under UI elements
    top: TILE_SIZE + 800,
    left: TILE_SIZE + 800,
    right: AARENA_WIDTH - TILE_SIZE - 800,
    bottom: AARENA_HEIGHT - TILE_SIZE - 800,
  },
  COMBAT_TESTING_SPAWN_AREA: {
    X: 4096,
    Y: 4096,
    RADIUS: 10,
  },
  MAX_PLAYER_CAPACITY: 100,
  PLAYER_CONTROLS: 'arcade',
  SHOOT_MODE: 'PVP',
  MAX_MAP_ALCHEMICA_CHUNK_COUNT: 2000,
  GOTCHI_SPEED: 11,
  RESPAWN_DELAY: 300, // respawn delay now 5 minutes in aarena
  RESPAWN_BUYBACK_ALLOWED: true, // buyback is now allowed in aarena
  ENABLE_INERTIA: true,
});

export const AGRO_ATTACKS = {
  round: {
    TYPE: 'round',
    DURATION: 5000, // How long to attack for once attacking. This can be the same duration as move
    SPEED: 55, // How fast shots move
    SHOT_TTL: 1000, // How long to live in ms
    SHOT_DEG: 90, // How many degrees to attack in round type
    ROUND_DELAY: 0, // How long to wait between each round
    // Rate based on damage per second
    RATE: {
      LOW: 1,
      MED: 0.5,
      HIGH: 0.25,
    },
    AP_COST: 1, // How much AP to cost for attacking
    DAMAGE_MULT: 0.06, // How much damage to deal based on player HP
  },
  random_angle: {
    TYPE: 'random_angle',
    DURATION: 5000, // How long to attack for once attacking. This can be the same duration as move
    SPEED: 55, // How fast shots move
    SHOT_TTL: 2000, // How long to live in ms
    SHOT_DEG: 45, // How many degrees to attack in round type
    ROUND_DELAY: { LOW: 1, MED: 0.5, HIGH: 0.25 },
    SHOT_ANGLE: {
      // New shot angle is random based on damage
      LOW: 60,
      MED: 30,
      HIGH: 10,
    },
    // Rate based on damage per second
    RATE: {
      LOW: 1,
      MED: 0.5,
      HIGH: 0.25,
    },
    AP_COST: 1, // How much AP to cost for attacking
    DAMAGE_MULT: 0.1, // How much damage to deal based on player HP
  },
};

export const ENEMY_DEFAULTS = {
  PUMPKIN: {
    WIDTH: 192,
    HEIGHT: 192,
    MAX_HP: 1000,
    HP_REGEN_RATE: 10,
    ALCHEMICA: [10, 5, 2.5, 1],
    ALCH_SIZE_RATIO: [0.2, 0.3, 0.5],
    ALCH_SPILL_RADIUS: 10 * 64,
    DAMAGE_MULT: 0.2,
    DAMAGE_PUSH: 75,
    MOVE_SPEED: 0,
    MOVE_DURATION_MS: 0,
    MOVE_STYLE: 'hit',
    MOVE_CHANCE: 0,
    DAMAGE_COLLIDE: 500,
  },
  TURKEY: {
    WIDTH: 128,
    HEIGHT: 192,
    MAX_HP: 1000, // max HP enemy starts with
    HP_REGEN_RATE: 5, // how much HP to regen every second
    ALCHEMICA: [10, 5, 2.5, 1],
    ALCH_SIZE_RATIO: [0.2, 0.3, 0.5], // ratio of small, medium, large chunks of alchemica to spawn when killed
    ALCH_SPILL_RADIUS: 10 * 64, // radius of alchemica spillover when killed
    DAMAGE_MULT: 0.2, // a multiplier on incoming damage. Essentially a defense / armor stat. Ex. Enemy getting hit 300 * .20 = 60
    DAMAGE_PUSH: 75, // how many pixels in the opposite direction should an enemy move when hit
    MOVE_SPEED: 12, // what speed to move when enemy is moving. In Aarena default movement for gotchis is 11 or 22 for sprinting
    MOVE_DURATION_MS: 3000, // how long to move for once moving, 0 = never stop moving
    MOVE_STYLE: 'hit', // what logic triggers movement, currently only 'hit' is an available option
    MOVE_CHANCE: 0.2, // percent out of 1 that enemy will move in a rgandom direction when hit when MOVE_STYLE=hit. .2 = 20% chance
    DAMAGE_COLLIDE: 500,
  },
  GMLS: {
    CATEGORY: 'inventory',
    TYPE: 'GMLS',
    ITEM_SHOP_ID: '3',
    WIDTH: 64,
    HEIGHT: 64,
    MAX_HP: 10000, // max HP enemy starts with
    HP_REGEN_RATE: 50, // how much HP to regen every second
    HP_REGEN_START_LIMIT: 1, // when to start regenerating HP. Ex. 0.5 = 50% HP
    INACTIVE_DELAY: 6000, // time in ms to be inactive on initial spawn

    MAX_AP: 20, // max AP enemy starts with  -  20 frames of stamina
    AP_REGEN_RATE: 4, // how much AP to regen every second -  4 frames regen per second
    AP_REGEN_START_LIMIT: 1, // when to start regenerating AP. BASED ON HP LEVEL. Ex. 0.5 = 50% HP

    ALCHEMICA_RATIO: 0.9, // Alchemica ratio to drop from cost. Find cost in item_shop.json
    ALCH_SIZE_RATIO: [0.2, 0.3, 0.5], // ratio of small, medium, large chunks of alchemica to spawn when killed
    ALCH_SPILL_RADIUS: 60 * 64, // radius of alchemica spillover when killed
    DAMAGE_MULT: 1, // a multiplier on incoming damage. Essentially a defense / armor stat. Ex. Enemy getting hit 300 * .20 = 60
    DAMAGE_PUSH: 0, // how many pixels in the opposite direction should an enemy move when hit
    // LIFESPAN: 10 * 60, // how long to live in seconds
    LIFESPAN: 0, // unlimited lifespan for Protolicks for now per Dan
    MOVE_STYLE: 'agro', // what logic triggers movement. based on ACTION_COLLISION
    HIT_TRIGGER: 'attack', // what action to trigger when hit, attack or move

    ACTION_COLLISION: {
      RADIUS: 8, // Radius of the action body in gotchis
      ENTER: 'move', // Trigger one action  move or attack
    },

    // Actions to take when agro
    ACTIONS: {
      MOVE: {
        TYPE: 'follow', // Follow player
        SPEED: 1, // How fast to follow player in relation to player speed
        DURATION: 10000, // How long to follow player for once following, 0 = never stop following
        AP_COST: 2, // How much AP to cost for moving
        DAMAGE_MULT: 0.06, // Damange multiplier on collision based on player HP
        // How many pixels to push enemy back on collision
        KNOCK_BACK: {
          WALL: 32,
          PLAYER: 32,
        },
      },
      ATTACK: {
        ...AGRO_ATTACKS.round,
      },
    },
  },

  ROFL: {
    CATEGORY: 'quest',
    TYPE: 'ROFL',
    WIDTH: 64,
    HEIGHT: 64,
    MAX_HP: 10000,
    HP_REGEN_RATE: 0,
    HP_REGEN_START_LIMIT: 1,
    INACTIVE_DELAY: 0,
    MAX_AP: 0,
    AP_REGEN_RATE: 0,
    AP_REGEN_START_LIMIT: 1,
    DAMAGE_MULT: 0,
    DAMAGE_PUSH: 0,
    LIFESPAN: 2 * 60,
    MOVE_STYLE: null,
    HIT_TRIGGER: null,
    ACTION_COLLISION: {
      RADIUS: 8,
      ENTER: 'move',
    },
    ACTIONS: {
      MOVE: {
        TYPE: 'follow',
        SPEED: 0.8,
        DURATION: 30000,
      },
    },
  },

  PLM2: {
    CATEGORY: 'inventory',
    TYPE: 'PLM2',
    ITEM_SHOP_ID: '4',
    WIDTH: 64,
    HEIGHT: 64,
    MAX_HP: 120000, // max HP enemy starts with
    HP_REGEN_RATE: 50, // how much HP to regen every second
    HP_REGEN_START_LIMIT: 1, // when to start regenerating HP. Ex. 0.5 = 50% HP
    INACTIVE_DELAY: 6000, // time in ms to be inactive on initial spawn

    MAX_AP: 20, // max AP enemy starts with  -  20 frames of stamina
    AP_REGEN_RATE: 4, // how much AP to regen every second -  4 frames regen per second
    AP_REGEN_START_LIMIT: 1, // when to start regenerating AP. BASED ON HP LEVEL. Ex. 0.5 = 50% HP

    ALCHEMICA_RATIO: 0.9, // Alchemica ratio to drop from cost. Find cost in item_shop.json
    ALCH_SIZE_RATIO: [0, 0, 1], // ratio of small, medium, large chunks of alchemica to spawn when killed
    ALCH_SPILL_RADIUS: 60 * 64, // radius of alchemica spillover when killed
    DAMAGE_MULT: 1, // a multiplier on incoming damage. Essentially a defense / armor stat. Ex. Enemy getting hit 300 * .20 = 60
    DAMAGE_PUSH: 0, // how many pixels in the opposite direction should an enemy move when hit
    LIFESPAN: 0, // unlimited lifespan for Protolicks for now per Dan
    MOVE_STYLE: 'agro', // what logic triggers movement. based on ACTION_COLLISION
    HIT_TRIGGER: 'attack', // what action to trigger when hit, attack or move

    ACTION_COLLISION: {
      RADIUS: 8, // Radius of the action body in gotchis
      ENTER: 'move', // Trigger one action  move or attack
    },

    // Actions to take when agro
    ACTIONS: {
      MOVE: {
        TYPE: 'follow', // Follow player
        SPEED: 1, // How fast to follow player in relation to player speed
        DURATION: 12000, // How long to follow player for once following, 0 = never stop following
        AP_COST: 2, // How much AP to cost for moving
        DAMAGE_MULT: 0.06, // Damange multiplier on collision based on player HP
        // How many pixels to push enemy back on collision
        KNOCK_BACK: {
          WALL: 32,
          PLAYER: 32,
        },
      },

      ATTACK: {
        ...AGRO_ATTACKS.random_angle, //  will shoot in a random angle based initial damage received
      },
    },
  },
};

// Enable composites in matterJs.helper
export const ENABLE_COMPOSITES = false;
export const DEBUG_COLLISIONS_LOG = false;

export const GOTCHI_SIZE = {
  UNIT: 64, // gotchis as a unit of measurement is 64px
  /* (this should be 32px for proper collisions, but some gotchis have big-fat wearables in hands https://aavegotchi.com/gotchi/14637, instead of 64px we can try a happy medium of 46px as Chris was noticing too-wide collisions on map paths as well) */
  WIDTH: 46, // gotchi actual graphic width in px, used for things like collisions
  // changed to 55 to accomodate for idle tween
  HEIGHT: 55, // gotchi actual graphic height in px, used for things like collisions
};

// Valid gotchi metadata to be saved in redis.
export const GOTCHI_METADATA = ['id', 'name', 'owner', 'level', 'collateralColor', 'host', 'accountId', 'health', 'ap', 'traitStats'];
// these all get generated during Player.create using player.traitStats so are usually excluded from syndication / saving
export const GOTCHI_TRAIT_PROPS = ['maxHealth', 'maxAP', 'defense', 'rangedPower', 'meleePower', 'minFireInterval', 'minMeleeInterval', 'healthRegenAmount', 'apRegenAmount', 'damageReduction', 'evasion', 'alchemicaCarryingCapacity'];
// these are the min fields required for instantiating a valid gotchi from another server or from redis
export const GOTCHI_METADATA_CREATION = GOTCHI_METADATA.concat(['x', 'y']);
// what gotchi properties should be transferred when moving from zone to zone, basically everything we don't want to re-pull
export const GOTCHI_METADATA_TRANSFER = GOTCHI_METADATA_CREATION.concat([
  'playerWallet',
  'userAgent',
  'ip',
  'ipLocation',
  'isAdmin',
  'avgCaptchaScore',
  'countCaptchaScore',
  'isLent',
  'alchemica',
  'hood',
  'district',
  'pressingSprint',
  'isSprinting',
  'isSpinning',
  'aoiX',
  'aoiY',
  'createTime',
  'spawnTime',
  'isFocused',
  'isMoving',
  'startedMoving',
  'stoppedMoving',
  'forces',
  'direction',
  'velocity',
  'speedFactor',
  'traits',
  /* Don't transfer these as they'll get re-calculated and added by the new server's physics engine on add
  'activeRoadCollisions',
  'activeAlchemicaCollisions',
  'activeNFTCollisionCount',
  'activeParcelCollisionCount',
  'activeDepositCollisionCount',
  */
  'chatChannel',
  'isSpectator',
  'spectatorColor',
  'lastGroundUpdate',
  'facingDirection',
  'lastDirectionUpdate',
  'bubbleTyping',
  'lastShotFired',
  'lastMeleeAttack',
  'equippedQuickslots',
  'wearables',
]);

// default gotchi level properties, this is referenced to know which properties to save on the gotchi, and what to reset them back to
export const DEFAULT_GOTCHI_PROPERTIES = {
  alchemica: [0, 0, 0, 0],
  health: 1000,
  ap: 100,
};

const CLIENT_SOUNDS = ['alchemica_deposited_sound', 'alchemica_alpha_sound', 'alchemica_fomo_sound', 'alchemica_fud_sound', 'alchemica_kek_sound', 'bump_sound', 'cant_pickup_sound', 'gotchi_spawn_sound', 'on_road_sound', 'pickup_alpha_sound', 'pickup_fomo_sound', 'pickup_fud_sound', 'pickup_kek_sound', 'death_sound', 'impact_heart_sound', 'shoot_heart_sound'];

const SIGNIFICANT_UPDATE = 1;
export const ZERO_VEOCITY = { x: 0, y: 0 };

// game penalty modifiers
export const MOVEMENT_GROUND_ALCHEMICA_PENALTY_PERCENT = 0.7;
export const MOVEMENT_ROAD_BOOST_PERCENT = 1.85;

// Items
export const ALCHEMICA_MAX_CARRY_QUANTITY = 250; // alchemica max pocket size has increased from 100 to 250 for CR0. In the future it will be based on stats
export const ALCHEMICA_SIZE = {
  WIDTH: 32, // px width used in collision detection
  HEIGHT: 38, // px width used in colllision detection
};
// alchemica sizes, these influence what graphics / pickup audio is used

// Alchemica order is the same as parcel alchemica order on api.
export const ALCHEMICA_ARRAY_POSITIONS = ['fud', 'fomo', 'alpha', 'kek'];

// these are default game properties that can be updated at run-time
// run-time changes to these persist in redis DB and get pushed to all BE servers / FE clients
// only commit changes to these to change global defaults. If just testing something use the equivalent betaAdminCommand instead to change values at runtime
export const GAME_CONFIG: GameConfig = {
  // Boolean: if REALM is in an accessible state. Set to false to disable public access. Users won't be able to connect to the socket and will only see a closed portal landing page.
  isLive: true,
  // Boolean: if COMBAT Aarena is in an accessible state.
  combatIsLive: false,
  enableQuestHint: false,
  enableTipping: true, // set to true to enable tipping / superchat based features
  enablePlayerWallet: true, // set to true to enable player wallet based features including deposits, withdraws, decrementing funds from player wallet for in-game actions
  enableItemShop: true, // set to true to allow purchasing items from the item shop
  enableGotchiInventory: true, // set to true to make player inventory components visible and usable
  inventoryQuickslots: 4, // how many inventory slots are exposed in player UI with keyboard shortcuts, this is used to auto populate quickslots with inventory changes until manually set by user
  // Can be 'default'|'halloween'|'tooorkey'
  enableNakedGotchis: true, // if this is enabled we will switch observers with naked gotchis. The only diff is that naked gotchis will have a default gotchi svg and they will be able to battle in the aarena.
  nakedGotchisTraits: {
    NRG: -50,
    AGG: 50,
    SPK: 50,
    BRN: 50,
  },
  gotchiverseTheme: 'default',
  aarenaTheme: 'denver', // can be 'denver' or undefined.
  // loaded quests by quest ID to number of loaded chapters
  quests: {
    root: 0,
  },
  questsMinPlayersRquired: {
    root: 20,
  },
  // This is how frequently the game caclulates game acitivity by ticking the physics engine forward and sending socket updates to FE.
  // FE logic tweens player positions between updates at this interval as well so even at lower framerates things look smooth
  // // 1000 / 30 fps = 33ms. 30fps is the max ideal player update rate for input responsiveness. 15fps is 66ms updates which works well too.
  gameUpdateIntervalMS: 1000 / 30,
  // the unit sizes to determine small/medium/large version of alchemica chunk graphics and sounds for display. <= first size = small, <= second size = medium, rest large
  // note this can be the same or different then the actual spawning chunk sizes generated during spawn events. That is defined in ALCHEMICA_CONFIG.alcheicaSpawnChunkSizes
  alchemicaChunkSizes: [0.1, 0.5, 1],
  // the maximum amount of alchemica chunks that can be live on the map at one time
  // alchemica spawn methods will check this and ensure spawns stay under this amount or they will postpone their spawn
  // this will be overriden by a map's MAP_CONFIG_BY_ID MAX_MAP_ALCHEMICA_CHUNK_COUNT property if it exists
  maxMapAlchemicaChunkCount: 50000,
  // for adding a permanent toast notification to the app that all existing and new player logins will see.
  pinnedAlert: false,
  // mini-game mode variables
  // if the overall mini-game mode is active
  miniGameMode: false,
  // if a mini game round is active
  miniGameRoundActive: false,
  // set to a number in minutes to automatically start new game rounds every X minutes. This is currently just using setInterval on the server the request is made to.
  miniGameAutoStartInterval: 0,
  // the number of mini games that have been started ever, used so leaderboard info isn't erased after every game until we want to clear it.
  miniGameCounter: 0,
  // the number of mini game rounds that have been started since miniGameMode was last enabled
  miniGameRoundCounter: 0,
  // number of seconds each mini game round should last, set to 0 for rounds that should not expire automatically (need to call end-round explicitly)
  miniGameRoundDuration: 0,
  // how frequently to publish mini-game current elapsed time to redis pub/sub in seconds
  miniGameTimeUpdateInterval: 5,
  // during an active round, a counter in seconds that updates every `miniGameTimeUpdateInterval` with the remaining seconds left in the round
  miniGameTimeLeft: 0,
  // optionally delay the start of each round by X seconds, like to first complete an animation
  miniGameStartDelay: 0,
  // this will be set to true and fired to redis pub/sub when prestart delay has completed
  miniGamePrestartTrigger: false,
  // unix timestamp of when the current round started if miniGameRoundActive: true, passed to FE for display
  miniGameRoundStartedTimestamp: 0,
  // unix timestamp of when the next round starts when an auto-start miniGameAutoStartInterval is set, passed to FE for display
  miniGameNextRoundStartTimestamp: 0,
  // dev option: sent physics debug overlay data to FE
  devDebugOverlay: false,
  // dev option: send AOI zone data to FE to overlay debug shapes
  devDebugAOIOverlay: false,
  spinDuration: 250, // How many ms for a full gotchi spin
  // ## Combat stuff
  combatTesting: false, // Enables a series of parameters meant to focus testing on PVP (shoot mode, spawn in same location, ...)
  damageCoefficient: 2, // When computing missile or melee damage, the actual value will be a random one between minDamage (depending on gotchi traits) and maxDamage, where maxDamage = minDamage * damageCoefficient
  fireRate: 4, // Base number of shots per second
  fireDisabledDuration: 5, // seconds; how long a player needs to wait before being able to shoot after joining
  takingDamageDisabledDuration: 5, // seconds, same as above
  keepWinningsReqs: {
    noHitsReceivedDuration: 5, // seconds
    sessionDuration: 180, // seconds
    numKills: 1,
    numHits: 0,
  },
  meleeRate: 3, // Base number of slap/rushes per second
  slapAPCost: 1, // AP cost of a slap
  rushAPCost: 20, // AP cost of a rush
  rangeAPCost: 3, // AP cost of a ranged shot
  chargedRangeAPCost: 10, // AP cost of a charged ranged shot
  meleeDamageRadius: 80, // Radius of the melee attacks, in pixels
  rushDamageRadius: 48, // Radius of the rush attacks, in pixels
  normalMissileDamageRadius: 20, // Radius of the normal missile attacks, in pixels
  snipeMissileDamageRadius: 46, // Radius of the snipe missile attacks, in pixels
  maxRushDistance: 24, // Max distance of a rush attack, in pixels
  rushSpeed: 112, // Speed of a rush attack, in pixels per second, warning rush speed above 109 can allow rush to go through some 1 gotchi wide walls
  baseMeleeDamage: 100, // Base melee damage (before applying gotchi traits)
  baseRushDamage: 100, // Base rush damage (before applying gotchi traits)
  baseRangedDamage: 60, // Base ranged damage (before applying gotchi traits)
  baseSnipeDamage: 150, // Base snipe damage (before applying gotchi traits)
  missileKnockBackDistance: 6, // How far a missile will knock back a player
  slapKnockBackDistance: 6, // How far a slap will knock back a player
  enableVariableDamage: true, // If true, damage will be a random value between minDamage and maxDamage, where maxDamage = minDamage * damageCoefficient
  enableEvasion: true, // If true, players will have a chance to evade attacks
  enableWearables: true, // Whether to apply wearables effects on gotchi stats
  baseEvasion: 0, // Base evasion value (before applying gotchi traits)
  baseLuck: 1, // Base evasion value (before applying gotchi traits)
  enableDebugGraphics: true,
  maxAttackSpeedModifier: 2, // Max amount by which the attack speed can be modified by gotchi traits
  maxAP: 500, // Max AP
  maxAPBuffCoef: 1, // Amount by which the max AP can be modified by gotchi traits
  maxHealth: 2500, // Max health
  maxHealthBuffCoef: 10, // Max amount by which the max health can be modified by gotchi traits
  enableRangedCharge: true, // If true, players will be able to charge ranged attacks
  missileSpeedCoefficient: 3.5, // How much faster the missile are than the players
  missileChargedSpeedCoefficient: 5, // How much faster the missile are than the players when charged
  missileDistance: 22, // How far the missile can travel before disappearing
  baseDefense: 0, // Base defense value (before applying gotchi traits)
  baseRangedPower: 0, // Base ranged power value (before applying gotchi traits)
  rangeBuffCoef: 1, // Range damage modifier from gotchi traits
  baseMeleePower: 0, // Base melee power value (before applying gotchi traits)
  meleeBuffCoef: 1.5, // Melee damage modifier from gotchi traits
  evasionBuffCoef: 0.003, // Evasion modifier from gotchi traits
  luckBuffCoef: 0.005, // Luck modifier from gotchi traits
  actionSpeedBuffCoef: 0.01, // Action speed modifier from gotchi traits
  minRushChargeDuration: 0.3, // Min time to charge a rush attack, in seconds
  minSnipeChargeDuration: 0.3, // Min time to charge a snipe attack, in seconds
  maxRushChargeDuration: 2, // Max time to charge a rush attack, in seconds
  maxSnipeChargeDuration: 2, // Max time to charge a snipe attack, in seconds
  // ## Sprint stuff ##
  minHealthToSprint: 250, // Disable sprint below that level of health
  sprintHealthCostPerSecond: 10, // How much health lost per second of sprinting
  sprintAPCostPerSecond: 10, // How much health lost per second of sprinting
  enableSprinting: true,
  enableNFTDisplays: true,
  // ## Intertia stuff ##
  updateVelocityInterval: 50, // Update velocity for intertia every `updateVelocityInterval` ms
  /*
  WOODLAND ROFL feature config per https://docs.google.com/document/d/1oFQgBb4p9NLK8kmDtjm8kc6DmbJ5DMt8o7kJrKHomD4
  settings can be moidifed via ex:
  betaAdminCommand('update-game-config', { woodlandRoflConfig: {enabled: true, rootRadius: 1000 }})
  */
  woodlandRoflConfig: {
    enabled: true, // enable this feature, disabling while active will remove all active ROFLs
    rootRadius: 1600, // radius in px from the center of active root chapters where dropping alchemica can cause a ROFL to spawn
    eatRadius: 320, // radius in px around a ROFL where ROFL will move towards and eat alchemica
    chanceToSpawn: 0.1, // base chance to spawn a ROFL when dropping alchemica in the rootRadius, 0.1 = 10%
    chanceToBurp: 0.15, // base chance to burp after eating alchemica, 0.2 = 20%
    chanceToLore: 0.1, // base chance to bubble chat lore after burping, 0.1 = 10%
    minSpotAnimationFreq: 8, // min seconds before the ROFL spot animation should be played again when spotting back to back crumbs
    maxFollowTime: 10, // max seconds a ROFL will follow a player after eating alchemica before it stops following until it gets more alchemica
  },
  inertiaConfig: {
    // Params coming from https://docs.google.com/spreadsheets/d/1vzYdBaRU_rWxe7pOCs_-DnmzocBFjnEZ-A_1TZO14Bs/edit?pli=1#gid=0
    groundAccelerationSteps: 4, // Number of `updateVelocity` steps to go from standing still to being at cruise speed
    groundDecelerationSteps: 3, // Number of `updateVelocity` steps to go from cruise speed to standing still
    roadAccelerationSteps: 8.5,
    roadDecelerationSteps: 9,
    fudAccelerationSteps: 7.5,
    fudDecelerationSteps: 3.5,
    fomoAccelerationSteps: 3.5,
    fomoDecelerationSteps: 2.5,
    alphaAccelerationSteps: 4.5,
    alphaDecelerationSteps: 3.5,
    kekAccelerationSteps: 2.5,
    kekDecelerationSteps: 3.5,
    groundTransitionSteps: 4, // Number of steps when transition to ground
    roadTransitionSteps: 8,
    fudTransitionSteps: 7,
    fomoTransitionSteps: 5,
    alphaTransitionSteps: 2,
    kekTransitionSteps: 4,
    groundTurnTransitionSteps: 1, // Number of velocity update steps to perform a turn on ground
    roadTurnTransitionSteps: 1.5,
    fudTurnTransitionSteps: 1.5,
    fomoTurnTransitionSteps: 0.5,
    alphaTurnTransitionSteps: 2,
    kekTurnTransitionSteps: 0.5,
    sprintDecelerationIncrement: -1,
    sprintAccelerationIncrement: 2,
    sprintTurnIncrement: 0.5,
    sprintTransitionIncrement: 1,
  },
  cooldownsByItemType: {
    // cooldowns in seconds by item type
    hp: 5,
    ap: 5,
    // @ts-ignore
    enemy: 5,
  },
  // ## Health regen stuff ##
  enableHealthRegen: true, // set to true to enable health regen
  healthRegenPerSecond: 7.5, // HP regened per second
  enableAPRegen: true, // set to true to enable AP regen
  apRegenPerSecond: 3, // AP regened per second
  regenBuffCoef: 0.01, // Regen modifier from gotchi traits
  // ## Other stuff ##
  enableBinaryEncoding: true, // set to true to convert most player socket data from server->client to a binary format to significantly cut payload size at the cost of some CPU overhead
  enablePubsubBinaryEncoding: true, // set to true to convert most some pubsub messages to a binary format to significantly cut payload size at the cost of some CPU overhead
  enablePlayerTracing: false,
  allowUnlimitedZoomOut: false, // allow front-end client to zoom map all-the-way-out to maximum map bounds
  demoGotchiMode: false, // in demo gotchi mode we bypass metamask and assign pre-set gotchis for demos and easy testing.
  playerScaling: true, // set to true to use latest players architecture where players are only added to the physics engine of their socket server
  allowConcurrentWalletGotchiLogins: false, // set to true to allow multiple gotchis under one wallet address to log in. Otherwise one per wallet.
  allowBotTesting: true, // set to true to allow 0x0000000000000000000000000000000000000000 owner connections without metamask signing for internal load testing
  requireMetaMaskSign: true, // set to true to require a MetaMask Sign Request to log in to Realm including server validation (turning this off is unsafe, allows spoofing)
  useCustomLodash: true, // whether to use our custom "nodash" library in replacement of lodash for nice V8 performance gains!
  playTimeLimit: 0, // the amount of time a gotchi can play in one session before being kicked to open room for new players
  enablePlayerQueue: true, // if true, all socket connections are pub/sub to our single consumer server to centrally queue in the order they are received
  minAlchemicaWithdrawlLimit: [0, 0, 0, 0, 1], // the minimum amount of alchemica needed to withdrawl in order: FUD, FOMO, ALPHA, KEK. Only 1 limit by type needs to be met OR the 5th item is overall quantity.
  autoBanBots: true, // set to true to automatically kick and ban detected bots
  toggleMouseMovement: false,
  shadowBanIpCountryWhiteList: ['Philippines', 'Vietnam', 'Thailand', 'Morocco'], // what countries to not auto-shadow ban additional IPs owners log in against
  enableRECAPTCHA: true, // set if reCaptcha is enabled or not
  enableJigger: false, // set if all rental addresses should be run through Jigger anti-bot detection as they log in and withdrawal alchemica
  recaptchaBotThreshold: 0.2, // the threshold score between 0-1 (inclusive) to take action: auto shadow ban and take pocket funds. The lmits on our Redis Enterprise currently only return 0.1, 0.3, 0.7 and 0.9
  forfeitAlchemicaOnShadowBan: true, // set to true to automatically forfeit pocket alchemica when a player gets shadow banned. Funds are auto-refundable on unban
  preventWidthrawlOnShadowBan: false, // set to true to prevent a shadow banned player from withdrawing funds
  customAlchemicaSpawnZone: false, // to define a custom area that alchemica should spawn in for special events top/left/right/bottom, example: [3340,71222,134722,67115]
  alchemicaChannelingSpilloversActive: true, // true if alchemica spillover queue for channeling should be spilling, otherwise the consumer queue is paused
  eventParcels: false, // set to true to display hard coded event parcels logic like GMI Summit
  enableCollisionsParcel: true, // set to true to have physics engine listen for and dispatch collisions for parcels
  enableCollisionsInstallation: true, // set to true to have physics engine listen for and dispatch collisions for installations (also enable installations as wall boundries for players)
  // Hybrid Grid Foundry PoC (off-chain wild veins + Antenna Spine). Also toggled via NEXT_PUBLIC_ENABLE_FOUNDRY_POC=true
  enableParcelFoundryPoC: false,
  providersRiskVeryHigh: ['GHOSTnet GmbH', 'PVimpelCom', 'Hosting technology LTD', 'Cloud assets LLC', 'Plusinfo OOO'],
  providersRiskHigh: [
    'M247 Ltd', // worldwide vpn
    'ASN-QUADRANET-GLOBAL',
    'Datacamp Limited', // Nord VPN
    'Leaseweb Asia Pacific pte. ltd.',
    'OOO Network of data-centers Selectel',
    'Selectel',
    'SkyNet Ltd.',
    'JSC Ufanet',
    'Mikhail Mayorov',
    'Private Enterpreneur Kuchebo Natalia Nikolaevna',
    'MAN net Ltd.',
    'Rial Com JS',
    'JSC ER-Telecom Holding',
    'MKTechnologiya Ltd.',
    'Kontel LLC',
    'PJSC MegaFon',
    'Internet Technologies LLC',
    'OOO Suntel',
    'JSC Mediasoft ekspert',
    'Timer, LLC',
    'Gorset Ltd.',
    'Viter Evgeniy Vasilevich',
    'Natalia Sergeevna Filicheva',
    'OtradnoeNet Ltd.',
    'Joint Stock Company TransTeleCom',

    // possibly medium but still high
    'HERN Labs AB',
    'Hetzner Online GmbH',
    'Clouvider Limited',
    'Biterika Group LLC',

    'GOOGLE-CLOUD-PLATFORM',
    'Datacheap Ltd.',
  ],
};

// the next batch of constants are server zone cluster configuration related, we are splitting all hoods into 10 zones
// Given 40 hoods in a grid of 5 rows and 8 columns that divides into 1 rows x 4 columns = 4 hoods per zone
// NOTE: these also only apply to the main "citaadel" map which is the only map split into zones
export const HOOD_ROWS_PER_ZONE = Number(process.env.HOOD_ROWS_PER_ZONE) || HOOD_ROW_COUNT; // number of hoods covered by each zone vertically (should be divisible by 5)
export const HOOD_COLS_PER_ZONE = Number(process.env.HOOD_COLS_PER_ZONE) || HOOD_COL_COUNT; // number of hoods covered by each zone horizontally (should be divisible by 8)
export const ZONE_ROW = Number(process.env.ZONE_ROW) || 0; // index of this zone in the number of zones created to cover all hoods vertically
export const ZONE_COL = Number(process.env.ZONE_COL) || 0; // index of this zone in the number of zones created to cover all hoods vertically
export const ZONE_ID = Number(process.env.ZONE_ID) || `${ZONE_ROW}_${ZONE_COL}`;
export const ZONE_WIDTH = HOOD_WIDTH * HOOD_COLS_PER_ZONE; // width of each zone in pixels
export const ZONE_HEIGHT = HOOD_HEIGHT * HOOD_ROWS_PER_ZONE; // height of each zone in pixels
export const ZONE_COL_COUNT = HOOD_COL_COUNT / HOOD_COLS_PER_ZONE; // number of horizontal zones
export const ZONE_ROW_COUNT = HOOD_ROW_COUNT / HOOD_ROWS_PER_ZONE; // number of vertical zones
// calculate which zone every hood ID belongs
export const HOOD_ID_TO_ZONE_ID = {};
// note hoods are 1-based where zones are zero-based
for (let hoodYIndex = 1; hoodYIndex < HOOD_ROW_COUNT + 1; hoodYIndex++) {
  const zoneYIndex = Math.floor((hoodYIndex - 1) / HOOD_ROWS_PER_ZONE);
  for (let hoodXIndex = 1; hoodXIndex < HOOD_COL_COUNT + 1; hoodXIndex++) {
    const zoneXIndex = Math.floor((hoodXIndex - 1) / HOOD_COLS_PER_ZONE);
    // hoods are in x,y point format where X goes first,FYI it's also 1 based
    const hoodId = `C${hoodXIndex}${hoodYIndex}`;
    // zones are in row/col index format where y goes first, it's zero based
    const zoneId = `${zoneYIndex}_${zoneXIndex}`;
    HOOD_ID_TO_ZONE_ID[hoodId] = zoneId;
  }
}

// a copy of default GAME_CONFIG to read original defaults as GAME_CONFIG gets assigned changed props at runtime
export const DEFAULT_GAME_CONFIG = { ...GAME_CONFIG };

export const DEFAULT_MAP_CONFIG = {};
DEFAULT_MAP_CONFIG[MAP_ID_CITAADEL] = Object.assign({}, MAP_CONFIG_BY_ID[MAP_ID_CITAADEL]);
DEFAULT_MAP_CONFIG[MAP_ID_AARENA] = Object.assign({}, MAP_CONFIG_BY_ID[MAP_ID_AARENA]);
DEFAULT_MAP_CONFIG[MAP_ID_STORE] = Object.assign({}, MAP_CONFIG_BY_ID[MAP_ID_STORE]);
DEFAULT_MAP_CONFIG[MAP_ID_LODGE] = Object.assign({}, MAP_CONFIG_BY_ID[MAP_ID_LODGE]);

// a cache of changed default proeprties to forward to newly connected FE clients so all props aren't always sent
export const CHANGED_GAME_CONFIG_CACHE = {};
export const CHANGED_MAP_CONFIG_CACHE = {};
CHANGED_MAP_CONFIG_CACHE[MAP_ID_CITAADEL] = {};
CHANGED_MAP_CONFIG_CACHE[MAP_ID_AARENA] = {};
CHANGED_MAP_CONFIG_CACHE[MAP_ID_STORE] = {};
CHANGED_MAP_CONFIG_CACHE[MAP_ID_LODGE] = {};

// the redis stream and consumer group that executes alchemica pickups
export const ALCHEMICA_TAKE_STREAM_NAME = 'alchemica-take-stream';
export const ALCHEMICA_TAKE_GROUP_NAME = 'alchemica-take-consumers';

// the redis stream and consumer group that executes alchemica withdrawls
export const ALCHEMICA_DEPOSIT_STREAM_NAME = 'alchemica-deposit-stream';
export const ALCHEMICA_DEPOSIT_GROUP_NAME = 'alchemica-deposit-consumers';

// the redis stream and consumer group that executes alchemica spawns
export const ALCHEMICA_SPAWN_STREAM_NAME = 'alchemica-spawn-stream';
export const ALCHEMICA_SPAWN_GROUP_NAME = 'alchemica-spawn-consumers';

// the redis stream and consumer group that executes Player Wallet changes
export const PLAYER_WALLET_STREAM = 'player-wallet-stream';
export const PLAYER_WALLET_GROUP = 'player-wallet-consumers';
// the redis stream and consumer group that executes Inventory / Item / Potion changes
export const ITEMS_STREAM = 'items-stream';
export const ITEMS_GROUP = 'items-consumers';
