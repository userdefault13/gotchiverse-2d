/* eslint-disable @typescript-eslint/indent */
import _ from 'lodash';
import { getNFTDisplayStatuses, getOwnedAavegotchisOfOwner } from 'web3/subgraph/queries';
import { useSubgraph } from 'web3/subgraph';
import { AllowedCollection, MoralisNetwork, NFTDisplayData, PaginatedNFTDisplayData } from 'types';
import { NFTDisplay } from 'components/phaser/NFTDisplay';
import { _isSafeURL } from 'helpers/realm.helper';
import GlobalState from 'contexts/GlobalState';
import { gotchiverseSubgraph } from 'shared_code/web3/shared.const.web3';

// Lazy-load Moralis so Next.js SSR/build does not evaluate the CJS bundle at collect-page-data time.
let Moralis: typeof import('moralis').default | null = null;
let EvmChain: typeof import('@moralisweb3/common-evm-utils').EvmChain | null = null;
let moralisStarted = false;

async function ensureMoralis() {
  if (!Moralis) {
    const moralisMod = await import('moralis');
    Moralis = moralisMod.default;
  }
  if (!EvmChain) {
    const evmMod = await import('@moralisweb3/common-evm-utils');
    EvmChain = evmMod.EvmChain;
  }
  return { Moralis, EvmChain };
}

async function startMoralisIfNeeded() {
  const { Moralis: moralis } = await ensureMoralis();
  if (!moralisStarted) {
    await moralis.start({ apiKey: process.env.MORALIS_API_KEY });
    moralisStarted = true;
  }
  return moralis;
}

interface MoralisControllerInterface {
  init: () => void;
  allowedMoralisNetworks: MoralisNetwork[];
  allowedCollections: AllowedCollection[];
  assetsConfig;
  getWalletNFTs: (address: string, network: MoralisNetwork, cursor: string, collections?: AllowedCollection[]) => Promise<PaginatedNFTDisplayData>;
  getCollectionId: (address: string) => string;
  // getNFTMetadata: (address: string, owner: string, chainId: string, tokenId: string) => Promise<NFTDisplayData>;
  getCollectionById: (id: string) => AllowedCollection;
  getCollectionsByNetwork: (network: MoralisNetwork) => AllowedCollection[];
}

// const TEST_WALLET = '0xc4cb6cb969e8b4e309ab98e4da51b77887afad96';
const TEST_WALLET = undefined;
const ENABLE_PROXY = true;

const ASSETS_CONFIG = {
  0: {
    name: 'Aavegotchis + Wearables',
    contract: 'aavegotchiDiamond',
    type: 2,
    category: { ERC721: 3, ERC1155: 0 },
    metadata: 'https://app.aavegotchi.com/metadata/aavegotchis/',
    icon: 'aavegotchis_collection.png',
    isSVG: true,
    hasBaazaar: true,
  },
  1: {
    name: 'REALM Parcels',
    type: 0,
    contract: 'realmDiamond',
    metadata: 'https://app.aavegotchi.com/metadata/realm/',
    img: 'https://gotchiverse.s3.ap-northeast-1.amazonaws.com/',
    suffix: '?x-phaser=1',
    category: { ERC721: 4 },
    icon: 'realm_collection.png',
    hasBaazaar: true,
  },
  2: {
    name: 'Tiles',
    type: 1,
    contract: 'tileDiamond',
    metadata: 'https://app.aavegotchi.com/metadata/tile/',
    img: 'https://app.aavegotchi.com/images/tiles/',
    category: { ERC1155: 5 },
    icon: 'tiles_collection.png',
    hasBaazaar: true,
  },
  3: {
    name: 'Installations',
    type: 1,
    contract: 'installationDiamond',
    metadata: 'https://app.aavegotchi.com/metadata/installation/',
    img: 'https://app.aavegotchi.com/images/installation/',
    category: { ERC1155: 4 },
    icon: 'installations_collection.gif',
    hasBaazaar: false,
  },
  4: { name: 'Aavegotchi Collabs', hasBaazaar: false, icon: 'collabs_collection.gif', metadata: 'https://app.aavegotchi.com/metadata/aave' },
  5: {
    name: 'Raffle Tickets',
    contract: 'ghstStaking',
    type: 1,
    metadata: 'https://app.aavegotchi.com/metadata/polygon/tickets',
    category: { ERC1155: 3 },
    icon: 'tickets_collection.svg',
    hasBaazaar: true,
  },
  6: {
    name: 'Aavegotchi Art Commissions',
    icon: 'commissions_collection.png',
    hasBaazaar: false,
    useProxy: false,
  },
  7: {
    name: 'FAKE Gotchis Cards',
    icon: 'fake_gotchis_cards_collection.png',
    category: { ERC1155: 6 },
    contract: 'fakeGotchisDiamond',
    hasBaazaar: false,
    type: 1,
    isCover: true,
  },
  8: {
    name: 'FAKE Gotchis Art',
    icon: 'fake_gotchis_art_collection.png',
    contract: 'fakeGotchisDiamond',
    category: { ERC721: 5 },
    prefix: ENABLE_PROXY ? `${process.env.NEXT_PUBLIC_API_URL}/image/proxy?url=` : undefined,
    hasBaazaar: true,
    requireSelfApprove: true,
    type: 0,
    isCover: true,
  },
};

const allowedMoralisNetworks: MoralisNetwork[] = ['POLYGON', 'ETHEREUM'];
let allowedCollections: AllowedCollection[];

const init = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  await startMoralisIfNeeded();
  await getAllowedCollections();
};

const getCollectionsByNetwork = (network: MoralisNetwork): AllowedCollection[] => {
  if (!_.includes(allowedMoralisNetworks, network)) {
    console.error('@Moralis.getWalletNFTs: not a valid network', network);
    return;
  }
  if (!EvmChain) {
    console.warn('@Moralis.getCollectionsByNetwork: Moralis not initialized');
    return [];
  }
  const chain = EvmChain[network];
  return _.filter(allowedCollections, ({ chainId }) => Number(chainId) === Number(chain.apiHex));
};

const getAllowedCollections = async () => {
  const query = getNFTDisplayStatuses();
  const res = await useSubgraph<{ nftdisplayStatuses: AllowedCollection[] }>(query, gotchiverseSubgraph);
  // console.log('@getAllowedCollections:res', res);
  // map in collections
  if (res) {
    allowedCollections = _.map(res.nftdisplayStatuses, (collection) => {
      return _.assign(collection, ASSETS_CONFIG[collection.contractId]);
    });
  }
};

const getWalletNFTs = async (
  address: string,
  network: MoralisNetwork,
  cursor: string,

  collections?: AllowedCollection[],
): Promise<PaginatedNFTDisplayData> => {
  const emptyData: PaginatedNFTDisplayData = { data: [], page: 0, cursor: null };

  if (!address) return emptyData; // no valid address
  const moralis = await startMoralisIfNeeded();
  const { EvmChain: chainEnum } = await ensureMoralis();
  const contractList = getCollectionsByNetwork(network);
  const chain = chainEnum[network];
  const allowedContracts = _.map(contractList, ({ contractAddress }) => contractAddress.toLowerCase());
  const params = {
    address: TEST_WALLET || address,
    chain,
    limit: 25,
    cursor,
    tokenAddresses: !collections?.length
      ? allowedContracts
      : _.intersection(
          allowedContracts,
          _.map(collections, ({ contractAddress }) => contractAddress.toLowerCase()),
        ),
  };
  // console.log('@getWalletNFTs:params', params);

  let res;
  try {
    res = await moralis.EvmApi.nft.getWalletNFTs(params);
  } catch (error) {
    console.error('@getWalletNFTs:ERR', error);
  }
  if (!res) return emptyData;
  console.log('@Moralis.getWalletNFTs:res', res);
  const { cursor: newCursor, page } = res.data;
  let list;

  // Due to some errors in FakeGotchis generation we cannot call .toJSON() on fakeGotchis collection.
  try {
    list = res.toJSON();
  } catch (error) {
    console.error('TOJSON:ERR', error);
    console.warn('Metadata might not be valid JSON format');
    list = _.values(
      _.map(res.data.result, (item) => {
        return {
          tokenId: item.token_id,
          contractType: item.contract_type,
          metadata: undefined,
          tokenAddress: item.token_address,
          tokenUri: item.token_uri,
        };
      }),
    );
  }
  console.log('@Moralis.getWalletNFTs:list', list);

  const transformed: NFTDisplayData[] = [];
  if (list.length) {
    for (let i = 0; i < list.length; i++) {
      const transformedData = await transformNFTData(list[i], address, false);
      if (transformedData) transformed.push(transformedData);
    }
  }
  // console.log('@Moralis.getWalletNFTs:list', transformed);

  if (network !== 'POLYGON') {
    return {
      data: transformed,
      cursor: newCursor,
      page,
    };
  }
  const collection = getCollectionById('0');
  // if (!_.filter(list, [collection.contractAddress.toLowerCase(), 'tokenAdress']).length) {
  if (
    (!collections?.length || _.find(collections, ['contractId', Number(0)])) &&
    !_.filter(list, (item) => {
      return item.tokenAddress.toLocaleLowerCase() === collection.contractAddress.toLowerCase() && item.contractType === 'ERC721';
    }).length
  ) {
    console.warn('@Moralis.getWalletNFTs: Moralis did not indexed aavegotchis, fetching from subgraph');
    const subgraphData = await getSubgraphCollection(collection);
    transformed.unshift(...subgraphData);
  }
  // console.log('@getWalletNFTs:transformed', transformed);
  return {
    data: transformed,
    cursor: newCursor,
    page,
  };
};

const getSubgraphCollection = async (collection: AllowedCollection): Promise<NFTDisplayData[]> => {
  const query = getOwnedAavegotchisOfOwner(TEST_WALLET || GlobalState.WEB3.state.currentAccount);
  const res = await useSubgraph<{ aavegotchis }>(query);
  if (!res) return [];
  const ownedGotchis = _.filter(res.aavegotchis, (gotchi) => {
    return !gotchi.originalOwner?.id || gotchi.originalOwner?.id === gotchi.owner?.id;
  });
  const list = ownedGotchis.map((item) => {
    return {
      tokenAddress: collection.contractAddress,
      tokenId: item.id,
      tokenUri: ASSETS_CONFIG[collection.contractId].metadata + item.id,
      contractType: 'ERC721',
    };
  });
  const transformed: NFTDisplayData[] = [];

  for (let i = 0; i < list.length; i++) {
    transformed.push(await transformNFTData(list[i], GlobalState.WEB3.state.currentAccount, true));
  }
  return transformed;
};

// not used
// const getNFTMetadata = async (address: string, owner: string, chainId: string, tokenId: string): Promise<NFTDisplayData> => {
//   // TO DO: map chainId to EVMCHAIN
//   const chain = EvmChain.POLYGON;

//   const response = await Moralis.EvmApi.nft.getNFTMetadata({
//     address,
//     chain,
//     tokenId,
//   });
//   const data = await response.toJSON();
//   console.log('@getNFTMetadata:res', data);
//   const transformed = await transformNFTData(data, owner, false);
//   return transformed;
// };

const transformNFTData = async (evmNFT, nftOwner: string, withMetadata?: boolean): Promise<NFTDisplayData> => {
  const collectionId = getCollectionId(evmNFT.tokenAddress);
  // sanity check
  if (!collectionId) {
    console.error('@transformNFTData:ERR Could not getCollectionId', evmNFT.tokenAddress);
    return;
  }
  const collection = getCollectionById(collectionId);
  const chainId = collection.chainId;
  const owner = nftOwner;
  // Transform contract type in number ;
  const contractType = evmNFT.contractType === 'ERC721' ? 0 : 1;
  const id = `${collectionId}_${chainId}_${contractType}_${evmNFT.tokenId}`;
  const data = _.pick(evmNFT, ['metadata', 'tokenId', 'tokenAddress', 'tokenUri', 'contractType']);

  if (Number(collectionId) === 8) {
    data.tokenUri = `${process.env.NEXT_PUBLIC_API_URL}/metadata/fakegotchisart?tokenId=${data.tokenId}`;
  }
  const nft = {
    id,
    collectionId,
    owner,
    chainId,
    ...data,
  };
  if (data?.tokenUri && (!data.metadata?.image || !_isSafeURL(data.metadata?.image) || data.metadata?.image.includes('undefined')) && withMetadata) {
    await NFTDisplay.updateMetadata(nft);
  }
  return nft;
};

const getCollectionId = (address: string) => {
  // console.log('@getCollectionId:address', address);
  return _.find(allowedCollections, ['contractAddress', address.toLocaleLowerCase()])?.contractId.toString();
};

const getCollectionById = (id: string) => {
  return _.find(allowedCollections, ['contractId', Number(id)]);
};

export const MoralisController: MoralisControllerInterface = {
  init,
  allowedMoralisNetworks,
  assetsConfig: ASSETS_CONFIG,
  allowedCollections,
  getWalletNFTs,
  getCollectionId,
  // getNFTMetadata,
  getCollectionById,
  getCollectionsByNetwork,
};
