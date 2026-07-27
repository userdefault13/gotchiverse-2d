const aavegotchiDiamondAbi = require('./abi/AavegotchiDiamond.json');
const realmDimondAbi = require('./abi/RealmDiamond.json');
const installationDiamondAbi = require('./abi/InstallationDiamond.json');
const tileDiamondAbi = require('./abi/TileDiamond.json');
const gotchiLending = require('./abi/aavegotchiFacets/GotchiLending.json');
const ghstStakingAbi = require('./abi/GhstStaking.json');
const fakeGotchisDiamondAbi = require('./abi/FakeGotchisArt.json');
const erc20Abi = require('./abi/erc20.json');

export const abis = {
  aavegotchiDiamond: aavegotchiDiamondAbi.abi,
  gotchiLending: gotchiLending.abi,
  ghstStaking: ghstStakingAbi,

  realmDiamond: realmDimondAbi,
  installationDiamond: installationDiamondAbi,
  tileDiamond: tileDiamondAbi,
  fakeGotchisDiamond: fakeGotchisDiamondAbi,

  erc20: erc20Abi,
};

const maticVars = {
  // RPC
  jsonRPC: 'https://polygon-mainnet.g.alchemy.com/v2/w1LVhlO4fkcmS1wEFD-WhNO7_W3It4Zb',

  // Tokens
  ghstAddress: '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7', // GHST token
  maticAddress: '0x0000000000000000000000000000000000001010',

  // Diamonds
  gbmDiamond: '0xa44c8e0eCAEFe668947154eE2b803Bd4e6310EFe',
  realmDiamond: '0x1D0360BaC7299C86Ec8E99d0c1C9A95FEfaF2a11',
  aavegotchiDiamond: '0x86935F11C86623deC8a25696E1C19a8659CbF95d',
  installationDiamond: '0x19f870bD94A34b3adAa9CaA439d333DA18d6812A',
  tileDiamond: '0x9216c31d8146bCB3eA5a9162Dc1702e8AEDCa355',
  ghstStaking: '0xA02d547512Bb90002807499F05495Fe9C4C3943f',

  fudAddress: '0x403E967b044d4Be25170310157cB1A4Bf10bdD0f',
  fomoAddress: '0x44A6e0BE76e1D9620A7F76588e4509fE4fa8E8C8',
  alphaAddress: '0x6a3E7C3c6EF65Ee26975b12293cA1AAD7e1dAeD2',
  kekAddress: '0x42E5E06EF5b90Fe15F853F59299Fc96259209c5C',
  gltrAddress: '0x3801C3B3B5c98F88a9c9005966AA96aa440B9Afc',
  fakeGotchisDiamond: '0xa4e3513c98b30d4d7cc578d2c328bd550725d1d0',

  // Facets
  gotchiLending: '0x86935F11C86623deC8a25696E1C19a8659CbF95d',
};

const mumbaiVars = {
  // RPC
  jsonRPC: 'https://polygon-mumbai.infura.io/v3/808f937e053a4c9686997a0d7430aa08',

  // Tokensc
  maticAddress: '0x0000000000000000000000000000000000001010',
  ghstAddress: '0x20d0A1ce31f8e8A77b291f25c5fbED007Adde932',

  fudAddress: '0x8898BEA7EBC534263d891aCE9fdf8B18F0205ddb',
  fomoAddress: '0x18c2F784B51b04ba6E85bF62D74898Fac5BCC59b',
  alphaAddress: '0x066F7B9172DE92945dF4e7fB29a0815dc225d45F',
  kekAddress: '0x1C5714F00cc2e795Cf4F4F7e2A9F3AA04149d423',
  gltrAddress: '0x3FF9E39009bfFe903C262f6d63161B1f4414d3c8',

  // Diamonds
  realmDiamond: '0x726F201A9aB38cD56D60ee392165F1434C4F193D',
  installationDiamond: '0x663aeA831087487d2944ce44836F419A35Ee005A',
  tileDiamond: '0xDd8947D7F6705136e5A12971231D134E80DFC15d',

  aavegotchiDiamond: '0xC3688369C695D878d2632b20dFe5efFD18256339',
  gbmDiamond: '0xa44c8e0eCAEFe668947154eE2b803Bd4e6310EFe',
};

const kovanVars = {
  // Tokens
  ghstAddress: '0xeDaA788Ee96a0749a2De48738f5dF0AA88E99ab5',

  // Diamonds
  aavegotchiDiamond: '0x07543dB60F19b9B48A69a7435B5648b46d4Bb58E',
  gbmDiamond: '0xa44c8e0eCAEFe668947154eE2b803Bd4e6310EFe',
  realmDiamond: '0x1D0360BaC7299C86Ec8E99d0c1C9A95FEfaF2a11',
};

// Base mainnet (Aavegotchi migration / Envio indexers)
const baseVars = {
  jsonRPC: process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org',

  // Bridged GHST on Base (typo'd address has no code → balanceOf CALL_EXCEPTION)
  ghstAddress: '0xcd2f22236dd9dfe2356d7c543161d4d260fd9bcb',
  // Base uses native ETH for gas; no MATIC ERC-20. Leave unset so balance fetch uses getBalance.
  maticAddress: undefined,

  realmDiamond: '0x4B0040c3646D3c44B8a28Ad7055cfCF536c05372',
  installationDiamond: '0xebba5b725A2889f7f089a6cAE0246A32cad4E26b',
  tileDiamond: '0x617fdB8093b309e4699107F48812b407A7c37938',
  aavegotchiDiamond: '0xA99c4B08201F2913Db8D28e71d020c4298F29dBF',

  fudAddress: '0x2028b4043e6722Ea164946c82fe806c4a43a0fF4',
  fomoAddress: '0xA32137bfb57d2b6A9Fd2956Ba4B54741a6D54b58',
  alphaAddress: '0x15e7CaC885e3730ce6389447BC0f7AC032f31947',
  kekAddress: '0xE52b9170fF4ece4C35E796Ffd74B57Dec68Ca0e5',
  gltrAddress: '0x4D140CE792bEdc430498c2d219AfBC33e2992c9D',

  gotchiLending: '0xA99c4B08201F2913Db8D28e71d020c4298F29dBF',
};

export interface WEB_3_VARS {
  jsonRPC?: string;

  // Tokens
  ghstAddress?: string; // GHST token
  maticAddress?: string;

  // Diamonds
  gbmDiamond?: string;
  realmDiamond?: string;
  aavegotchiDiamond?: string;
  installationDiamond?: string;
  tileDiamond?: string;
  ghstStaking?: string;

  fudAddress?: string;
  fomoAddress?: string;
  alphaAddress?: string;
  kekAddress?: string;
  gltrAddress?: string;
  fakeGotchisDiamond?: string;

  // Facets
  gotchiLending?: string;
}
export function varsForNetwork(currentNetwork): WEB_3_VARS {
  if (!currentNetwork && process.env.REALM_NETWORK === 'base') return baseVars;
  if (!currentNetwork && process.env.APP_ENV === 'production') return maticVars;
  if (!currentNetwork && process.env.APP_ENV !== 'production') return mumbaiVars;
  else if (currentNetwork === 'base') return baseVars;
  else if (currentNetwork === 'robinhood') return baseVars; // RH aarena uses soft ids; diamond addrs unused
  else if (currentNetwork === 'matic') return maticVars;
  else if (currentNetwork === 'mumbai') return mumbaiVars;
  else if (currentNetwork === 'kovan') return kovanVars;
  else if (currentNetwork === 'localhost') return maticVars;
  else return maticVars;
}

const DEFAULT_CORE_URI = 'https://subgraph.satsuma-prod.com/tWYl5n5y04oz/aavegotchi/aavegotchi-core-matic/api';
const DEFAULT_GOTCHIVERSE_URI = 'https://subgraph.satsuma-prod.com/tWYl5n5y04oz/aavegotchi/gotchiverse-matic/api';
const DEFAULT_SVG_URI = 'https://subgraph.satsuma-prod.com/tWYl5n5y04oz/aavegotchi/aavegotchi-svg-matic/api';

/** Aarcade Envio/Flux GraphQL proxy (replaces sunset Goldsky Base endpoints). */
const AARCADE_SUBGRAPH_HOME = (
  process.env.NEXT_PUBLIC_AARCADE_HOME ||
  process.env.AARCADE_HOME ||
  'https://aarcadeghst.com'
).replace(/\/$/, '');

const DEFAULT_BASE_CORE = `${AARCADE_SUBGRAPH_HOME}/api/subgraph/aavegotchi-core-base`;
const DEFAULT_BASE_GOTCHIVERSE = `${AARCADE_SUBGRAPH_HOME}/api/subgraph/gotchiverse-base`;
const DEFAULT_BASE_SVG = `${AARCADE_SUBGRAPH_HOME}/api/subgraph/aavegotchi-svg-base`;

function defaultCoreUri(): string {
  if (process.env.REALM_NETWORK === 'base' || process.env.NETWORK === 'base') return DEFAULT_BASE_CORE;
  return DEFAULT_CORE_URI;
}

function defaultGotchiverseUri(): string {
  if (process.env.REALM_NETWORK === 'base' || process.env.NETWORK === 'base') return DEFAULT_BASE_GOTCHIVERSE;
  return DEFAULT_GOTCHIVERSE_URI;
}

function defaultSvgUri(): string {
  if (process.env.REALM_NETWORK === 'base' || process.env.NETWORK === 'base') return DEFAULT_BASE_SVG;
  return DEFAULT_SVG_URI;
}

// Subgraph (env-overridable — Base defaults to Aarcade /api/subgraph/*, not Goldsky)
export const coreURI = process.env.NEXT_PUBLIC_CORE_SUBGRAPH_URL || defaultCoreUri();

export const aavegotchiRealm =
  process.env.NEXT_PUBLIC_REALM_SUBGRAPH_URL || 'https://api.thegraph.com/subgraphs/name/aavegotchi/aavegotchi-realm-matic';

export const gbmSubgraphUser =
  process.env.NEXT_PUBLIC_GBM_SUBGRAPH_URL || 'https://api.thegraph.com/subgraphs/name/aavegotchi/aavegotchi-gbm-v2';

export const aavegotchiSvgSubgraph = process.env.NEXT_PUBLIC_SVG_SUBGRAPH_URL || defaultSvgUri();

export const gotchiverseSubgraph = process.env.NEXT_PUBLIC_GOTCHIVERSE_SUBGRAPH_URL || defaultGotchiverseUri();

/** Build an Aarcade subgraph URL for a named Base indexer. */
export function aarcadeSubgraphUrl(
  name:
    | 'aavegotchi-core-base'
    | 'gotchiverse-base'
    | 'aavegotchi-svg-base'
    | 'aavegotchi-gbm-baazaar-base'
    | string,
): string {
  return `${AARCADE_SUBGRAPH_HOME}/api/subgraph/${name}`;
}
