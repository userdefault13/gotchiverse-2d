import { addGrid, getDefaultCameraSettings, setDefaultZoom } from 'helpers/phaser.helper';
import _ from 'lodash';
import Players, { observerColors } from '../phaser/Players';
import { TILE_SIZE } from 'shared_code/constants/const.game';
import citaadelDepositesJSON from 'shared_code/data/maps/citaadel/collisions/deposites.json';
import aarenaDepositesJSON from 'shared_code/data/maps/aarena/collisions/deposites.json';
import citaadelExtrasJSON from 'shared_code/data/maps/citaadel/collisions/extras.json';
import aarenaObjectsJSON from 'shared_code/data/maps/aarena/collisions/objects.json';
import citaadelObjectsJSON from 'shared_code/data/maps/citaadel/collisions/objects.json';
import citaadelMasterJson from '../../public/maps/chunks/master.json';
import aarenaMasterJson from '../../public/maps/aarena/master.json';
import GameController from 'components/controllers/GameController';
import { scene } from 'components/controllers/SceneController';
import { SceneType } from 'types';
import AnimationsController from './animationsController';
import GlobalState from 'contexts/GlobalState';
import SFXController from './SFXController';
import { getStaticAssetPrefix } from 'helpers/realm.helper';
import { isNaked, isTrueSpectator } from 'helpers/gotchi.helper';
import { getLandWipPixelCenter } from 'helpers/worldRoom.helper';

const staticAssetPrefix = getStaticAssetPrefix();

interface MapInterface {
  initMap: (AOIConfig?) => void;
  init: (type: SceneType) => void;
  displayChunk: (key: string) => void;
  updateMapEvent: () => void;
  toggleMinimap: (isHide: boolean) => void;
  zoomMiniMap: (direction: number) => void;
  syncMinimapViewport: () => void;
  addMiniMapElement: (x: number, y: number, image: string, name?: string, mult?: number) => Phaser.GameObjects.Sprite;
  removeMinimapElement: (name: string) => void;
  supportedAOIConfigs;
  depositesJSON;
  objectsJSON;
}

let MAP_CONFIG: {
  type: SceneType;
  chunkWidth: number;
  chunkHeight: number;
  chunksHorizontal: number;
  AOIConfigId: number;
  chunksFolder?: string;
  chunksVertical: number;
  lastChunkId: number;
  maps: any;
  animatedTileId: number;
  displayedChunks: number[];
  player: null | any;
  init: boolean;
  mapWidth: number;
  mapHeight: number;
};

let depositesJSON, objectsJSON;

const init = (type: SceneType): void => {
  if (type === 'store') {
    // Store map is a single Phaser room — no chunk/master.json pipeline.
    MAP_CONFIG = {
      type: 'store',
      mapWidth: 16 * TILE_SIZE,
      mapHeight: 16 * TILE_SIZE,
      AOIConfigId: 0,
      chunkWidth: 16,
      chunkHeight: 16,
      chunksHorizontal: 1,
      chunksVertical: 1,
      lastChunkId: 0,
      animatedTileId: 0,
      maps: {},
      displayedChunks: [],
      player: null,
      init: true,
    };
    return;
  }
  const masterJson = type === 'aarena' ? aarenaMasterJson : citaadelMasterJson;
  MapController.depositesJSON = type === 'aarena' ? aarenaDepositesJSON : citaadelDepositesJSON;
  MapController.objectsJSON = type === 'aarena' ? aarenaObjectsJSON : citaadelObjectsJSON;

  MAP_CONFIG = {
    type: GameController.MAP,
    mapWidth: masterJson.chunkWidth * masterJson.chunksHorizontal * TILE_SIZE,
    mapHeight: masterJson.chunkHeight * masterJson.chunksVertical * TILE_SIZE,
    AOIConfigId: 0, // default
    chunkWidth: masterJson.chunkWidth,
    chunkHeight: masterJson.chunkHeight,
    chunksHorizontal: masterJson.chunksHorizontal,
    chunksVertical: masterJson.chunksVertical,
    lastChunkId: 0,
    animatedTileId: 0,
    maps: {},
    displayedChunks: [],
    player: null,
    init: true,
  };
};

// scene and Game map object
const initMap = (): void => {
  scene.mapEvent = null;
  MAP_CONFIG.player = scene[Players.selectedPlayer.id] || { x: MAP_CONFIG.mapWidth / 2, y: MAP_CONFIG.mapHeight / 2 };
  MAP_CONFIG.lastChunkId = MAP_CONFIG.chunksHorizontal * MAP_CONFIG.chunksVertical - 1;
  MAP_CONFIG.displayedChunks.length = 0;

  scene.cameras.main.setBounds(0, 0, MAP_CONFIG.mapWidth, MAP_CONFIG.mapHeight);
  // MAP_CONFIG.camera.setBounds(0, 0, worldWidth * TILE_SIZE , worldHeight * TILE_SIZE );
  scene.cameras.main.setRoundPixels(true);
  setDefaultZoom(MAP_CONFIG.mapWidth, MAP_CONFIG.mapHeight, 66 * TILE_SIZE, 66 * TILE_SIZE);

  // add grid to all over the map
  addGrid(MAP_CONFIG.mapWidth / 2, MAP_CONFIG.mapHeight / 2, MAP_CONFIG.mapWidth, MAP_CONFIG.mapHeight);
  createMinimap(200);
  updateEnvironment();
  if (GameController.MAP === 'aarena') {
    toggleMinimap(false);
    scene.toggleMinimap = false;
    GlobalState.PHASER.dispatch({
      type: 'TOGGLE_MINIMAP',
      toggleMinimap: scene.toggleMinimap,
    });
  }

  MAP_CONFIG.init = false;
};

const addMiniMapElement = (x: number, y: number, image: string, name?: string, mult?: number): Phaser.GameObjects.Sprite => {
  const cameraSettings = getDefaultCameraSettings();
  if (name) {
    const element = scene?.minimapElements?.getByName(name) as Phaser.GameObjects.Sprite;
    if (element) return element;
  }

  const element = scene.add.sprite(x, y, image).setAlpha(0.9).setOrigin(0.5, 0.55);
  if (name) {
    // console.log('@addMiniMapElement: name', name);
    element.setName(name);
  }

  if (isTrueSpectator(Players.selectedPlayer.isSpectator)) {
    element.setScale(0.85);
  }
  scene.minimapElementsDisplaySize = cameraSettings.width / 4;
  const multiplier = GameController.MAP === 'aarena' ? 2 : 1;
  let size = scene.minimapElementsDisplaySize * multiplier;

  if (mult) {
    // element multiplier
    size = size * mult;
    element.setDataEnabled().setData('mult', mult);
  }

  element.setDisplaySize(size, size);

  scene.cameras?.main.ignore(element);
  scene.minimapElements?.add(element);
  return element;
};

const removeMinimapElement = (name: string): void => {
  console.log('@MapController:removeMinimapElement: name', name);
  const element = scene?.minimapElements?.getByName(name);
  if (element) element.destroy();
};

/** Runtime circle textures for world-room markers (bazaar / DAO / potion shop). */
const ensureMinimapCircleTexture = (key: string, fill: number, stroke = 0xffffff): void => {
  if (!scene || scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(fill, 1);
  g.fillCircle(16, 16, 13);
  g.lineStyle(3, stroke, 0.95);
  g.strokeCircle(16, 16, 13);
  g.generateTexture(key, 32, 32);
  g.destroy();
};

const WORLD_ROOM_MINIMAP_MARKERS: Array<{ type: string; key: string; color: number; mult: number }> = [
  { type: 'tent', key: 'minimap_marker_bazaar', color: 0xff2bd6, mult: 0.14 }, // pink — bazaar
  { type: 'dao_office', key: 'minimap_marker_dao', color: 0x00f470, mult: 0.14 }, // green — DAO
  { type: 'potion_shop', key: 'minimap_marker_potion_shop', color: 0xffe14a, mult: 0.14 }, // yellow — potion
];

const addWorldRoomMinimapMarkers = (): void => {
  if (!scene || GameController.MAP !== 'citaadel') return;
  const objects = _.flatMap(_.values(MapController.objectsJSON || {}));
  WORLD_ROOM_MINIMAP_MARKERS.forEach(({ key, color }) => ensureMinimapCircleTexture(key, color));

  objects.forEach((obj: { type?: string; position?: { x: number; y: number }; dimensions?: { width: number; height: number } }, index: number) => {
    const marker = WORLD_ROOM_MINIMAP_MARKERS.find((m) => m.type === obj?.type);
    if (!marker) return;
    const center = getLandWipPixelCenter(obj);
    if (!center) return;
    addMiniMapElement(center.x, center.y, marker.key, `${marker.key}_${index}`, marker.mult);
  });
};

const getMinimapSprite = () => {
  if (GameController.MAP === 'aarena') return 'aarena01_4x_minimap';
  else return GlobalState.GAME.state.gameConfig.gotchiverseTheme === 'halloween' ? 'minimap_v2_halloween' : 'minimap_v2_playable';
};

/**
 * Align the Phaser minimap camera with the CSS `.minimap-border` frame.
 * Canvas sits under GameNav (`top: 5rem`); older citaadel Y values (60/70) assumed a full-viewport canvas.
 */
const syncMinimapViewport = (): void => {
  if (!scene?.minimapCam || typeof document === 'undefined') return;

  const border = document.querySelector('.minimap-border') as HTMLElement | null;
  const parent = document.getElementById('pahserGameLoader');
  if (border && parent) {
    const br = border.getBoundingClientRect();
    const pr = parent.getBoundingClientRect();
    const pad = 4; // matches CSS border width
    const x = Math.round(br.left - pr.left + pad);
    const y = Math.round(br.top - pr.top + pad);
    const w = Math.max(1, Math.round(br.width - pad * 2));
    const h = Math.max(1, Math.round(br.height - pad * 2));
    scene.minimapCam.setViewport(x, y, w, h);
    return;
  }

  // Fallback when HUD chrome isn't mounted yet (canvas is offset by GameNav).
  const top = 20;
  scene.minimapCam.setPosition(10, top);
};

const createMinimap = (size: number): void => {
  if (!scene) return;
  const player = scene[Players.selectedPlayer.id];
  if (!player) return;

  const alpha = GameController.MAP === 'aarena' ? 1 : 0.8;
  scene.minimapSprite = scene.add.sprite(-5, -5, getMinimapSprite(), 0).setName('minimap').setOrigin(0, 0).setDepth(500).setAlpha(alpha);
  scene.minimapSprite.displayWidth = MAP_CONFIG.mapWidth;
  scene.minimapSprite.displayHeight = MAP_CONFIG.mapHeight;

  const zoomInit = GameController.MAP === 'aarena' ? size : size * 2;
  // Canvas is always under GameNav (`top: 5rem`); start near the CSS frame, then sync precisely.
  scene.minimapCam = scene.cameras
    .add(10, 20, size, size)
    .setZoom(zoomInit / MAP_CONFIG.mapWidth)
    .setName('mini');
  syncMinimapViewport();
  // HUD chrome may mount a tick later — re-align once the purple frame exists.
  window.setTimeout(() => syncMinimapViewport(), 0);
  window.setTimeout(() => syncMinimapViewport(), 250);

  scene.minimapZoomLevel = 0;
  scene.minimapDefaultZoom = (size * 2) / MAP_CONFIG.mapWidth;
  scene.minimapCam.setBounds(0, 0, MAP_CONFIG.mapWidth, MAP_CONFIG.mapHeight);
  scene.cameras.main.ignore(scene.minimapSprite);
  scene.minimapCam.startFollow(player, true);
  scene.minimapElements = scene.add.container(0, 0).setDepth(501);

  // nees a quick refactor to dynamically get only 1 from assetsController
  if (MapController.depositesJSON && _.keys(MapController.depositesJSON).length) {
    const vortices = _.flatMap(_.values(MapController.depositesJSON));
    vortices.forEach((v) => {
      if (v.position) {
        const { x, y } = v.position;
        addMiniMapElement(x * 64, y * 64, 'icon_vortex');
      }
    });
  }

  if (GameController.MAP === 'citaadel') {
    const {
      position: { x: aarenaIconX, y: aarenaIconY },
    } = _.find(citaadelExtrasJSON.C82, (item) => item.type === 'pad' && item.use === 'aarena');
    scene.minimapAarenaIcon = addMiniMapElement(aarenaIconX * 64, aarenaIconY * 64, 'minimap_aarena_icon');
    addWorldRoomMinimapMarkers();
  }
  if (!Players.selectedPlayer.isSpectator || isNaked(Players.selectedPlayer.isSpectator)) {
    scene.minimapGotchi = addMiniMapElement(player.x, player.y, 'minimap-gotchi');
  } else {
    scene.minimapGotchi = addMiniMapElement(player.x, player.y, `minimap_obs_${observerColors[Players.selectedPlayer.spectatorColor]}`);
  }
  // const maskShape = scene.add.sprite(20, 60, 'minimapMask').setOrigin(0, 0);
  // const mask = new Phaser.Display.Masks.BitmapMask(scene, maskShape);
  // scene.minimapCam.setMask(mask, true);
};

const toggleMinimap = (isHide: boolean): void => {
  if (!scene) return;
  scene.minimapCam?.setVisible(isHide);
  scene.toggleMinimap = isHide;
};

const zoomMiniMap = (direction: number): void => {
  // Clamp zoom level between 0 and MAX_ZOOM_LEVEL
  const MAX_ZOOM_LEVEL = 2;
  scene.minimapZoomLevel = Math.min(Math.max(scene.minimapZoomLevel + direction, 0), MAX_ZOOM_LEVEL);

  const zoomLevels = GameController.MAP === 'aarena' ? [0.5, 0.8, 1] : [1, 1.5, 2];
  const newMapZoom = zoomLevels[scene.minimapZoomLevel] * scene.minimapDefaultZoom;
  const newDisplaySize = scene.minimapElementsDisplaySize / zoomLevels[scene.minimapZoomLevel];
  scene.minimapCam?.setZoom(newMapZoom);
  scene.minimapElements.each((element) => {
    const mult = element.getData('mult') || 1;
    element.setDisplaySize(newDisplaySize * mult, newDisplaySize * mult);
  });
};

const displayAarenaChunk = (key) => {
  const map = scene.make.tilemap({ key: key });
  // load tileset
  const arenaStatic = map.addTilesetImage('aarena01_static1', 'aarena01_static1');
  const roads = map.addTilesetImage('roads', 'roads');
  const groundAlchemica = map.addTilesetImage('ground_alchemica', 'alchem_new');

  // Extracts the chunk number from file name
  const x = 0;
  const y = 0;
  map.createLayer('bottom', [arenaStatic], x, y).setDepth(4);
  map.createLayer('mid', [arenaStatic, groundAlchemica, roads], x, y).setDepth(99);
  map.createLayer('top', [arenaStatic], x, y).setDepth(300);

  const animatedGids = [
    {
      gid: 1, // cauldron big
      key: 'aarena01_cauldron_big',
    },
    {
      gid: 13, // cauldron small
      key: 'aarena01_cauldron_smol',
    },
    {
      gid: 1761, // glow
      key: 'aarena01_glow',
    },
    {
      gid: 1765, // fire splash
      key: 'fire_splash',
    },
    {
      gid: 1830, // fire sparks big
      key: 'fire_sparks_big',
    },
    {
      gid: 1842, // fire splash big
      key: 'fire_splash_big',
    },
  ];

  for (let gidIndex = 0; gidIndex < animatedGids.length; gidIndex++) {
    const gid = animatedGids[gidIndex].gid;
    const key = animatedGids[gidIndex].key;

    const groundObjects = map.createFromObjects('ground', { gid: gid, key: key });
    const fireObjects = map.createFromObjects('fire_splash', { gid: gid, key: key });
    const cauldronObjects = map.createFromObjects('cauldrons', { gid: gid, key: key });
    const sparkObjects = map.createFromObjects('sparks', { gid: gid, key: key });
    const animatedObjects = groundObjects.concat(fireObjects, cauldronObjects, sparkObjects);

    for (let index = 0; index < animatedObjects.length; index++) {
      const animatedObject = animatedObjects[index] as Phaser.GameObjects.Sprite;
      // animatedObject.setDepth(500);
      if (GlobalState.SETTINGS.state.allowInstallationAnimations) AnimationsController.play(animatedObject, key);
    }

    for (let index = 0; index < groundObjects.length; index++) {
      const groundObject = groundObjects[index] as Phaser.GameObjects.Sprite;
      groundObject.setAlpha(0.3);
      groundObject.setTint(0xff32e6);
      groundObject.setDepth(10);
    }

    for (let index = 0; index < fireObjects.length; index++) {
      const fireObject = fireObjects[index] as Phaser.GameObjects.Sprite;
      fireObject.setDepth(101);
    }

    for (let index = 0; index < cauldronObjects.length; index++) {
      const cauldronObject = cauldronObjects[index] as Phaser.GameObjects.Sprite;
      cauldronObject.setName(`cauldron_${cauldronObject.x}_${cauldronObject.y}`);
      SFXController.setSpatialAudios({ id: `cauldron_${cauldronObject.x}_${cauldronObject.y}`, container: cauldronObject, key: 'cauldron' }, true);
      cauldronObject.setDepth(299);
    }

    for (let index = 0; index < sparkObjects.length; index++) {
      const sparkObject = sparkObjects[index] as Phaser.GameObjects.Sprite;
      sparkObject.setDepth(103);
    }
  }

  // animated tiles
  if (GlobalState.SETTINGS.state.allowAnimatedTiles && scene.sys.animatedTiles) {
    scene.sys.animatedTiles.init(map);
  }
};

const displayChunk = (key): void => {
  if (GameController.MAP === 'aarena') {
    displayAarenaChunk(key);
    return;
  }
  const map = scene.make.tilemap({ key: key });
  // load tileset
  const tower1 = map.addTilesetImage('tower1', 'tower1'); //* background tile
  const tower2 = map.addTilesetImage('tower2', 'tower2'); //* background tile
  const tower3 = map.addTilesetImage('tower3', 'tower3'); //* background tile
  const tower4 = map.addTilesetImage('tower4', 'tower4'); //* background tile
  // const lights = map.addTilesetImage('lights', 'lights'); //* background tile
  const unplayable = map.addTilesetImage('unplayable', 'unplayable'); //* background tile
  const gateNorth = map.addTilesetImage('gate_north', 'gate_north'); //* background tile
  const gateEast = map.addTilesetImage('gate_east', 'gate_east'); //* background tile
  const gateSouth = map.addTilesetImage('gate_south', 'gate_south'); //* background tile
  const gateWest = map.addTilesetImage('gate_west', 'gate_west'); //* background tile
  const alchem = map.addTilesetImage('alchem', 'alchem'); //* background tile
  const alchemGlow = map.addTilesetImage('alchem_glow', 'alchem_glow'); //* background tile
  const roads = map.addTilesetImage('roads', 'roads'); //* background tile
  const statues = map.addTilesetImage('statues', 'statues'); //* background tile
  const statuePrince = map.addTilesetImage('statue_prince', 'statue_prince'); //* background tile

  // Extracts the chunk number from file name
  const chunkId = parseInt(key.match(/\d+/));
  const chunkX = (chunkId % MAP_CONFIG.chunksHorizontal) * MAP_CONFIG.chunkWidth;
  const chunkY = Math.floor(chunkId / MAP_CONFIG.chunksHorizontal) * MAP_CONFIG.chunkHeight;
  const x = chunkX * TILE_SIZE;
  const y = chunkY * TILE_SIZE;

  map.createLayer('alchemica', [alchem, alchemGlow], x, y).setDepth(4); //* background layer
  map
    .createLayer('tower_bottom', [tower1, tower2, tower3, tower4, gateNorth, gateEast, gateSouth, gateWest, roads, statues, statuePrince], x, y)
    .setDepth(99); //* background layer
  map
    .createLayer('tower_top', [tower1, tower2, tower3, tower4, unplayable, gateNorth, gateEast, gateSouth, gateWest, statues, statuePrince], x, y)
    .setDepth(300); //* background layer

  // animated tiles
  if (GlobalState.SETTINGS.state.allowAnimatedTiles && scene.sys.animatedTiles) {
    scene.sys.animatedTiles.init(map);
  }

  MAP_CONFIG.maps[chunkId] = map;
  MAP_CONFIG.displayedChunks.push(chunkId);
};

const updateEnvironment = () => {
  if (!MAP_CONFIG.player) {
    console.warn('Map.updateEnvironment called with no player.');
    return;
  }

  if (GameController.MAP === 'aarena') {
    if (scene.game.cache.tilemap.exists('aarena')) {
      displayChunk('aarena');
    } else {
      scene.load.tilemapTiledJSON(
        'aarena',
        `${staticAssetPrefix}maps/${
          GlobalState.GAME.state.gameConfig.aarenaTheme ? `aarena_skin_${GlobalState.GAME.state.gameConfig.aarenaTheme}` : 'aarena'
        }/chunk0.json`,
      );
      scene.load.start();
    }
    return;
  }

  // calculate chunk that should be displayed and compare it to the current displayed chunk to eliminate unnecessary renders
  const chunkId = computeChunkId(MAP_CONFIG.player.x, MAP_CONFIG.player.y);
  if (!scene.currentChunk) {
    scene.currentChunk = chunkId;
    scene.previousChunk = chunkId;
  } else if (scene.currentChunk === chunkId) return;
  else {
    scene.previousChunk = scene.currentChunk;
    scene.currentChunk = chunkId;
  }

  const chunks = listAdjacentChunks(chunkId); // List the id's of the chunks surrounding the one we are in
  const newChunks = chunks.filter((x) => !MAP_CONFIG.displayedChunks.includes(x));
  const oldChunks = findDiffArrayElements(MAP_CONFIG.displayedChunks, chunks); // Lists the surrounding chunks that are still displayed (and shouldn't anymore)

  newChunks.forEach((c) => {
    // console.log('exist on cache ', scene.MAP_CONFIG.cache.tilemap.exists('chunk' + c));
    // console.log('loading chunk' + c);
    if (scene.game.cache.tilemap.exists('chunk' + c)) {
      displayChunk('chunk' + c);
    } else {
      // console.log(`loading chunk ${c}`);
      scene.load.tilemapTiledJSON('chunk' + c, `${staticAssetPrefix}maps/chunks/chunk` + c + '.json');
    }
  });

  if (newChunks.length > 0) {
    scene.load.start();
  }

  oldChunks.forEach((c) => {
    // console.log('$$$ destroy  chunk' + c);
    // scene.MAP_CONFIG.cache.tilemap.remove('chunk' + c);
    removeChunk(c);
  });
};

const listAdjacentChunks = (chunkId: integer) => {
  const chunks: number[] = [];
  const isAtTop = chunkId < MAP_CONFIG.chunksHorizontal;
  const isAtBottom = chunkId > MAP_CONFIG.lastChunkId - MAP_CONFIG.chunksHorizontal;
  const isAtLeft = chunkId % MAP_CONFIG.chunksHorizontal === 0;
  const isAtRight = chunkId % MAP_CONFIG.chunksHorizontal === MAP_CONFIG.chunksHorizontal - 1;
  chunks.push(chunkId);

  if (!isAtTop) chunks.push(chunkId - MAP_CONFIG.chunksHorizontal);
  if (!isAtBottom) chunks.push(chunkId + MAP_CONFIG.chunksHorizontal);
  if (!isAtLeft) chunks.push(chunkId - 1);
  if (!isAtRight) chunks.push(chunkId + 1);
  if (!isAtTop && !isAtLeft) chunks.push(chunkId - 1 - MAP_CONFIG.chunksHorizontal);
  if (!isAtTop && !isAtRight) chunks.push(chunkId + 1 - MAP_CONFIG.chunksHorizontal);
  if (!isAtBottom && !isAtLeft) chunks.push(chunkId - 1 + MAP_CONFIG.chunksHorizontal);
  if (!isAtBottom && !isAtRight) chunks.push(chunkId + 1 + MAP_CONFIG.chunksHorizontal);

  // console.log('adjacent chunks ', chunks);
  return chunks;
};

const computeChunkId = (x: number, y: number) => {
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor(y / TILE_SIZE);
  // console.log('tilePosition, ', tileX, tileY);
  const chunkX = Math.floor(tileX / MAP_CONFIG.chunkWidth);
  const chunkY = Math.floor(tileY / MAP_CONFIG.chunkHeight);
  // console.log(`chunk x:${chunkX} y:${chunkY}`);
  // console.log('GameData', Game);
  return chunkY * MAP_CONFIG.chunksHorizontal + chunkX;
};

const removeChunk = (chunkId: integer) => {
  const idx = MAP_CONFIG.displayedChunks.indexOf(chunkId);
  if (idx > -1) {
    MAP_CONFIG.displayedChunks.splice(idx, 1);
    MAP_CONFIG.maps[chunkId].destroy();
  }
};

const findDiffArrayElements = (firstArray, secondArray) => {
  return firstArray.filter((i) => {
    return secondArray.indexOf(i) < 0;
  });
};

// throttled call to updateEnvironment so that it is dispatched no more than once every 250ms no matter how frequently it's called
// if called multiple times in a 250ms duration it gets called once on first call and then once at the end of 250ms (leading + trailing options)
const updateMapEvent = _.throttle(
  () => {
    if (scene && scene.mapEvent == null && !MAP_CONFIG.init) {
      // add first check for gotchis that stopped moving before first loop update
      updateEnvironment();
    }
  },
  250,
  { leading: true, trailing: true },
);

// for now we support only 1 FE AOI configs
const supportedAOIConfigs = [{ aoiColCount: 128, aoiRowCount: 80 }];

const MapController: MapInterface = {
  init,
  initMap,
  displayChunk,
  updateMapEvent,
  toggleMinimap,
  zoomMiniMap,
  syncMinimapViewport,
  supportedAOIConfigs,
  objectsJSON,
  depositesJSON,
  addMiniMapElement,
  removeMinimapElement,
};

export default MapController;
