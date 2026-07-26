import { coreURI } from '../web3/shared.const.web3';
import { request } from 'graphql-request';
import { Logger, formatUnits } from 'ethers/lib/utils';
import { DEFAULT_GAS_PRICE } from '../constants/const.game';
import { parseFixed } from '@ethersproject/bignumber';

export const nFormatter = (num, digits) => {
  const lookup = [
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'k' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'G' },
    { value: 1e12, symbol: 'T' },
    { value: 1e15, symbol: 'P' },
    { value: 1e18, symbol: 'E' },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  const item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return num >= item.value;
    });
  return item ? (num / item.value).toFixed(digits).replace(rx, '$1') + item.symbol : '0';
};

export const useSubgraphCall = async (query, uri?) => {
  try {
    const data = await request(uri || coreURI, query);
    return data;
  } catch (err) {
    // console.log('Subgraph Error: ', err);
  }
};

const names = ['wei', 'kwei', 'mwei', 'gwei', 'szabo', 'finney', 'ether'];

const ethLogger = new Logger('units/5.0.10');

export function parseUnits(value, unitName) {
  if (typeof value !== 'string') {
    ethLogger.throwArgumentError('value must be a string', 'value', value);
  }
  if (typeof unitName === 'string') {
    const index = names.indexOf(unitName);
    if (index !== -1) {
      unitName = 3 * index;
    }
  }
  return parseFixed(value, unitName != null ? unitName : 18);
}

export function gasPrice() {
  return parseUnits(DEFAULT_GAS_PRICE, 'gwei');
}

export function smartTrim(string, maxLength) {
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

export function convertFromBigNumber(amount, decimals) {
  return removeUnnecessaryDecimal(formatUnits(amount.toString(), decimals || 18));
}

export async function resolveAddress(ens, address) {
  return await new Promise(async (resolve, reject) => {
    try {
      const name = await ens.reverse(address).name();
      resolve(name);
    } catch (error) {
      reject(error);
    }
  });
}

export function numberWithCommas(x, slice) {
  const withCommas = x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const split = withCommas.split('.');

  if (split.length >= 2) {
    if (slice > 0) return `${split[0]}.${split[1].slice(0, 2)}`;
    else return split[0];
  } else return withCommas;
}

export function chainIdToName(chainId) {
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
    case 31337:
      return 'localhost';
    default:
      break;
  }
}

function removeUnnecessaryDecimal(price) {
  if (!price) return '';
  const decimalPrice = price.split('.')[1];
  if (Number(decimalPrice) === 0) return price.split('.')[0];
  return price;
}
