/* eslint-disable @typescript-eslint/no-misused-promises */
import { ethers, Signer } from 'ethers';
import { BigNumber } from '@ethersproject/bignumber';
import { formatUnits } from '@ethersproject/units';
import { AavegotchiTokens, BaazaarCategory, NetworkNames, PortalCategory, Tokens } from 'types';
import { DiamondName, setAllowance } from 'web3/contract';
import { showNotificationWithTimeout } from 'contexts/NotificationContext/actions';
import GlobalState from 'contexts/GlobalState';
export const DEFAULT_GAS_PRICE = '32';

export function getErrMessage(tx): string {
  let errMsg = tx?.error?.data?.message || tx?.error?.message || tx?.message;
  if (errMsg) {
    if (errMsg.includes('Must survey before equipping')) {
      errMsg = 'Parcel must be surveyed first! Exit build mode and click on your Aaltar to do that.';
    } else if (errMsg.includes('Must equip reservoir of type')) {
      errMsg = 'Equip failed. You must equip a reservoir of this type before a harvester.';
    } else if (errMsg.includes('user rejected transaction ')) {
      errMsg = 'User rejected transaction.';
    } else if (errMsg.includes('user rejected signin')) {
      errMsg = 'User denied message signature';
    } else if (errMsg.includes('UpgradeQueue full')) {
      errMsg = 'Max parcel upgrades already in progress. Speed them up with GLTR or leverage Maaker installation.';
    } else if (errMsg.includes('invalid arrayify value')) {
      errMsg = 'Wrong Signature';
    } else if (errMsg.includes("reading 'toHexString'") || errMsg.includes('toHexString')) {
      errMsg = 'Equip signature missing. On Base, retry Confirm; otherwise the REALM signature API may be down.';
    } else if (errMsg.includes('Equip signature unavailable')) {
      errMsg = 'Equip signature unavailable. REALM signature API is not configured for this network.';
    } else if (
      errMsg.includes("Gotchi can't channel yet") ||
      errMsg.includes('already channeled') ||
      errMsg.includes('Gotchi channeling')
    ) {
      errMsg = 'This Gotchi already channeled today. Wait until UTC midnight or switch Gotchi.';
    } else if (errMsg.includes('Parcel channeling') || errMsg.includes('channeling too soon')) {
      errMsg = 'Parcel channel cooldown active. Wait for the Aaltar timer.';
    } else if (errMsg.includes('Access rights') || errMsg.includes('access right')) {
      errMsg = 'No channel access on this parcel.';
    } else if (errMsg.includes('kinship') || errMsg.includes('Kinship')) {
      errMsg = 'Gotchi kinship too low to channel.';
    } else if (errMsg.includes('Incorrect last duration')) {
      errMsg = 'Channel cooldown mismatch. Refresh the Aaltar dashboard and try again.';
    } else if (errMsg.includes('call revert exception') || errMsg.includes('CALL_EXCEPTION')) {
      errMsg = 'Transaction would revert. Check Base network, Gotchi ownership, and parcel access.';
    }
  }

  if (errMsg?.length > 1000) {
    // failed to find a usable error message, fallback
    errMsg = 'Transaction failed.';
  }

  return errMsg;
}

export function smartTrim(string?: string, maxLength?: number) {
  if (!string) return string;
  if (!maxLength) return string;
  if (maxLength < 1) return string;
  if (string.length <= maxLength) return string;
  if (maxLength === 1) return string.substring(0, 1) + '...';

  const midpoint = Math.ceil(string.length / 2);
  const toremove = string.length - maxLength;
  const lstrip = Math.ceil(toremove / 2);
  const rstrip = toremove - lstrip;
  return string.substring(0, midpoint - lstrip) + '...' + string.substring(midpoint + rstrip);
}

export function makePlural(word, number) {
  if (number !== 1) return word + 's';
  return word;
}

export function convertFromBigNumber(amount: BigNumber, decimals?: number) {
  return removeUnnecessaryDecimal(formatUnits(amount.toString(), decimals || 18));
}

export async function resolveAddress(ens, address) {
  // eslint-disable-next-line no-async-promise-executor
  return await new Promise(async (resolve, reject) => {
    try {
      const name = await ens.reverse(address).name();
      resolve(name);
    } catch (error) {
      reject(error);
    }
  });
}

export function numberWithCommas(x: number, slice?: number): string {
  //  return x
  //   .toString()
  //   .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  //  .split(".")[0];

  const withCommas = x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const split = withCommas.split('.');

  if (split.length >= 2) {
    if (slice > 0) return `${split[0]}.${split[1].slice(0, 2)}`;
    else return split[0];
  } else return withCommas;
}

export function maxQuantityToRarity(quantity: ethers.BigNumberish) {
  const quantityNumber = Number(quantity);

  if (quantityNumber >= 1000) return 'Common';
  else if (quantityNumber >= 500) return 'Uncommon';
  else if (quantityNumber >= 250) return 'Rare';
  else if (quantityNumber >= 100) return 'Legendary';
  else if (quantityNumber >= 10) return 'Mythical';
  else if (quantityNumber >= 1) return 'Godlike';
}

export function chainIdToName(chainId: number): NetworkNames {
  switch (chainId) {
    case 1:
      return 'main';
    case 4:
      return 'rinkeby';
    case 42:
      return 'kovan';
    case 80001:
      return 'mumbai';
    case 137:
      return 'matic';
    case 5:
      return 'goerli';
    case 8453:
      return 'base';
    case 4663:
      return 'robinhood';

    default:
      break;
  }
}

export function isERC721(category: BaazaarCategory | PortalCategory) {
  return ['portals-open', 'portals-closed', 'aavegotchis', 'realm', 'portals'].includes(category);
}

export function isERC1155(category: BaazaarCategory | PortalCategory) {
  return ['consumables', 'equipment', 'wearables', 'tickets', 'installations', 'tiles'].includes(category);
}

export function collectionNameToSideMenuId(collectionName) {
  switch (collectionName) {
    case 'portals':
      return 0;
    case 'aavegotchis':
      return 2;
    case 'wearables':
      return 3;
    case 'consumables':
      return 4;
    case 'tickets':
      return 5;
    case 'activity':
      return 6;
    default:
      return 0;
  }
}

export function transformGraphRes(collectionName, result) {
  // console.log("result:", result);

  if (!isERC1155(collectionName)) {
    if (result.gotchisOwned) {
      return result.gotchisOwned.map((item) => {
        return {
          // hauntId: ethers.BigNumber.from(item.hauntId),
          tokenId: ethers.BigNumber.from(item.id),
          // experience: ethers.BigNumber.from(item.experience),
          owner: item.owner,
          name: item.name,
          // kinship: item.kinship,
          collateral: item.collateral,
          level: ethers.BigNumber.from(item.level),
          equippedWearables: item.equippedWearables,
          // numericTraits: item.numericTraits,
          // modifiedNumericTraits: item.modifiedNumericTraits,
          // stakedAmount: ethers.BigNumber.from(item.stakedAmount),
          // modifiedRarityScore: ethers.BigNumber.from(item.modifiedRarityScore),
          baseRarityScore: ethers.BigNumber.from(item.baseRarityScore),
        };
      });
    } else if (result.erc721Listings) {
      return result.erc721Listings.map((item) => {
        const aavegotchiInfo = item.gotchi
          ? {
              hauntId: ethers.BigNumber.from(item.hauntId),
              tokenId: ethers.BigNumber.from(item.gotchi.id),
              owner: item.gotchi.owner.id,
              name: item.gotchi.name,
              collateral: item.gotchi.collateral,
              level: ethers.BigNumber.from(item.gotchi.level),
              experience: ethers.BigNumber.from(item.gotchi.experience),
              modifiedNumericTraits: item.gotchi.modifiedNumericTraits,
              stakedAmount: ethers.BigNumber.from(item.gotchi.stakedAmount),
              kinship: ethers.BigNumber.from(item.kinship),
              seller: item.seller,

              modifiedRarityScore: ethers.BigNumber.from(item.gotchi.modifiedRarityScore),
              baseRarityScore: ethers.BigNumber.from(item.gotchi.baseRarityScore),
            }
          : { hauntId: ethers.BigNumber.from(item.hauntId) };
        return {
          listing_: {
            category: ethers.BigNumber.from(item.category),
            listingId: ethers.BigNumber.from(item.id),
            seller: item.seller,
            buyer: item.buyer,
            priceInWei: ethers.BigNumber.from(item.priceInWei),
            erc721TokenId: ethers.BigNumber.from(item.tokenId),
            timePurchased: ethers.BigNumber.from(item.timePurchased),
          },
          aavegotchiInfo_: aavegotchiInfo,
        };
      });
    }
  } else {
    if (result.erc1155Listings) {
      return result.erc1155Listings.map((item) => {
        return erc1155Info(item);
      });
    } else if (result.erc1155Purchases) {
      return result.erc1155Purchases.map((item) => {
        return {
          erc1155TypeId: ethers.BigNumber.from(item.erc1155TypeId),
          category: ethers.BigNumber.from(item.category),
          listingId: ethers.BigNumber.from(item.listingID),
          seller: item.seller,
          buyer: item.buyer,
          priceInWei: ethers.BigNumber.from(item.priceInWei),
          timeLastPurchased: ethers.BigNumber.from(item.timeLastPurchased),
          quantity: ethers.BigNumber.from(item.quantity),
        };
      });
    }
  }
}

function erc1155Info(item) {
  return {
    erc1155TypeId: ethers.BigNumber.from(item.erc1155TypeId),
    category: ethers.BigNumber.from(item.category),
    listingId: ethers.BigNumber.from(item.id),
    seller: item.seller,
    buyer: item.buyer,
    priceInWei: ethers.BigNumber.from(item.priceInWei),
    quantity: ethers.BigNumber.from(item.quantity),
  };
}

export function usingCorrectNetwork(currentNetwork) {
  if (!currentNetwork || currentNetwork === null) return false;
  if (currentNetwork === process.env.NETWORK) return true;
  return false;
}

export function removeUnnecessaryDecimal(price: string) {
  if (!price) return '';
  const decimalPrice = price.split('.')[1];
  if (Number(decimalPrice) === 0) return price.split('.')[0];
  return price;
}

export interface CollateralObject {
  name: string;
  kovanAddress: string;
  mainnetAddress: string;
  maticAddress: string;
  mumbaiAddress?: string;
  primaryColor: string;
  secondaryColor: string;
  cheekColor: string;
  svgId: number;
  eyeShapeSvgId: number;
  modifiers: number[];
  conversionRate: number;
  decimals: number;
  aave?: string;
  maticDisplay?: string;
}

export const collaterals: CollateralObject[] = [
  {
    name: 'testGHST',
    kovanAddress: '',
    mainnetAddress: '',
    maticAddress: '',
    mumbaiAddress: '0x20d0A1ce31f8e8A77b291f25c5fbED007Adde932',
    primaryColor: '#FF7D00',
    secondaryColor: '#F9D792',
    cheekColor: '#F4AF24',
    svgId: 0,
    eyeShapeSvgId: 18,
    modifiers: [1, 0, 0, 0, 0, 0],
    conversionRate: 1, // 1 DAI equals 1 DAI
    decimals: 18,
  },
  {
    name: 'aDAI',
    kovanAddress: '0xdcf0af9e59c002fa3aa091a46196b37530fd48a8',
    mainnetAddress: '0x028171bCA77440897B824Ca71D1c56caC55b68A3',
    maticAddress: '0xE0b22E0037B130A9F56bBb537684E6fA18192341',
    primaryColor: '#FF7D00',
    secondaryColor: '#F9D792',
    cheekColor: '#F4AF24',
    svgId: 0,
    eyeShapeSvgId: 18,
    modifiers: [1, 0, 0, 0, 0, 0],
    conversionRate: 1, // 1 DAI equals 1 DAI
    decimals: 18,
  },
  {
    name: 'aWETH',
    kovanAddress: '0x87b1f4cf9bd63f7bbd3ee1ad04e8f52540349347',
    mainnetAddress: '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e',
    maticAddress: '0x20D3922b4a1A8560E1aC99FBA4faDe0c849e2142',
    primaryColor: '#64438E',
    secondaryColor: '#EDD3FD',
    cheekColor: '#F696C6',
    svgId: 1,
    eyeShapeSvgId: 19,
    modifiers: [0, 1, 0, 0, 0, 0],
    decimals: 18,
    conversionRate: 731, // 647 DAI = 1 ETH
  },
  {
    name: 'aAAVE',
    kovanAddress: '0x6d93ef8093f067f19d33c2360ce17b20a8c45cd7',
    mainnetAddress: '0xFFC97d72E13E01096502Cb8Eb52dEe56f74DAD7B',
    maticAddress: '0x823CD4264C1b951C9209aD0DeAea9988fE8429bF',
    primaryColor: '#B6509E',
    secondaryColor: '#CFEEF4',
    cheekColor: '#F696C6',
    svgId: 2,
    eyeShapeSvgId: 17,
    decimals: 18,
    modifiers: [0, 0, 1, 0, 0, 0],
    conversionRate: 87, // 30 DAI = 1 LEND
  },

  {
    name: 'aLINK',
    kovanAddress: '0xed9044ca8f7cace8eaccd40367cf2bee39ed1b04',
    mainnetAddress: '0xa06bC25B5805d5F8d82847D191Cb4Af5A3e873E0',
    maticAddress: '0x98ea609569bD25119707451eF982b90E3eb719cD',
    primaryColor: '#0000B9',
    secondaryColor: '#D4DEF8',
    cheekColor: '#F696C6',
    svgId: 3,
    eyeShapeSvgId: 20,
    decimals: 18,
    modifiers: [0, 0, 0, 1, 0, 0],
    conversionRate: 12,
  },

  {
    name: 'aUSDT',
    kovanAddress: '0xff3c8bc103682fa918c954e84f5056ab4dd5189d',
    mainnetAddress: '0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811',
    maticAddress: '0xDAE5F1590db13E3B40423B5b5c5fbf175515910b',
    primaryColor: '#26a17b',
    secondaryColor: '#aedcce',
    cheekColor: '#F696C6',
    svgId: 4,
    eyeShapeSvgId: 0,
    decimals: 6,
    modifiers: [0, -1, 0, 0, 0, 0],
    conversionRate: 1,
  },

  {
    name: 'aUSDC',
    kovanAddress: '0xe12afec5aa12cf614678f9bfeeb98ca9bb95b5b0',
    mainnetAddress: '0xBcca60bB61934080951369a648Fb03DF4F96263C',
    maticAddress: '0x9719d867A500Ef117cC201206B8ab51e794d3F82',
    primaryColor: '#2664BA',
    secondaryColor: '#D4E0F1',
    cheekColor: '#F696C6',
    svgId: 5,
    decimals: 6,
    eyeShapeSvgId: 21,
    modifiers: [0, 0, -1, 0, 0, 0],
    conversionRate: 1, // 1 DAI = 1 USDC
  },

  {
    name: 'aTUSD',
    kovanAddress: '0x39914AdBe5fDbC2b9ADeedE8Bcd444b20B039204',
    mainnetAddress: '0x101cc05f4A51C0319f570d5E146a8C625198e636',
    maticAddress: '0xF4b8888427b00d7caf21654408B7CBA2eCf4EbD9',
    primaryColor: '#2664BA',
    secondaryColor: '#D4E0F1',
    cheekColor: '#F696C6',
    svgId: 5,
    eyeShapeSvgId: 21,
    decimals: 18,
    modifiers: [0, 0, -1, 0, 0, 0],
    conversionRate: 1, // 1 DAI = 1 USDC
  },
  {
    name: 'aUNI',
    kovanAddress: '0x54DB4508e4043af82d21501d0643D63F5eB4d12C',
    mainnetAddress: '0xB9D7CB55f463405CDfBe4E90a6D2Df01C2B92BF1',
    maticAddress: '0x8c8bdBe9CeE455732525086264a4Bf9Cf821C498',
    primaryColor: '#FF2A7A',
    secondaryColor: '#FFC3DF',
    cheekColor: '#F696C6',
    svgId: 6,
    eyeShapeSvgId: 23,
    decimals: 18,
    modifiers: [0, 0, -1, 0, 0, 0],
    conversionRate: 4, // 1 DAI = 1 USDC
  },
  {
    name: 'aYFI',
    kovanAddress: '0xf6c7282943beac96f6c70252ef35501a6c1148fe',
    mainnetAddress: '0x5165d24277cD063F5ac44Efd447B27025e888f37',
    maticAddress: '0xe20f7d1f0eC39C4d5DB01f53554F2EF54c71f613',
    primaryColor: '#0074F9',
    secondaryColor: '#C8E1FD',
    cheekColor: '#F696C6',
    svgId: 7,
    decimals: 18,
    eyeShapeSvgId: 22,
    modifiers: [0, 0, -1, 0, 0, 0],
    conversionRate: 21772, // 1 DAI = 1 USDC
  },
  {
    name: 'amDAI',
    kovanAddress: '0xdcf0af9e59c002fa3aa091a46196b37530fd48a8',
    mainnetAddress: '0x028171bCA77440897B824Ca71D1c56caC55b68A3',
    maticAddress: '0x27F8D03b3a2196956ED754baDc28D73be8830A6e',
    primaryColor: '#FF7D00',
    secondaryColor: '#F9D792',
    cheekColor: '#F4AF24',
    svgId: 0,
    eyeShapeSvgId: 18,
    modifiers: [1, 0, 0, 0, 0, 0],
    conversionRate: 1, // 1 DAI equals 1 DAI
    decimals: 18,
    aave: 'v2',
    maticDisplay: 'amDAI',
  },
  {
    name: 'amWETH',
    kovanAddress: '0x87b1f4cf9bd63f7bbd3ee1ad04e8f52540349347',
    mainnetAddress: '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e',
    maticAddress: '0x28424507fefb6f7f8E9D3860F56504E4e5f5f390',
    primaryColor: '#000000',
    secondaryColor: '#FBDFEB',
    cheekColor: '#F696C6',
    svgId: 9,
    eyeShapeSvgId: 19,
    modifiers: [0, 1, 0, 0, 0, 0],
    conversionRate: 3150, // 2537 DAI = 1 ETH
    decimals: 18,
    aave: 'v2',
    maticDisplay: 'amWETH',
  },
  {
    name: 'amAAVE',
    kovanAddress: '0x6d93ef8093f067f19d33c2360ce17b20a8c45cd7',
    mainnetAddress: '0xFFC97d72E13E01096502Cb8Eb52dEe56f74DAD7B',
    maticAddress: '0x1d2a0E5EC8E5bBDCA5CB219e649B565d8e5c3360',
    primaryColor: '#B6509E',
    secondaryColor: '#CFEEF4',
    cheekColor: '#F696C6',
    svgId: 2,
    eyeShapeSvgId: 17,
    modifiers: [0, 0, 1, 0, 0, 0],
    conversionRate: 399,
    decimals: 18,
    aave: 'v2',
    maticDisplay: 'amAAVE',
  },
  {
    name: 'amUSDT',
    kovanAddress: '0xff3c8bc103682fa918c954e84f5056ab4dd5189d',
    mainnetAddress: '0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811',
    maticAddress: '0x60D55F02A771d515e077c9C2403a1ef324885CeC',
    primaryColor: '#26a17b',
    secondaryColor: '#aedcce',
    cheekColor: '#F696C6',
    svgId: 4,
    eyeShapeSvgId: 20,
    modifiers: [0, -1, 0, 0, 0, 0],
    conversionRate: 1,
    decimals: 6,
    aave: 'v2',
    maticDisplay: 'amUSDT',
  },
  {
    name: 'amUSDC',
    kovanAddress: '0xe12afec5aa12cf614678f9bfeeb98ca9bb95b5b0',
    mainnetAddress: '0xBcca60bB61934080951369a648Fb03DF4F96263C',
    maticAddress: '0x1a13F4Ca1d028320A707D99520AbFefca3998b7F',
    primaryColor: '#2664BA',
    secondaryColor: '#D4E0F1',
    cheekColor: '#F696C6',
    svgId: 5,
    eyeShapeSvgId: 21,
    modifiers: [0, 0, -1, 0, 0, 0],
    conversionRate: 1, // 1 DAI = 1 USDC
    decimals: 6,
    aave: 'v2',
    maticDisplay: 'amUSDC',
  },
  {
    name: 'amWBTC',
    kovanAddress: '0x62538022242513971478fcC7Fb27ae304AB5C29F',
    mainnetAddress: '0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656',
    maticAddress: '0x5c2ed810328349100A66B82b78a1791B101C9D61',
    primaryColor: '#FF5E00',
    secondaryColor: '#FFCAA2',
    cheekColor: '#F696C6',
    svgId: 10,
    eyeShapeSvgId: 22,
    modifiers: [0, 1, 0, 0, 0, 0],
    conversionRate: 46550,
    decimals: 8,
    aave: 'v2',
    maticDisplay: 'amWBTC',
  },
  {
    name: 'amWMATIC',
    kovanAddress: '',
    mainnetAddress: '',
    maticAddress: '0x8dF3aad3a84da6b69A4DA8aeC3eA40d9091B2Ac4',
    primaryColor: '#824EE2',
    secondaryColor: '#E6DCF9',
    cheekColor: '#F696C6',
    svgId: 11,
    eyeShapeSvgId: 23,
    modifiers: [0, 0, 0, 1, 0, 0],
    conversionRate: 2,
    decimals: 18,
    aave: 'v2',
    maticDisplay: 'amWMATIC',
  },
];

/** Unique collateral types for cAavegotchi / mint-cartridge gallery (skip test + dup svgIds). */
export function getMintableCollaterals(): CollateralObject[] {
  const seen = new Set<number>();
  return collaterals.filter((c) => {
    if (!c.name || c.name === 'testGHST') return false;
    if (seen.has(c.svgId)) return false;
    seen.add(c.svgId);
    return true;
  });
}

export function collateralDisplayName(collateral: CollateralObject): string {
  return collateral.maticDisplay || collateral.name;
}

export const approveToken = async (token: AavegotchiTokens, contractName: DiamondName, network?: NetworkNames, signer?: Signer) => {
  if (!token) {
    console.error('No token selected!');
  } else if (!network || !signer) {
    console.error('Not connected');
  } else {
    const res = await setAllowance(1000000000000, `${token}Address`, contractName, network, signer);
    if (res) {
      showNotificationWithTimeout(GlobalState.NOTIFICATION.dispatch, {
        type: 'success',
        title: 'Approved Contract',
        message: `Increased ${token.toUpperCase()} allowance.`,
        options: {
          sound: true,
        },
      });
    }
    return res;
  }
};

export function collateralByAddress(network: string, address: string): CollateralObject {
  // CHANGED - To allow for Matic gotchis on test networks

  // const collateral = collaterals.find((add) => {
  //   if (network === 'main') return add.mainnetAddress.toLowerCase() === address.toLowerCase();
  //   else if (network === 'mumbai') return add.mumbaiAddress.toLowerCase() === address.toLowerCase();
  //   else if (network === 'matic') return add.maticAddress.toLowerCase() === address.toLowerCase();
  //   else return add.kovanAddress.toLowerCase() === address.toLowerCase();
  // });
  if (!address) {
    return collaterals[0];
  }
  const collateral = collaterals.find((add) => add.maticAddress?.toLowerCase() === address.toLowerCase());

  if (collateral != null) return collateral;
  // Base collaterals may not be in the legacy matic table yet — keep enter flow alive.
  return collaterals[0];
}

export async function addPolygon(): Promise<void> {
  // @ts-expect-error
  await window.ethereum?.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: '0x89',
        rpcUrls: ['https://rpc.ankr.com/polygon'],
        chainName: 'Polygon/Matic Mainnet',
        nativeCurrency: {
          name: 'Matic',
          decimals: 18,
          symbol: 'MATIC',
        },
        blockExplorerUrls: ['https://polygonscan.com/'],
      },
    ],
  });
}

/** Add / switch MetaMask to Robinhood Chain mainnet (4663 / 0x1237). */
export async function addRobinhood(): Promise<void> {
  // @ts-expect-error
  await window.ethereum?.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: '0x1237',
        rpcUrls: [process.env.NEXT_PUBLIC_ROBINHOOD_RPC || 'https://rpc.mainnet.chain.robinhood.com'],
        chainName: 'Robinhood Chain',
        nativeCurrency: {
          name: 'Ether',
          decimals: 18,
          symbol: 'ETH',
        },
        blockExplorerUrls: ['https://robinhoodchain.blockscout.com/'],
      },
    ],
  });
}

export async function addBase(): Promise<void> {
  // @ts-expect-error
  await window.ethereum?.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: '0x2105',
        rpcUrls: [process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org'],
        chainName: 'Base',
        nativeCurrency: {
          name: 'Ether',
          decimals: 18,
          symbol: 'ETH',
        },
        blockExplorerUrls: ['https://basescan.org/'],
      },
    ],
  });
}
