import { BigNumber } from 'ethers';
import { DiamondName } from 'web3/contract';

export type NetworkNames = 'rinkeby' | 'kovan' | 'main' | 'mumbai' | 'polyon' | 'matic' | 'goerli' | 'localhost' | 'base';
export type MoralisNetwork = 'POLYGON' | 'ETHEREUM';

export interface NFTDisplayData {
  id: string;
  chainId: number;
  metadata: NFTDisplayMetadata;
  owner: string;
  collectionId: string;
  tokenId: string;
  tokenAddress: string;
  tokenUri: string;
  contractType: ContractType;
}

export interface PaginatedNFTDisplayData {
  data: NFTDisplayData[];
  page: number;
  cursor: string;
}

export interface NFTDisplayPreview {
  active: boolean;
  installationId?: string;
  isOwner?: boolean;
  serverData?: NFTDisplayServerData;
  nftData?: NFTDisplayData;
}

export type ContractType = 'ERC721' | 'ERC1155';

export interface NFTDisplayServerData {
  id: string;
  tokenUri: string;
  owner?: string;
  image?: string;
  views?: string;
  isSVG?: boolean;
}

export interface NFTDisplaySet {
  installationId: string;
  data: NFTDisplayServerData;
}

export interface NFTDisplayImg {
  id: string;
  image?: string;
  isSVG?: boolean;
}

export interface NFTDisplayMetadata {
  attributes: any;
  fileType?: string;
  thumbnail?: string;
  name: string;
  description: string;
  image?: string;
  video?: string;
  image_data?: string;
}

export interface NFTBaazaarData {
  tokenId: number;
  price: number;
  listingId: number;
  contractType: ContractType;
  priceInWei: number;
}

export interface NFTDisplayState {
  open: boolean;
  id?: string;
}

export interface NFTIdData {
  id: string;
  collectionId: string;
  tokenAddress: string;
  chain: string;
  contractType: ContractType;
  tokenId: string;
}

export interface ERCBaazaarCollectionNumber {
  ERC721?: number;
  ERC1155?: number;
}

export interface NFTCollectionConfig {
  name: string;
  hasBaazaar: boolean;
  icon: string;
  contract?: DiamondName;
  type?: number;
  category?: ERCBaazaarCollectionNumber;
  metadata?: string;
  isSVG?: boolean;
  useProxy?: boolean;
  requireSelfApprove?: boolean;
  prefix?: string;
}

export interface AllowedCollection extends NFTCollectionConfig {
  id: string;
  contractId: number;
  contractAddress: string;
  chainId: number;
}

export type PortalCategory = 'portals-closed' | 'portals-open';

export type BaazaarCategory =
  | 'aavegotchis'
  | 'realm'
  | 'installations'
  | 'tiles'
  | 'wearables'
  | 'consumables'
  | 'tickets'
  | 'gotchiLending'
  | 'portals'
  | 'equipment';

// add jsonRPC to be able to create a secondary provider to fetch contract data from outside our network.
export interface NetworkVars {
  jsonRPC?: string;
  maticAddress?: string;
  ghstAddress: string;

  // alchemica ERC20
  fudAddress?: string;
  fomoAddress?: string;
  alphaAddress?: string;
  kekAddress?: string;
  glmrAddress?: string;

  // Diamonds
  aavegotchiDiamond: string;
  gbmDiamond: string;
  realmDiamond: string;
  tileDiamond?: string;
  installationDiamond?: string;
}
export type TransactionStatus = 'INIT' | 'ADDED' | 'PENDING' | 'TRANSFERRED' | 'COMPLETED' | 'ERRORED' | 'MANUAL' | 'CLOSE';
// "INIT" (tx added to DB)
// "PENDING" (IN MEMPOOL, not-mined. No confirmations yet.)
// "TRANSFERRED", mined with at least 1-confirmation. We will keep tracking it until x-confirmations where it will be updated to "COMPLETED".
// "COMPLETED" means we have reached X number of block confirmations and have stopped checking. Currently X = 20
// "ERRORED", some error happened, check errorMsg column.
// "MANUAL", failed too many times, needs manual review
// Eventually we can add:
// "ON HOLD", waiting for manual approval. Usually because amount is high or activity suspicious.
// "REJECTED", request manually rejected.
// "BLACKLISTED", addresses on our blacklist
// merge alchemica history with playerwallet
export interface TransactionHistory {
  id: string;
  blockNumber: number;
  to: string;
  tokenId: number;
  value: number;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
  tokenSymbol?: string;
  type?: 'deposit' | 'withdraw';
  hash?: string;
  errorMsg?: string | null; // null;
  from?: string; // hotWalletAddress '0xc9CA6a9281bD6EAF8fA9E0Fc8d2e50cfBD941F4b';
  ip?: string;
  reportedTime?: string;
  lending_id?: number;
  gotchi_id?: number;
}

export interface InstallationType {
  id: number;
  alchemicaCost: BigNumber[]; // 4 BigNumber representing alchemica cost.
  alchemicaType: number; // 0 to 3
  capacity: BigNumber;
  craftTime: BigNumber; // block times till craft complete if 0 it doesn't require a consummer,
  deprecated: boolean;
  harvestRate: BigNumber; //
  height: BigNumber; // phisical size in gotchi
  installationType: number; // installation type starting from 0
  level: number; //  0 to 9;
  name: string;
  nextLevelId: BigNumber;
  prerequisites: number[]; // what installation types we need in inventory to craft this one
  spillRadius: BigNumber;
  spillRate: BigNumber;
  upgradeQueueBoost: BigNumber;
  deprecatedAt: number;
  width: BigNumber; // phisical size in gotchi
}

export interface TileType {
  id: number;
  alchemicaCost: BigNumber[]; // 4 BigNumber representing alchemica cost.
  craftTime: BigNumber;
  deprecated: boolean;
  height: number;
  name: string;
  tileType: number;
  deprecatedAt: number;
  width: BigNumber;
}

export interface InstallationsBalancesWithTypes {
  installationType?: InstallationType;
  tileType?: TileType;
  balance: BigNumber;
  itemId: BigNumber;
}

export interface TilesBalancesWithTypes {
  balance: BigNumber;
  itemId: BigNumber;
}

export interface ItemInventory {
  id: number;
  name: string;
  quantity: number;
  level?: number;
  type: 'INSTALLATION' | 'TILE';
}
