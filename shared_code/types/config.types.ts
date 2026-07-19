// GPT-3.5 generated file for GAME_CONFIG
type GotchiverseTheme = 'default' | 'halloween' | 'tooorkey';
type AarenaTheme = 'denver' | undefined;

interface GotchiTraits {
  NRG: number;
  AGG: number;
  SPK: number;
  BRN: number;
}

interface Quests {
  [questId: string]: number;
}

interface KeepWinningsReqs {
  noHitsReceivedDuration: number;
  sessionDuration: number;
  numKills: number;
  numHits: number;
}

type ShadowBannedCountries = 'Philippines' | 'Vietnam' | 'Thailand' | 'Morocco';
type ProviderRisk = 'GHOSTnet GmbH' | 'PVimpelCom' | 'Hosting technology LTD' | 'Cloud assets LLC' | 'Plusinfo OOO';

const providersRiskHigh = [
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
] as const;

type ProviderRiskHigh = typeof providersRiskHigh[number];

interface CombatConfig {
  combatTesting: boolean;
  damageCoefficient: number;
  fireRate: number;
  fireDisabledDuration: number;
  takingDamageDisabledDuration: number;
  keepWinningsReqs: KeepWinningsReqs;
  meleeRate: number;
  slapAPCost: number;
  rushAPCost: number;
  rangeAPCost: number;
  chargedRangeAPCost: number;
  meleeDamageRadius: number;
  rushDamageRadius: number;
  normalMissileDamageRadius: number;
  snipeMissileDamageRadius: number;
  maxRushDistance: number;
  rushSpeed: number;
  baseMeleeDamage: number;
  baseRushDamage: number;
  baseRangedDamage: number;
  baseSnipeDamage: number;
  missileKnockBackDistance: number;
  slapKnockBackDistance: number;
  enableVariableDamage: boolean;
  enableEvasion: boolean;
  enableWearables: boolean;
  baseEvasion: number;
  baseLuck: number;
  enableDebugGraphics: boolean;
  maxAttackSpeedModifier: number;
  maxAP: number;
  maxHealth: number;
  maxHealthBuffCoef: number;
  maxAPBuffCoef: number;
  enableRangedCharge: boolean;
  missileSpeedCoefficient: number;
  missileChargedSpeedCoefficient: number;
  missileDistance: number;
  baseDefense: number;
  baseRangedPower: number;
  rangeBuffCoef: number;
  baseMeleePower: number;
  meleeBuffCoef: number;
  evasionBuffCoef: number;
  luckBuffCoef: number;
  actionSpeedBuffCoef: number;
  minRushChargeDuration: number;
  minSnipeChargeDuration: number;
  maxRushChargeDuration: number;
  maxSnipeChargeDuration: number;
}

interface MinigameConfig {
  miniGameMode: boolean;
  miniGameRoundActive: boolean;
  miniGameAutoStartInterval: number;
  miniGameCounter: number;
  miniGameRoundCounter: number;
  miniGameRoundDuration: number;
  miniGameTimeUpdateInterval: number;
  miniGameTimeLeft: number;
  miniGameStartDelay: number;
  miniGamePrestartTrigger: boolean;
  miniGameRoundStartedTimestamp: number;
  miniGameNextRoundStartTimestamp: number;
}

interface SprintConfig {
  minHealthToSprint: number;
  sprintHealthCostPerSecond: number;
  sprintAPCostPerSecond: number;
  enableSprinting: boolean;
}

interface WoodlandRoflConfig {
  enabled: boolean;
  rootRadius: number;
  eatRadius: number;
  chanceToSpawn: number;
  chanceToBurp: number;
  chanceToLore: number;
  minSpotAnimationFreq: number;
  maxFollowTime: number;
}

interface InertiaConfig {
  groundAccelerationSteps: number;
  groundDecelerationSteps: number;
  roadAccelerationSteps: number;
  roadDecelerationSteps: number;
  fudAccelerationSteps: number;
  fudDecelerationSteps: number;
  fomoAccelerationSteps: number;
  fomoDecelerationSteps: number;
  alphaAccelerationSteps: number;
  alphaDecelerationSteps: number;
  kekAccelerationSteps: number;
  kekDecelerationSteps: number;
  groundTransitionSteps: number;
  roadTransitionSteps: number;
  fudTransitionSteps: number;
  fomoTransitionSteps: number;
  alphaTransitionSteps: number;
  kekTransitionSteps: number;
  groundTurnTransitionSteps: number;
  roadTurnTransitionSteps: number;
  fudTurnTransitionSteps: number;
  fomoTurnTransitionSteps: number;
  alphaTurnTransitionSteps: number;
  kekTurnTransitionSteps: number;
  sprintDecelerationIncrement: number;
  sprintAccelerationIncrement: number;
  sprintTurnIncrement: number;
  sprintTransitionIncrement: number;
}

interface GotchiConfig {
  hp: number;
  ap: number;
  enemy: number;
}

interface RegenConfig {
  enableHealthRegen: boolean;
  healthRegenPerSecond: number;
  enableAPRegen: boolean;
  apRegenPerSecond: number;
  regenBuffCoef: number;
}

export interface GameConfig extends CombatConfig, MinigameConfig, SprintConfig, RegenConfig {
  isLive: boolean;
  combatIsLive: boolean;
  enableTipping: boolean;
  enablePlayerWallet: boolean;
  enableItemShop: boolean;
  enableGotchiInventory: boolean;
  enableQuestHint: boolean;
  inventoryQuickslots: number;
  enableNakedGotchis: boolean;
  nakedGotchisTraits: GotchiTraits;
  gotchiverseTheme: GotchiverseTheme;
  aarenaTheme: AarenaTheme;
  quests: Quests;
  questsMinPlayersRquired: Quests;
  gameUpdateIntervalMS: number;
  alchemicaChunkSizes: [number, number, number];
  maxMapAlchemicaChunkCount: number;
  pinnedAlert: boolean | string;
  devDebugOverlay: boolean;
  devDebugAOIOverlay: boolean;
  spinDuration: number;
  enableNFTDisplays: boolean;
  updateVelocityInterval: number;
  woodlandRoflConfig: WoodlandRoflConfig;
  inertiaConfig: InertiaConfig;
  cooldownsByItemType: GotchiConfig;
  enableBinaryEncoding: boolean;
  enablePubsubBinaryEncoding: boolean;
  enablePlayerTracing: boolean;
  allowUnlimitedZoomOut: boolean;
  demoGotchiMode: boolean;
  playerScaling: boolean;
  respawnBuybackTokensSpent?: number;
  respawnBuybackCount?: number;
  allowConcurrentWalletGotchiLogins: boolean;
  allowBotTesting: boolean;
  requireMetaMaskSign: boolean;
  useCustomLodash: boolean;
  playTimeLimit: number;
  enablePlayerQueue: boolean;
  minAlchemicaWithdrawlLimit: [number, number, number, number, number];
  autoBanBots: boolean;
  toggleMouseMovement: boolean;
  shadowBanIpCountryWhiteList: ShadowBannedCountries[];
  enableRECAPTCHA: boolean;
  enableJigger: boolean;
  recaptchaBotThreshold: 0.1 | 0.2 | 0.3 | 0.7 | 0.9;
  forfeitAlchemicaOnShadowBan: boolean;
  preventWidthrawlOnShadowBan: boolean;
  customAlchemicaSpawnZone: false | [number, number, number, number];
  alchemicaChannelingSpilloversActive: boolean;
  eventParcels: boolean;
  enableCollisionsParcel: boolean;
  enableCollisionsInstallation: boolean;
  /** Hybrid Grid Foundry PoC — wild veins, antennas, Walk/Bounce/mesh haul */
  enableParcelFoundryPoC: boolean;
  providersRiskVeryHigh: ProviderRisk[];
  providersRiskHigh: ProviderRiskHigh[];
}
