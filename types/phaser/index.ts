import * as _ from 'lodash';
import { GotchiverseParcel, BuildInstallation, Vector2, Installation, Parcel, SceneType, Player } from 'types';
import { Alchemica, Enemy } from 'types/realm';

export type SoundAction = 'play' | 'fadeIn' | 'spatial-play' | 'sound-loop'; // action to take place after dynamic load
export type SoundType = 'MUSIC' | 'FX';
export type TextureType = 'image' | 'spritesheet' | 'svg';

export interface SoundConfig {
  id: string;
  volume: number;
  loop: boolean;
  sound?: string;
  innerRange?: number;
  instances?: number;
  outer?: number;
  preload?: boolean;
  type?: SoundType;
  state?: 'loading' | 'loaded' | 'created';
  action?: SoundAction;
  extension?: 'mp3' | 'ogg';
  spatial?: SpatialSoundFX; // all spatial sounds require this extra conf setting
}

export interface TextureConfig {
  id: string;
  preload?: boolean;
  type?: TextureType;
  extension?: 'png' | 'svg' | 'json';
  // Animationtype
  map?: SceneType;
  folder?: string;
  animationConfig?: AnimConfig;
  json?: any;
  /** Load from this app's /public (not verse-static CDN). Soft-launch sheets. */
  local?: boolean;
}

export interface AnimConfig {
  configKey?: string;
  slice?: number[];
  frameId?: number;
  index?: number;
  frames?: any; // json file
  isLoop?: boolean;
  hide?: boolean;
  duration?: number;
}

export interface SpatialSoundFX {
  spatialInnerRange: number;
  spatialOuterRange: number;
}

export interface Scene extends Phaser.Scene {
  key: string;
  dynamicAdd: any;
  isSprint?: boolean;
  preloaded: boolean;
  batchQueue: BatchEquipItem[];
  router: any;
  onSocketReconnect: 'init' | 'reconnect' | 'transfer';
  lastParcelCollisionId: string;
  map?: {
    width: number;
    height: number;
    widthInPixels: number;
    heightInPixels: number;
  };
  grid?: Phaser.GameObjects.Grid;
  timer?: number;
  stars?: Phaser.GameObjects.TileSprite;
  starField?: Phaser.GameObjects.TileSprite;
  starsFrame?: number;
  starFieldFrame?: number;
  zoom?: number;
  dragPinch?: any;
  maxZoomOut?: boolean;

  sys: Systems;
  mapEvent?: any;
  minimapCam?: Phaser.Cameras.Scene2D.Camera;
  currentChunk?: number;
  previousChunk?: number;
  animatedTiles?: any;
  minimapGotchi?: Phaser.GameObjects.Image;
  minimapAarenaIcon?: Phaser.GameObjects.Image;
  minimapElements?: Phaser.GameObjects.Container;
  minimapZoomLevel?: number;
  minimapDefaultZoom?: number;
  minimapElementsDisplaySize?: number;
  spawnedParcelsByIdMap?: any; // lodash Map
  localPlayerData?: LocalPlayerData;
  fadeLevel?: number;
  playersToLoad?: Player[];
  loadedPlayerIds?: string[];
  gameConfig?: GameConfig;
  mapConfig?: MapConfig;
  activeRealmId?: number | boolean;
  statueCollision?: any; // sfx
  lastUpdate?: {
    direction: string;
    sprint: boolean;
    dirVector: Vector2;
  };
  tints?: { equip: number[]; unequip: number[]; active: number[]; fud: number[]; fomo: number[]; alpha: number[]; kek: number[] };
  debugObjects?: DebugObjects;
  projectiles?: Projectiles;
  activeInstallation?: Phaser.GameObjects.Container;
  activeParcel?: Parcel;

  missiles?: Map<string, Phaser.GameObjects.Sprite>;
  meleeGroup?: Map<string, Phaser.GameObjects.Sprite>;
  potionsGroup?: Map<string, Phaser.GameObjects.Sprite>;

  installationGroup?: any; // lodash Map
  installationsWaiting?: any; // lodash Map
  maakerBotsGroup?: any; // lodash Map
  marker?: Phaser.GameObjects.Container;
  outLinePlugin?: any; // not sure what this is
  buildInstallation?: BuildInstallation; // for the moment.
  ownedParcels?: GotchiverseParcel[];
  currentAccount?: string;
  buildModeInstallations?: string[];
  lastChanneledAlchemica?: number;
  tilesHolder?: Phaser.GameObjects.Container;
  interactionContainer?: Phaser.GameObjects.Container;
  activeDeposit?: boolean;
  itemsGroup?: any;
  enemiesGroup?: any; // lodash Map
  currentItems?: Alchemica[];
  currentAlchemica?: any; // unclear
  currentDepositId?: number; // double check
  pads?: any;
  citaadel_music?: {
    isPlaying: boolean;
  };
  unrecoverableSocketError?: boolean;
  chatKeys?: Keymap;
  combatKeys?: Keymap;
  wasdKeys?: Keymap;
  sprintKey?: Keymap;
  cursorKeys?: Keymap;
  actionKeys?: Keymap;
  itemHotKeys?: Keymap;
  toggleMinimap?: boolean;
  disableKeyboard?: boolean;
  isMoving?: boolean;
  isOnRoad?: boolean;
  isCursorInGame?: boolean;
  sounds?: Soundmap;
  toggleChatBar?: boolean;
  toggleChat?: boolean;
  minimapSprite?: Phaser.GameObjects.Sprite;
  controlsScheme?: string;
  rightClicked?: boolean;
  rightClickedTimestamp?: number;
  leftClickedTimestamp?: number;
  rangedChargeStartTimestamp?: number;
  meleeChargeStartTimestamp?: number;
  continuousFireInterval?: number;
  lastRangedAttack?: number;
  lastMeleeAttack?: number;
  quests?: Map<string, Phaser.GameObjects.Container[]>;
}

interface BatchEquipItem {
  id: string;
  action: 'EQUIP' | 'UNEQUIP';
}

interface Projectiles {
  [str: string]: Phaser.GameObjects.Sprite;
}

interface DebugObjects {
  [str: string]: Phaser.GameObjects.Image;
}

export interface LocalPlayerData {
  ownedParcels?: Parcel[];
  inventory?: Installation[];
}

interface GameConfig {
  enablePlayerWallet: boolean;
  enableTipping: boolean;
  combatIsLive: boolean;
  miniGameRoundActive: boolean;
  miniGameMode: boolean;
  miniGameTimeLeft: number;
  pinnedAlert: string;
  miniGamePrestartTrigger: any; // not sure
  allowUnlimitedZoomOut: boolean;
  aoiColCount: number;
  miniGameAutoStartInterval: number;
  miniGameRoundDuration: number;
  spinDuration: number;
  enableRangedCharge: boolean;
  gotchiverseTheme: string;
  enableNakedGotchis: boolean;
}

export type CombatControlScheme = 'arcade' | 'moba';
export type ShootMode = 'PVP' | 'PVE';

interface MapConfig {
  ID: string;
  WIDTH: number;
  HEIGHT: number;
  AOI_COL_COUNT: number;
  AOI_ROW_COUNT: number;
  SPAWN_BOUNDS?: Rect;
  NO_SPAWN_ZONES?: Rect[];
  COMBAT_TESTING_SPAWN_AREA?: Circle;
  MAX_PLAYER_CAPACITY: number;
  MAX_MAP_ALCHEMICA_CHUNK_COUNT: number;
  SHOOT_MODE: ShootMode;
  SPRINT_RESOURCE: string;
  GOTCHI_SPEED: number;
  SPRINT_FACTOR: number;
  ENABLE_INERTIA: boolean;
  RESPAWN_DELAY: number;
  PINNED_ALERT?: string;
}

interface Rect {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

interface Circle {
  X: number;
  Y: number;
  RADIUS: number;
}

interface Systems extends Phaser.Scenes.Systems {
  animatedTiles?: any;
}

export interface Keymap {
  [str: string]: Phaser.Input.Keyboard.Key;
}

interface Soundmap {
  [str: string]: any;
  fadeInTween?: Phaser.Tweens.Tween;
  fadeOutTween?: Phaser.Tweens.Tween;
}
