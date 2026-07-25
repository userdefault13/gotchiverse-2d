/* eslint-disable @typescript-eslint/indent */
import GameController from 'components/controllers/GameController';
import { BigNumber, ethers } from 'ethers';
import { parseEther } from 'ethers/lib/utils';
import { NetworkNames, Tuple } from 'types';
import { abis, varsForNetwork } from 'shared_code/web3/shared.const.web3';
import { gasPriceDict } from 'web3/web3';
import _ from 'lodash';
import { removeUnnecessaryDecimal } from 'helpers/ethers.helper';
import Decimal from 'decimal.js';

const unsignedcontracts = {};
const signedContracts = {};
export type DiamondName =
  | 'aavegotchiDiamond'
  | 'realmDiamond'
  | 'installationDiamond'
  | 'gotchiLending'
  | 'tileDiamond'
  | 'ghstStaking'
  | 'fakeGotchisDiamond';
export type ContractName = 'ghstAddress' | 'maticAddress' | 'fudAddress' | 'fomoAddress' | 'alphaAddress' | 'kekAddress' | 'gltrAddress';

type DiamondCallMethods =
  | { name: 'currentHaunt'; parameters?: undefined }
  | { name: 'getAavegotchiSvg'; parameters: [string] }
  | {
      name: 'previewAavegotchi';
      parameters: [string, string, Tuple<number, 6>, Tuple<number, 16>];
    }
  | {
      name: 'getAavegotchiSideSvgs';
      parameters: [string];
    }
  | {
      name: 'previewSideAavegotchi';
      parameters: [string, string, Tuple<number, 6>, Tuple<number, 16>];
    }
  | {
      name: 'allAavegotchisOfOwner';
      parameters: [string];
    };

interface OtherDiamondCalls {
  name: string;
  parameters?: any;
}

export const useDiamondCall = async <R extends unknown>(
  provider: ethers.Signer | ethers.providers.Provider,
  network: string,
  method?: DiamondCallMethods | OtherDiamondCalls,
  diamondName: DiamondName = 'aavegotchiDiamond',
  useSigner?: boolean,
): Promise<R> => {
  if (!provider || !network) return;
  const vars = varsForNetwork(network);
  const contracts = useSigner ? unsignedcontracts : signedContracts;
  if (!contracts[diamondName]) contracts[diamondName] = new ethers.Contract(vars[diamondName], abis[diamondName], provider);
  // console.log(diamondName, contracts[diamondName]);
  const { name, parameters } = method;
  const res = await (parameters ? contracts[diamondName][name](...parameters) : contracts[diamondName][name]());
  return res;
};

export const getContract = (
  network: NetworkNames,
  provider: ethers.Signer | ethers.providers.Provider,
  contractName: DiamondName | ContractName = 'realmDiamond',
  useSigner?: boolean,
) => {
  const vars = varsForNetwork(network);
  const abi = abis[contractName] || abis.erc20;

  // Signer-backed contracts must not be cached across wallet reconnects — a stale signer
  // makes writes (channel / equip / claim) fail mysteriously until a full reload.
  if (useSigner) {
    try {
      if (!vars[contractName]) return undefined;
      return new ethers.Contract(vars[contractName], abi, provider);
    } catch (err) {
      console.log("Can't fetch contract with err:", err);
      return undefined;
    }
  }

  // Cache per network+name so Base/Polygon diamond addresses never collide.
  const cacheKey = `${network}:${contractName}`;
  const contracts = signedContracts;
  if (!contracts[cacheKey]) {
    try {
      if (!vars[contractName]) return undefined;
      contracts[cacheKey] = new ethers.Contract(vars[contractName], abi, provider);
    } catch (err) {
      console.log("Can't fetch contract with err:", err);
    }
  }

  return contracts[cacheKey] || undefined;
};

export const getAlchemicaBalances = async <R extends unknown>(address: string, provider: ethers.providers.Provider, network: NetworkNames) => {
  const types = ['fudAddress', 'fomoAddress', 'alphaAddress', 'kekAddress', 'gltrAddress'] as ContractName[];
  const balances = [];
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    try {
      const balance = await getTokenBalances(address, type, provider, network);

      balances.push(balance);
    } catch (error) {
      return;
    }
  }
  return balances;
};

export const getTokenBalances = async <R extends unknown>(
  address: string,
  token: ContractName,
  provider: ethers.providers.Provider,
  network: NetworkNames,
) => {
  const tokenContract = getContract(network, provider, token);
  try {
    const bigNumberBalance = await tokenContract.balanceOf(address);
    const decimal = new Decimal(ethers.utils.formatEther(bigNumberBalance));
    const balance = decimal.decimalPlaces() >= 2 && Number(decimal) >= 0.01 ? Number(decimal.minus(0.01)) : Number(decimal);
    return balance;
  } catch (error) {
    console.error('Failed to fetch Token balance from: ', token);
    //
  }
};

export async function fetchAllowence(
  contractName: ContractName,
  diamondName: DiamondName,
  account: string,
  network: NetworkNames,
  provider: ethers.providers.Provider,
) {
  const vars = varsForNetwork(network);
  const contract = await getContract(network, provider, contractName);
  // Get approved balance
  if (!contract) return;
  const response: BigNumber = await contract.allowance(account, vars[diamondName]);
  return response;
}

export const fetchTokensAllowance = async (diamondName: DiamondName, account: string, network: NetworkNames, provider: ethers.providers.Provider) => {
  const alchemicaTypes = ['fudAddress', 'fomoAddress', 'alphaAddress', 'kekAddress', 'gltrAddress'] as ContractName[];
  const allowance = [];
  for (const type of alchemicaTypes) {
    const typeAllowance = await fetchAllowence(type, diamondName, account, network, provider);
    allowance.push(typeAllowance);
  }
  return allowance;
};

export const setAllowance = async (
  etherAmount: number,
  contractName: ContractName,
  diamondName: DiamondName,
  network: NetworkNames,
  signer: ethers.Signer,
): Promise<boolean> => {
  const vars = varsForNetwork(network);
  const contract = await getContract(network, signer, contractName, true);
  if (!contract) return false;

  const amount = parseEther(etherAmount.toString());
  const approveAmount = amount.toString();

  try {
    const tx = await contract.approve(vars[diamondName], approveAmount, { ...(await gasPriceDict(signer)) });
    await tx.wait();
    // GameController.handleToastNotification({
    //   message: `You approved the Crafting Table to spend ${tokenName}`,
    //   type: 'info',
    //   autoClose: true,
    // });
    return true;
  } catch (error) {
    GameController.handleToastNotification({
      message: error.data?.message || 'RPC Error',
      type: 'error',
      autoClose: true,
    });
    return false;
    // set Allowance amount.
  }
};

interface Balance {
  fud: number;
  fomo: number;
  alpha: number;
  kek: number;
  gltr?: number;
}

interface Allowance {
  fud: BigNumber;
  fomo: BigNumber;
  alpha: BigNumber;
  kek: BigNumber;
  gltr?: BigNumber;
}

export const checkTokensAllowance = (
  price: Balance,
  allowance: Allowance,
): {
  fud: boolean;
  fomo: boolean;
  alpha: boolean;
  kek: boolean;
  gltr: boolean;
} => {
  const hasAllowance = (token: 'fud' | 'fomo' | 'alpha' | 'kek' | 'gltr'): boolean => {
    return !!allowance[token]?.gte(parseEther(price[token].toString()));
  };

  return {
    fud: hasAllowance('fud'),
    fomo: hasAllowance('fomo'),
    alpha: hasAllowance('alpha'),
    kek: hasAllowance('kek'),
    gltr: hasAllowance('gltr'),
  };
};

export const getMaxQuantity = (price: Balance, balance: Balance) => {
  let max = 50;
  _.forOwn(balance, (value, key) => {
    const quantity = Math.floor(value / price[key]);
    if (quantity < max) max = quantity;
  });
  return max;
};
