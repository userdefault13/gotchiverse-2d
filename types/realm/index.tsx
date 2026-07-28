import { TransactionState } from 'contexts/UIContexts/store';
import { JsonParcel, Status, Vector2 } from 'types';
import type { BigNumber } from 'ethers';
import { SoundType } from 'types/phaser';
import { AllowedItemTypeId } from 'helpers/items.helpers';
export type TowerTypes = 'tower1' | 'tower2' | 'tower3' | 'tower4';

export type SceneType = 'citaadel' | 'aarena'; // SCENE_TYPE

export type BinaryBoolean = 0 | 1;
export const AllowedTokens = ['FUD', 'FOMO', 'ALPHA', 'KEK', 'GLTR', 'GHST'] as const;
export type AllowedTokenTypes = typeof AllowedTokens[number];

export type TokenCounters = {
  [token in AllowedTokenTypes]?: number;
};

// ITEM SHOP TYPES
export type PotionItemType = 'HP' | 'AP';
export type RegenerateProps = 'health' | 'AP';
export type ActionType = 'consume' | 'drop';

interface ActionMetadataConfig {
  attribute: RegenerateProps;
  amount: number;
  duration: number;
}

export interface ActionMetadata {
  command: string;
  config: ActionMetadataConfig;
}

export interface ShopItemInventory {
  quickslot: boolean;
  weight: number;
}

interface ShopItemSupplyConfig {
  initialQuantityAvailable: number;
  maxQuantityAvailable: number;
  autoRestockCron: string;
  autoRestockAmount: number;
}
type CooldownCategory = 'hp' | 'ap' | 'enemy';
type ShopItemType = 'potion' | 'enemy' | 'foundry' | 'PLM2' | 'GMLS';
type ShopItemCategory = 'boosts' | 'enemy' | 'foundry';

export interface ShopItemFE {
  // FE SPECIFIC SHOP ITEM PROPS
  icon?: string;
  image?: string;
  quickslotImage?: string;

  cooldown?: number;
  alchemicaType?: AllowedTokenTypes;
  // descriptionMulti?: {
  //   [action in ItemsIcon]?: number;
  // };
}

export type ItemsIcon = 'ap' | 'hp' | 'lifespan' | 'attack';

export interface ShopItem extends ShopItemFE {
  itemTypeId: AllowedItemTypeId;
  type: ShopItemType;
  category: ShopItemCategory;
  cooldownCategory: CooldownCategory;
  label: string;
  labelTooltip: string;
  description: string;
  propDescription: {
    [action in ItemsIcon]: string;
  };
  cost: TokenCounters;
  purchasable: boolean;
  enabled: boolean;
  inventory: ShopItemInventory;
  actions: ActionType[];
  actionsMetadata: {
    [action in ActionType]?: ActionMetadata[];
  };

  dimensions: Dimensions;
  supplyConfig: ShopItemSupplyConfig;
  foundryKitId?: string;
}

export interface ShopCart {
  id: number;
  quantity: number;
}

export interface ShopPurchase {
  items?: ShopCart[];
}

export interface ShopPurchaseStatus {
  address: string;
  error: string;
  gotchiId: string;
  status: Status;
}

export interface ItemUse {
  error: string;
  gotchiId: string;
  itemId: AllowedItemTypeId;
  quantityRemaining: number;
  quantityUsed: number;
  quickslotIndex: string;
  status: Status;
}

// QUICKSLOTS

export const QuickslotsAllowedIndexes = [0, 1, 2, 3] as const; // we will only have 4 quickslots all should be defined all the time. This logic will transform in the future inventory
export type QuickslotIndex = typeof QuickslotsAllowedIndexes[number]; // Define quickslot index in top-right top-bottom order
export interface Quickslot {
  index: QuickslotIndex; // Quickslot index this give us the quickslot position
  hotkey: string; // hotkey to trigger the quickslot action this is index + 1
  item?: QuickSlotItem; // Actual Shop Item
}

// Make sure we're always have 4 quickslots and we will only update the item prop
export type QuickslotsType = {
  [slot in QuickslotIndex]: Quickslot;
};

export type QuickslotQuantityUpdate = {
  [slot in AllowedItemTypeId]?: QuickSlotItem;
};

export interface QuickslotUpdate {
  gotchiId: string;
  updatesByIndex: QuickslotQuantityUpdate;
}

export interface QuickSlotItem {
  id?: AllowedItemTypeId;
  quantity?: number;
  auto?: boolean;
  slotIndex?: QuickslotIndex;
  lastUse?: number;
}

// POTIONS
export interface Potion {
  id: string;
  itemId: string;
  label: string;
  quantity: number;
  x: number;
  y: number;
  destroyed?: boolean;
  created?: boolean;
}

export interface PotionConsume {
  id: AllowedItemTypeId;
  gotchiId: string;
}

//
export interface MapInterface {
  initMap: (AOIConfig?) => void;
  displayChunk: (key) => void;
  updateMapEvent: () => void;
  toggleMinimap: (isHide: boolean) => void;
  zoomMiniMap: (direction: number) => void;
  supportedAOIConfigs;
  updateEnvironment?: () => void;
}
export interface AlchemicaCounters {
  fud: number;
  fomo: number;
  alpha: number;
  kek: number;
  total: number;
}

export interface AlchemicaNumbers {
  fud?: number;
  fomo?: number;
  alpha?: number;
  kek?: number;
  // gltr?: number;
}

export interface MouseActiveData {
  active: boolean;
  position?: Vector2; // we don't need to send position if active is false
  sprint?: boolean;
}

export interface RecaptchaTokenData {
  recaptchaToken: any;
  action: string;
}

export interface DirectionData {
  direction: string;
  isSprint?: boolean;
}

export interface OrientationData {
  orientation: number;
}
export interface NFTData {
  id: string;
  installationId: string;
}

export interface InstallationActiveData {
  account: string;
}

export interface Teleport {
  parcelId: string;
}

export interface InstallationData {
  parcelId: string | boolean;
  itemId: number;
  position: Vector2;
  size: Dimensions;
  realmId: number;
  type: 0 | 1;
}

export interface DataString {
  data: string;
}

export interface EquipUnequipMoveData {
  itemId: number;
  type: 'INSTALLATION' | 'TILE';
  realmId: number;
  relativePosition: Vector2;
  isMoving?: string;
}

export interface EquipUnequipContract {
  method: 'batchEquip' | 'equipInstallation' | 'equipTile' | 'unequipInstallation' | 'unequipTile' | 'moveInstallation' | 'moveTile';
  realmId: number; // parcel tokenId
  gotchiId: number;
  itemId?: number;
  position?: Vector2;
}

export interface BatchEquipContract {
  realmId: number; // parcel tokenId
  gotchiId: number;
}

export interface MoveContract {
  method: 'equipInstallation' | 'equipTile' | 'unequipInstallation' | 'unequipTile' | 'moveInstallation' | 'moveTile';
  realmId: number; // parcel tokenId
  itemId: number;
  position: Vector2;
  positionNew: Vector2;
}

export interface UpgradeInstallationContract {
  realmId: number;
  coordinateX: number;
  coordinateY: number;
  installationId: number;
}
export interface SpeedupUpgradeContract {
  upgradeIndex: number;
  gotchiId: number;
  blocks: number;
}

export interface ChannelData {
  realmId: number;
  gotchiId: number;
}
export interface SurveyParcel {
  realmId: number;
}

export interface AnimationConfig {
  columns: number;
  image: string;
  imageheight: number;
  imagewidth: number;
  margin: number;
  name: string;
  spacing: number;
  tilecount: number;
  tileheight: number;
  tilewidth: number;
  originX: 0.3;
  originY: 0.6;
  nftOffset?: Vector2;
  nftFrame?: Dimensions;
  offset: Vector2;
  tiles?: SpriteConfigTiles[];
}
interface SpriteConfigTiles {
  animation: AnimationTiledConfig[];
  id: number;
}
interface AnimationTiledConfig {
  duration: number;
  tileid: number;
}

export interface InstallationIdData {
  id: string;
  parcelId: string;
  itemId: number;
  position: Vector2;
  type: 'INSTALLATION' | 'TILE';
  state: BinaryBoolean;
  realmId?: number;
}

export interface CreateInstallationOptions {
  isWaiting?: boolean;
  isPendingRemove?: boolean;
  isMove?: boolean;
  isBatch?: boolean;
  tintType?: 'EQUIP' | 'UNEQUIP';
}

export interface InstallationTypeLocal {
  itemId: number;
  width: number;
  height: number;
  name: string;
  type: 'INSTALLATION' | 'TILE';
  /** Number for diamond types; `'0-LE'` used for early altar spritesheet keys. */
  installationType?: number | string;
  tileType?: number;
  alchemicaType?: number;
  level?: number;
  craftTime?: number;
  spillRadius?: number;
  spillRate?: number;
  prerequisites?: number[];
  harvestRate?: number;
}

export interface BuildInstallation extends InstallationMetadata {
  isMoving?: string; // installation
  relativePosition?: Vector2;
}

export interface InstallationMetadata {
  id: string;
  position: Vector2;
  parcelId: string;
  realmId: number;
  state: BinaryBoolean;
  globalPosition: Vector2;
  typeData: InstallationTypeLocal;
  spriteMetadata: SpriteMetadata;
  nft?: NFTPhaser;
}

export interface NFTPhaser {
  id: string;
  img: Phaser.GameObjects.Image;
}

// export interface LeaderboardData {
//   rank: number;
//   id: number;
//   deaths: number;
//   kills: number;
//   hits: number;
//   lastDeathTime: number;
//   lastHitTime: number;
//   name?: string;
//   sessionTime: number;
//   killDeathRatio?: number;
//   killStreak?: number;
//   damageDealt?: number;
//   alchemicaPickedUp?: number;
//   destructiblesHit?: number;
//   destructiblesKilled?: number;
// }

export interface SpriteMetadata {
  key: string;
  frame: number;
  jsonData: AnimationConfig;
  isDecoration?: boolean;
  numOfFramesEachAnim: number;
  pngName: string;
  animationsCount: number;
  origin?: Vector2;
  offsets?: Offset;
  nftOffset?: Vector2;
  x?: number;
  y?: number;
}

export interface LeaderboardData {
  rank: number;
  id: number;
  deaths: number;
  kills: number;
  hits: number;
  lastDeathTime: number;
  lastHitTime: number;
  name?: string;
  sessionTime: number;
  killDeathRatio?: number;
  killStreak?: number;
  damageDealt?: number;
  alchemicaPickedUp?: number;
  destructiblesHit?: number;
  destructiblesKilled?: number;
  tips: any;
  tipsAverage: number;
  tipsSent: number;
  tipsValueSent: number;
}

interface Offset {
  key: 'fud' | 'fomo' | 'alpha' | 'kek';
  x: number;
  y: number;
  frame: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface ParcelGridEventData {
  id: string;
  grid: number[][];
}

export interface AlchemicaData {
  depositId: number; // player id
}

export interface ParcelEvent {
  id: string;
  installations?: string[];
}

export interface InstallationEvent {
  action: string;
  data: ParcelGridEventData[] | string[];
}

export interface GlobalChatEventData {
  action: string;
  message?: string;
  channel?: string;
}

export interface BubbleChatEventData {
  state: boolean;
  message?: string;
}

export interface FocusEventData {
  id?: string;
  state: boolean;
}

export interface SizeObj {
  width: number;
  height: number;
}

export interface BoundsObject extends Vector2 {
  xMax: number;
  yMax: number;
}

export interface ParcelBoundsObject extends Vector2 {
  id: string;
  lowerBounds: BoundsObject;
  upperBounds: Vector2;
}

// Items

export interface Alchemica {
  id: string;
  key: number;
  label: string;
  size: number;
  x: number;
  y: number;
  quantity?: number;
  created?: boolean;
  destroyed?: boolean;
  breadcrumb?: boolean;
}

export type EnemyTypeModels = 'GMLS' | 'PLM2' | 'ROFL';

export interface GMLSComponents {
  container: Phaser.GameObjects.Container;
  headContainer: Phaser.GameObjects.Container;
  healthContainer: Phaser.GameObjects.Container;
  model: EnemyTypeModels; // or whichever type model is
  type: EnemyTypeModels;
  mainSprite: Phaser.GameObjects.Sprite;
  headSprite: Phaser.GameObjects.Sprite;
  idleVFX: Phaser.GameObjects.Sprite;
  headOffset: Vector2;
}

export interface ROFLComponents {
  container: Phaser.GameObjects.Container;
  healthContainer: Phaser.GameObjects.Container;
  data: Enemy;
  mainSprite: Phaser.GameObjects.Sprite;
  sfx: string;
  vfx: string;
}

export interface Enemy {
  id: string;
  name?: string;
  type: string;
  key?: string; // spatialAudioKey
  x: number;
  y: number;
  created?: boolean;
  createdAt?: string;
  destroyed?: boolean;
  health: number;
  maxHP: number;
  model?: EnemyTypeModels;
  headOffset?: Vector2;
  category?: 'inventory';
  direction?: Vector2;
  creator?: {
    id: string;
    name: string;
  };
}

export interface PieIndicatorConfig {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  borderThickness: number;
  bgColor: number;
  borderColor: number;
  indicatorColor: number;
  indicatorBorderColor: number;
  lifeSpan: number;
  targetValue: number;
}

export interface RootJSON {
  id: number;
  verse: number;
  week: number;
  text: string;
  hint: string;
  district: string;
  position: Vector2;
}
export interface Quest {
  id: string;
  use: 'root'; // for the moment only `root` we will update this with other quests.
  position: Vector2;
}
export interface QuestEvent {
  type: 'quest';
  id: string;
  use: 'root'; // for the moment only `root` we will update this with other quests.
  enter: boolean;
  create: boolean;
  remainingNeededPlayers: number;
  totalNeededPlayers: number;
}

export type MusicTheme = 'theme_citaadel' | 'theme_halloween' | 'theme_turkey' | 'theme_aarena' | 'theme_aarena-exterior_zane';

export interface SpatialAudioFX {
  id?: string; // if it doesn't have an id the id wil be `KEY_X_Y`
  container?: Phaser.GameObjects.Container | Phaser.GameObjects.Sprite | Phaser.GameObjects.Image; // instead of ID and position.
  x?: number;
  y?: number;
  type?: SoundType;
  key?: string;
  distance?: number;
  direction?: Vector2;
  mute?: boolean;
}

export interface PlayerAlchemica {
  id: string;
  alchemica: number[];
  alchemicaSum?: number;
}
export interface TowerData {
  type: string;
  name: string;
  position: Vector2;
  walls: number[];
  width: number;
  height: number;
}

export interface AlchemicaEvent {
  action: string;
  items;
  playerItems?: PlayerAlchemica;
  triggerSound?: string;
  position?: Vector2;
  data?: AlchemicaWithdraw | PlayerWalletWithdraw;
  transactionState?: TransactionState;
  inGameAlchemica?: number[];
}

export interface EnemyEvent {
  action: string;
  items;
  triggerSound?: string;
  position?: Vector2;
}

export interface AlchemicaWithdraw {
  alchemica: number[];
  depositId: number;
  type: boolean;
}
export type WalletTransactionStatus = 'PENDING' | 'TRANSFERRED' | 'ERRORED' | 'COMPLETED';

export interface PlayerWalletWithdraw {
  status: WalletTransactionStatus;
  error?: string;
}

export interface PlayerWalletDepositUpdate {
  status: WalletTransactionStatus;
  amount: string;
  hash: string;
  id: string;
  symbol: string;
}

export interface WebSocketObject extends WebSocket {
  emit?: (channel: string, data) => void;
  on?: (event: string, action: () => void) => void;
  zoneId?: string;
}

export interface Missile {
  id: string;
  position?: Vector2;
  direction?: Vector2;
  playerHit?: boolean;
  x: number;
  y: number;
  created?: boolean;
  destroyed?: boolean;
  isCharged?: boolean;
  size?: number;
}

export type AttackDestroyType = 'imp' | 'dud' | 'air';

export interface MeleeShape {
  id: string;
  position?: Vector2;
  direction?: Vector2;
  playerHit?: boolean;
  x: number;
  y: number;
  isRush?: boolean;
  created?: boolean;
  destroyed?: boolean;
  size?: number;
}

export type PadUse = 'aarena';

export interface PadShape {
  id: string;
  x: number;
  y: number;
  use: PadUse;
  created?: boolean;
}

export interface Mele {
  direction: Vector2;
  hand: string;
  id: string;
  playerId: string;
  wearableId: number;
}
export interface MissileUpdate {
  id: string;
  hitObjectHit: 'wall' | 'player';
}

export interface OngoingUpgradesRes {
  owner: string;
  coordinateX: number;
  coordinateY: number;
  readyBlock: number;
  parcelId: BigNumber;
  installationId: number;
  index: BigNumber;
}

export interface OngoingUpgrades extends OngoingUpgradesRes {
  name: string;
  startBlock: number;
  level: number;
}

export interface RealmEvent {
  id: string;
  parcelId: string;
  priority: number;
  basePriority: number; // initial PP
  startTime: number;
  lastTimeUpdated: number;
  endTime: number;
  count: number;
  minutesDelta: number; // how many minutes had passed since lastTimeUpdated.
  title: string;
  cancelled: boolean;
  parcel: JsonParcel;
  image?: string;
  active?: boolean;
}

export interface BounceGateEvents {
  bounceGateEvents: RealmEvent[];
}
