import { ethers } from 'ethers';
import { BinaryBoolean, Mele, Missile, TokenCounters, Vector2 } from 'types';

export enum Hand {
  Left = 'leftHand',
  Right = 'rightHand',
}
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythical' | 'godlike';

export interface SelectedPlayer {
  authToken: string;
  id: string;
  name: string;
  owner: string;
  originalOwner?: string;
  network: string;
  collateralColor: string;
  level: number;
  rightHand?: HandWearable | undefined;
  leftHand?: HandWearable | undefined;
  isSpectator?: boolean;
  spectatorColor?: number;
  /** Soft-launch cartridge-bound cAavegotchi (not an L1 token id). */
  isCartridgeHero?: boolean;
  /** Sim collateral id (dai, uni, …) for in-game sprite. */
  cartridgeCollateral?: string;
  /** L1 token id for Base previewAavegotchi identity. */
  cartridgeSourceTokenId?: string;
  /** Equipped cWearable itemTypeIds (16 slots) for cartridge hero sprites. */
  equippedWearables?: number[];
  /** Modified numeric traits [NRG,AGG,SPK,BRN,EYC,EYS] for aarena combat join. */
  withSetsNumericTraits?: [number, number, number, number, number, number];
}

export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  collateralColor: string;
  level: number;
  created?: boolean;
  destroyed?: boolean;
  isShadowBanned?: boolean;
  // rightHand: HandWearable | undefined;
  // leftHand: HandWearable | undefined;
  health: number;
  maxHealth?: number;
  isLent: boolean;
  isDead: boolean;
  isFocused: boolean;
  isSpectator?: boolean;
  spectatorColor?: number;
  traits?: Traits;
  traitsBases?: Traits;
}

export interface RemovingPlayer {
  id: string;
  destroyed?: boolean;
}
export interface Traits {
  maxHealth?: number;
  alchemicaCarryingCapacity?: number;
  ap?: number;
  apRegenAmount?: number;
  damageReduction?: number;
  defense?: number;
  evasion?: number;
  luck?: number;
  healthRegenAmount?: number;
  maxAP?: number;
  meleePower?: number;
  minFireInterval?: number;
  minMeleeInterval?: number;
  rangedPower?: number;
}

export interface HandWearable {
  id: number;
  type: string;
  rarity: string;
  dimensions;
}

export interface GotchiUrl {
  url: string;
  strippedUrl?: string;
  sprite: string;
  leftHand?: string;
  rightHand?: string;
}

export interface PositionEvent {
  id: string;
  x?: number;
  y?: number;
  direction?: Vector2;
  isSprinting?: boolean;
  noTween?: boolean;
}

export interface InteractionEvent {
  id: string;
  label: string;
}

export interface FocusEvent {
  id: string;
  focus: BinaryBoolean;
}
export interface IneractionData {
  label: string;
}

export interface AttackEvent {
  action: string;
  melee?: Mele;
  missile?: Missile | Missile[];
}

export interface CollisionEvent {
  id?: string;
  action: string;
  parcel?: any;
  player?: string;
  type: string;
  firstBody?: PlayerDataIdName;
  secondBody?: PlayerDataIdName;
  playerHit?: Damage;
  district?: number;
  update?: { hitObjectType: string; damage?: any };
}

export interface Health {
  id: string;
  health: number;
  maxHealth?: number;
}

export interface Damage extends Health {
  playerDied?: boolean;
  type?: string;
  collisionObjectId?: string;
  damage?: number;
  direction?: Vector2;
}

export interface PlayerDataIdName {
  id: string;
  name: string;
}
export interface Tip {
  message: string;
  amount: { FUD?: number; FOMO?: number; ALPHA?: number; KEK?: number };
}

export interface RushAttackData {
  hand: Hand;
  direction: {
    x: number;
    y: number;
  };
  chargeDuration: number;
}

export interface AttackUpdate {
  id: string;
  hitObjectType: 'player' | 'wall';
}

export interface RangedAttackData {
  hand: Hand;
  direction: {
    x: number;
    y: number;
  };
  chargeDuration: number;
}
export interface ToggleSprintData {
  action: string;
}
export interface WalletWithdrawData {
  recaptchaToken: string;
  action: string;
  tokens: TokenCounters;
}

export interface Token {
  fud: number;
  fomo: number;
  alpha: number;
  kek: number;
}

// Aavegotchis

export interface ItemsAndBalances {
  itemType: ItemObject;
  itemId: ethers.BigNumber;
  balance: ethers.BigNumber;
}

export interface ItemObject {
  allowedCollaterals: number[];
  canBeTransferred: boolean;
  dimensions: any;
  canPurchaseWithGhst: boolean;
  description?: string;
  category: string;
  experienceBonus: string;
  ghstPrice: ethers.BigNumber;
  kinshipBonus: string;
  maxQuantity: ethers.BigNumberish;
  minLevel: string;
  name: string;
  rarityScoreModifier: string;
  setId: string;
  slotPositions: boolean[];
  svgId: number;
  totalQuantity: number;
  traitModifiers: number[];
}

export interface AavegotchiObject {
  collateral: string;
  name: string;
  modifiedNumericTraits: number[];
  numericTraits: number[];
  owner: string;
  randomNumber: string;
  status: ethers.BigNumber;
  tokenId: ethers.BigNumber;
  items: ItemsAndBalances[];
  isSpectator?: boolean;

  // new
  equippedWearables: number[];
  experience: ethers.BigNumber;
  hauntId: ethers.BigNumber;
  kinship: ethers.BigNumber;
  lastInteracted: string;
  level: ethers.BigNumber;
  toNextLevel: ethers.BigNumber;
  stakedAmount: ethers.BigNumber;
  minimumStake: ethers.BigNumber;
  usedSkillPoints: ethers.BigNumber;
  escrow: string;
  baseRarityScore: ethers.BigNumber;
  modifiedRarityScore: ethers.BigNumber;
  locked: boolean;
  unlockTime: string;
  borrowed: boolean;
}

export interface SocketTransferData {
  socketUrl: string;
  zoneId: string;
  transferKey: string;
}
