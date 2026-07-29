/* eslint-disable @typescript-eslint/indent */
import { BigNumber } from 'ethers';
import { AlchemicaNumbers, AllowedTokenTypes, BoundsObject, QuickslotIndex, ShopPurchaseStatus, SizeObj, TokenCounters } from './realm';
import { NFTDisplayImg } from './web3';

export interface NavLink {
  name: string;
  path: string;
  disabled?: boolean;
  subnav?: NavLink[];
}

export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type ParcelSizes = 'humble' | 'reasonable' | 'spacious' | 'guardian' | 'paartner';

export interface ParcelData {
  parcelId: string;
  tokenId: number;
  parcelHash: string;
  region: string;
  type: ParcelSizes;
  district: number;
  x: number;
  y: number;
  width: number;
  height: number;
  use: string;
  boost: number[];
  auction: boolean;
  owner?: boolean;
  lastChanneledAlchemica?: string;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface MediaConstrainsType {
  audio: boolean;
  video: boolean;
}

export interface Tuple<T, L extends number> extends Array<T> {
  0: T;
  length: L;
}

interface NotificationOptions {
  sound?: boolean;
}

export interface NotificationDetails {
  title?: string;
  message: string;
}

export interface StatusNotificationOptions extends NotificationOptions {
  signature?: boolean;
}

export interface Notification extends NotificationDetails {
  type: 'info' | 'success' | 'error' | 'warning';
  options?: NotificationOptions;
}

export type StatusNotificationType = 'purchase';
export type Status = 'init' | 'pending' | 'success' | 'failed';

export interface GlobalStatus {
  status: Status;
  error?: string;
  info?: string; // Any addition info sent on init, if this is not provided the default message will pop!
}

export interface StatusNotification {
  type: StatusNotificationType;
  data: GlobalStatus;
}

export interface StatusStack {
  stack: {
    [action in StatusNotificationType]?: string;
  };
}

export interface Tip {
  message: string;
  amount: AlchemicaNumbers;
}

export interface Drop {
  token: AllowedTokenTypes;
}

export interface QuickslotUseData {
  index: QuickslotIndex;
}

export interface GlobalNotification extends Notification {
  id: string;
}

export interface TransactionNotification {
  title?: string;
  message: string;
  options?: NotificationOptions;
}

export interface TooltipType {
  title?: string;
  subtitle?: string;
  message: string;
  actionType?: 'copy';
  action?: () => void;
  theme?: '' | 'info';
}

export interface GlobalTransactionNotification extends TransactionNotification {
  status: 'pending' | 'success' | 'error';
  id: string;
}

export interface TraitDetails {
  icon?: string;
  iconLarge?: string;
  label?: string;
  key?: string;
  increase?: number;
  description?: string;
  value?: number;
  tooltip?: boolean;
  gotchiTraitModifierLabel: string;
}

export interface Aavegotchi {
  escrow: string;
  withSetsNumericTraits: Tuple<number, 6>;
  numericTraits: Tuple<number, 6>;
  id: string;
  isSpectator?: boolean;
  withSetsRarityScore: string;
  baseRarityScore: string;
  owner: {
    id: string;
  };
  originalOwner?: {
    id: string;
  };
  name: string;
  borrowed?: boolean;
  equippedWearables: Tuple<number, 16>;
  level: string;
  experience: string;
  stakedAmount: string;
  collateral: string;
  kinship: string;
  alchemica?: {
    FUD?: number;
    FOMO?: number;
    ALPHA?: number;
    KEK?: number;
  };
  alchemicaCarryingCapacity?: number;
  alchemicaSpeedBonus?: number;
  ap?: number;
  apCostMultiplier?: number;
  apRegenAmount?: number;
  attackSpeed?: number;
  baseSpeed?: number;
  damageReduction?: number;
  defense?: number;
  evasion?: number;
  health?: number;
  healthRegenAmount?: number;
  luck?: number;
  maxAP?: number;
  maxHealth?: number;
  meleePower?: number;
  minFireInterval?: number;
  minMeleeInterval?: number;
  rangedPower?: number;
  roadSpeedBonus?: number;
  wearableTraitBonuses?: any;
}

export interface GotchiverseAavegotchi extends Aavegotchi {
  isLent?: boolean;
  lastChanneledAlchemica?: string;
  secondsUntilChannel?: number;
  readyToChannel?: boolean;
  originalOwnerId?: string;
  /** Soft-launch cartridge-bound cAavegotchi (not an L1 token). */
  isCartridgeHero?: boolean;
  /** Sim collateral id (dai, weth, …) when isCartridgeHero. */
  cartridgeCollateral?: string;
  /** L1 token id bound onto this cAavegotchi (for Base preview identity). */
  cartridgeSourceTokenId?: string;
  /** Haunt 1|2 from L1 bind — required for mythical eye shapes (wiki). */
  hauntId?: number;
}

export enum Direction {
  NONE = 'none',
  LEFT = 'left',
  UP = 'up',
  RIGHT = 'right',
  DOWN = 'down',
}

export interface Installation {
  itemType: number;
  name: string;
  level: number;
  alchemicaType: number;
  width: BigNumber;
  height: BigNumber;
  itemId: number;
  id: number;
  type: 'INSTALLATION' | 'TILE';
  quantity: number;
  isVisible: boolean;
}
export interface JsonInstallation {
  itemId: number;
  name: string;
  level: number;
  alchemicaType: number;
  width: number;
  height: number;
  type: 'INSTALLATION' | 'TILE';
  installationType: number;
  spillRadius: number;
  spillRate: number;
  harvestRate: number;
  alchemicaCost: number[];
}

export interface InstallationDisabled {
  state: boolean;
  reason?: string;
}

export interface InstallationIdNFT {
  id: string;
  nft?: NFTDisplayImg;
}

export interface Recipe {
  installationType: number;
  name: string;
  deprecated: boolean;
  ingredients: {
    fud: number;
    fomo: number;
    alpha: number;
    kek: number;
  };
  craftingTime: number;
  level?: number;
  itemType: number;
  id: number;
  type: 'INSTALLATION' | 'TILE';
  endDate?: Date;
  /** Soft-launch local craft (no diamond) — cTiles, Waalls, etc. */
  softLaunch?: boolean;
}

export type Tokens = 'fud' | 'fomo' | 'alpha' | 'kek';
export type AavegotchiTokens = 'fud' | 'fomo' | 'alpha' | 'kek' | 'gltr' | 'ghst';

export interface AlchemicaBalance {
  fud: number;
  fomo: number;
  alpha: number;
  kek: number;
}

export interface ChatRoomEvent {
  type: 'SERVER';
  message: string | React.ReactNode;
  channel: 'local' | 'global';
  time: number;
}

export interface SuperChatEvent {
  chatId?: number;
  type: 'SERVER';
  message: string | React.ReactNode;
  time: number;
  address: string;
  channel: 'superchat';
  id: string;
  isSpectator: boolean;
  name: string;
  tipAmountBySymbol: TokenCounters;
}

export interface ChatEvent {
  type: 'USER';
  id: string;
  name: string;
  time: number;
  message: string;
  channel: 'local' | 'global' | 'superchat';
}
export type AccessRightsAction = 'channel' | 'emptyReservoir' | 'equipInstallations' | 'equipTiles' | 'updateInstallations';

export interface ParcelAccessRights {
  channel: number;
  emptyReservoir: number;
  equipInstallations: number;
  equipTiles: number;
  updateInstallations: number;
}
export interface ParcelAccessRightsWhitelists {
  channel: string[];
  emptyReservoir: string[];
  equipInstallations: string[];
  equipTiles: string[];
  updateInstallations: string[];
}

export interface ParcelAccessRightsWhitelist extends ParcelAccessRights {
  whitelistId: number;
}

export enum ParcelAccessValues {
  OnlyMe = 0,
  MeAndBorrowedGotchis = 1,
  Whitelist = 2,
  Banlist = 3,
  Anyone = 4,
}

export enum ParcelAccessTypes {
  channel = 0,
  emptyReservoir = 1,
  equipInstallations = 2,
  equipTiles = 3,
  updateInstallations = 6,
}

// 0: All, 1: Owned, 2: Borrowed, 3: None
export type OwnedStatus = 0 | 1 | 2 | 3;

export interface ContractParcel {
  parcelId: string;
  district: number;
  id?: string;
  tokenId?: string;
  parcelHash?: string;
  owner?: string;
  accessRights?: ParcelAccessRights;
  accessWhitelists?: ParcelAccessRightsWhitelists;
}

export interface JsonParcel {
  parcelId: string;
  tokenId: string;
  hood: string;
  parcelHash: string;
  district: number;
}

export interface GotchiverseParcel extends ContractParcel {
  lastChanneledAlchemica?: string;
  equippedInstallations?: Array<{ id: string }>;
  isLent?: boolean;
}

export interface Parcel {
  id: string;
  region: string;
  parcelId?: string;
  type: string;
  size: SizeObj;
  position: Vector2;
  bounds: BoundsObject;
  grid?: number[][];
  tileGrid?: number[][];
  tokenId?: string;
  owner?: string;
  isLent?: boolean;
  installations?: string[];
  accessRights?: ParcelAccessRights;
  accessWhitelists?: ParcelAccessRightsWhitelists;
  lastChanneledAlchemica?: string;
}

export interface ParcelOwnerData {
  tokenId: number;
  owner: string;
  parcelHash: string;
  district?: number;
}

export interface Id {
  id: string;
}
export interface SortOption {
  name: string;
  value: string;
  direction: 'asc' | 'desc';
}

export interface BounceGateEvent {
  id: string;
  priority: string;
  startTime: string;
  lastTimeUpdated: string;
  endTime: string;
  title: string;
}

export * from './web3';
export * from './realm';
export * from './gotchi';
