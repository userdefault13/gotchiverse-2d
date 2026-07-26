import { ChainId } from '../../chains';
import { MarketDataType } from '../types';

export enum CustomMarket {
  proto_base = 'proto_base',
  proto_robinhood = 'proto_robinhood',
  proto_kovan = 'proto_kovan',
  proto_mainnet = 'proto_mainnet',
  proto_avalanche = 'proto_avalanche',
  proto_matic = 'proto_matic',
  proto_mumbai = 'proto_mumbai',
  amm_kovan = 'amm_kovan',
  amm_mainnet = 'amm_mainnet',
  proto_fuji = 'proto_fuji',
}

export const marketsData: {
  [key in keyof typeof CustomMarket]: MarketDataType;
} = {
  [CustomMarket.proto_base]: {
    chainId: ChainId.base,
    aTokenPrefix: 'A',
  },
  [CustomMarket.proto_robinhood]: {
    chainId: ChainId.robinhood,
    aTokenPrefix: 'A',
  },
  [CustomMarket.proto_matic]: {
    chainId: ChainId.polygon,
    aTokenPrefix: 'AM',
  },
  [CustomMarket.proto_kovan]: {
    chainId: ChainId.kovan,
    aTokenPrefix: 'A',
  },
  [CustomMarket.proto_mainnet]: {
    chainId: ChainId.mainnet,
    aTokenPrefix: 'A',
  },
  [CustomMarket.amm_kovan]: {
    chainId: ChainId.kovan,
    aTokenPrefix: 'AAMM',
  },
  [CustomMarket.amm_mainnet]: {
    chainId: ChainId.mainnet,
    aTokenPrefix: 'AAMM',
  },
  [CustomMarket.proto_mumbai]: {
    chainId: ChainId.mumbai,
    aTokenPrefix: 'AM',
  },
  [CustomMarket.proto_fuji]: {
    chainId: ChainId.fuji,
    aTokenPrefix: 'AAVA',
  },
  [CustomMarket.proto_avalanche]: {
    chainId: ChainId.avalanche,
    aTokenPrefix: 'AV',
  },
} as const;
