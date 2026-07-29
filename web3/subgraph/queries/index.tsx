import { ContractType } from 'types';

export const getAllAavegotchisOfOwner = (owner: string, sortValue?: string, searchValue?: string): string => {
  const getSortQuery = (sort: string) => {
    switch (sort) {
      case 'tokenId_asc':
        return 'orderBy: gotchiId, orderDirection: asc';
      case 'tokenId_desc':
        return 'orderBy: gotchiId, orderDirection: desc';
      case 'brs_asc':
        return 'orderBy: withSetsRarityScore, orderDirection: asc';
      case 'brs_desc':
        return 'orderBy: withSetsRarityScore, orderDirection: desc';
      case 'name_asc':
        return 'orderBy: name, orderDirection: asc';
      case 'name_desc':
        return 'orderBy: name, orderDirection: desc';
      case 'kinship_asc':
        return 'orderBy: kinship, orderDirection: asc';
      case 'kinship_desc':
        return 'orderBy: kinship, orderDirection: desc';
      default:
        return 'orderBy: withSetsRarityScore, orderDirection: desc';
    }
  };

  const getSearchQuery = (search?: string) => {
    if (!search) return '';
    if (/^\d+$/.test(search)) {
      return `, gotchiId: "${search}"`;
    } else {
      return `, name_contains: "${search}"`;
    }
  };

  const query = `
    {
      aavegotchis(first: 1000, ${getSortQuery(sortValue)},  where: { owner:"${owner.toLowerCase()}", status: 3${getSearchQuery(searchValue)} }) {
        id
        name
        withSetsNumericTraits
        numericTraits
        equippedWearables
        baseRarityScore
        withSetsRarityScore
        owner {
          id
        }
        originalOwner {
          id
        }
        level
        escrow
        experience
        stakedAmount
        collateral
        kinship
      }
    }
  `;
  return query;
};

export const getOwnedAavegotchisOfOwner = (owner: string): string => {
  // return `  {users (where :{id:"${owner.toLowerCase()}"}){
  //   gotchisOriginalOwned {
  //     id
  //   }
  // }}`

  return `
  {
    aavegotchis( where: { owner:"${owner.toLowerCase()}", status: 3 }) {
      id
      owner {
        id
      }
      originalOwner{
        id
      }
    }
  }`;
};

export const getAuctionLeaderboard = (): string => {
  return `{users(orderBy:bids, orderDirection:desc) {
    id
    bids
    bidAmount
  }}`;
};

export const getUserParcelsQuery = (currentAccount): string => {
  return `{
      user( id: "${currentAccount.toLowerCase()}") {
        id
        ownedParcels {
          id
          parcelId
        }
      }
    }
    `;
};

export const getUsersParcels = (accounts: string[], filter?: { district?: number; search?: string }, page?: number): string => {
  const resultsPerPage = 1000;
  const currentPage = page || 1;

  const first = resultsPerPage * currentPage;
  const skip = resultsPerPage * (currentPage - 1);

  return `{
      parcels (first: ${first}, skip: ${skip}, where: { owner_in: [${accounts.map((account) => `"${account.toLocaleLowerCase()}"`)}]${
    filter?.district ? `, district: ${filter.district}` : ''
  }${filter?.search ? `, parcelHash_contains: "${filter.search.toLowerCase()}"` : ''} }, orderBy: district) {
        parcelId
        id
        parcelHash
        district
        size
        owner {
          id
        }
        lastChanneledAlchemica
        equippedInstallations {
          id
        }
      }
  }`;
};

export const getAavegotchiSvg = (id: string): string => {
  return `{
      aavegotchis( where:{id: "${id.toLowerCase()}"}) {
        svg
      }
    }
    `;
};

export const getAavegotchiSvgs = (ids: string[]): string => {
  return `{
    aavegotchis( where:{id_in: [${ids}]}) {
      svg
      id
    }
  }
  `;
};

export const getAavegotchiSideSVGs = (id: string): string => {
  return `{
      aavegotchis( where:{id: "${id.toLowerCase()}"}) {
        svg
        left
        right
        back
      }
    }
    `;
};

export const getAavegotchiLastChanneled = (ids: number[]): string => {
  return `{
    gotchis (
      where: { id_in: [${ids}] }
      first: ${ids.length !== 0 ? ids.length : 1}
    ) {
      lastChanneledAlchemica
      id
    }
  }`;
};

export const getParcelLastChanneled = (ids: number[]): string => {
  const idList = ids.map((id) => `"${id}"`).join(',');
  return `{
    parcels (
      where: { id_in: [${idList}]}
      first: ${ids.length !== 0 ? ids.length : 1}
    ) {
      id
      owner {
        id
      }
      lastChanneledAlchemica
      equippedInstallations {
        id
      }
    }
  }`;
};

export const getNFTDisplayStatuses = (): string => {
  return `{
    nftdisplayStatuses (where: {allowed:true}){
      id
      contractAddress
      contractId
      chainId
    }
  }`;
};

export const getInstallationTypes = (name: string, types: any): string => {
  const installationTypes: number[] = [];

  types.aaltar && installationTypes.push(0);
  types.decoration && installationTypes.push(7);
  types.harvester && installationTypes.push(1);
  types.reservoir && installationTypes.push(2);
  types.maaker && installationTypes.push(6);
  types.waall && installationTypes.push(3);
  types.lodge && installationTypes.push(4);
  installationTypes.push(5);
  installationTypes.push(8);

  return `
    query installationsQuery {
      installationTypes(where: {deprecated: false, installationType_in: [${installationTypes},7,8], name_contains_nocase: "${
    name || ''
  }", level: 1}) {
        id
        name
        alchemicaCost
        craftTime
        deprecatedAt
        installationType
      }
    }
  `;
};

export const getTileTypes = (name: string): string => {
  return `
    query tilesQuery {
      tileTypes(where: {deprecated: false, name_contains_nocase: "${name || ''}"} ) {
        id
        name
        alchemicaCost
        craftTime
        tileType
        deprecated
        deprecatedAt
      }
    }
  `;
};

export const erc721ActivityListingsQuery = (type: string, skip?: number): string => {
  const localCategory = `category_in: [${type.split('').join(',')}]`;
  return `
    {erc721Listings(first:100 skip:${skip ?? 0}, where:{${localCategory},timePurchased_gt:0}, orderBy:timePurchased, orderDirection:desc) {
      id
      tokenId
      category
      blockCreated
      priceInWei
      seller
      timePurchased
      portal {
        hauntId
        timesTraded
        owner
      }
      parcel {
        size
        district
        fomoBoost
        fudBoost
        kekBoost
        alphaBoost
        timesTraded
        parcelId
        parcelHash
      }
      gotchi {
        id
        name
        collateral
        modifiedNumericTraits
        stakedAmount
        hauntId
        kinship
        modifiedRarityScore
        baseRarityScore
        level
        experience
        owner {
          id
        }
      }
    }}
  `;
};

export const erc1155ActivityListingsQuery = (type: string, skip?: number): string => {
  const localCategory = `category_in: [${type.split('').join(',')}]`;
  return `
{
erc1155Purchases(first:100 skip:${skip ?? 0}, where:{${localCategory}}, orderBy:timeLastPurchased, orderDirection:desc) {
  listingID
  buyer
  erc1155TypeId
  category
  quantity
  timeLastPurchased
  priceInWei
  seller
}
}
`;
};

export const ownerListingsQuery = (seller: string, contractType: ContractType, category: string): string => {
  return contractType === 'ERC721' ? erc721OwnerListingsQuery(seller, category) : erc1155OwnerListingsQuery(seller, category);
};

export const erc1155OwnerListingsQuery = (seller: string, category: string, skip?: number): string => {
  const localCategory = `category_in: [${category.split('').join(',')}]`;
  return `
{
erc1155Listings( first: 100 skip: ${skip ?? 0}
  where:{${localCategory}, seller:"${seller.toLowerCase()}", cancelled:false, sold:false}, orderBy:timeLastPurchased, orderDirection:desc) {
  id
  cancelled
  sold
  erc1155TypeId
  erc1155TokenAddress
  category
  quantity
  category
  priceInWei
  timeCreated
  timeLastPurchased
  seller
  rarityLevel
}
}`;
};

export const erc721OwnerListingsQuery = (seller: string, category: string, skip?: number): string => {
  const localCategory = `category_in: [${category.split('').join(',')}]`;
  return `
{
  erc721Listings( first: 100, skip: ${skip ?? 0}
    where:{${localCategory} seller:"${seller}", cancelled:false, timePurchased:0}, orderBy:timeCreated, orderDirection:desc) {
    id
    tokenId
    category
    priceInWei
    seller
    timePurchased
    portal {
    timesTraded
  }

  parcel {
    size
    district
    fomoBoost
    fudBoost
    kekBoost
    alphaBoost
    timesTraded
    parcelId
    parcelHash
  }

  gotchi {
id
name
kinship
hauntId
collateral
modifiedNumericTraits
withSetsNumericTraits
stakedAmount
modifiedRarityScore
withSetsRarityScore
baseRarityScore
level
experience
timesTraded
claimedAt
usedSkillPoints
lastInteracted
owner {
  id
}
  }
}}
`;
};

export const getBounceGateEvents = (): string => {
  return `{
    bounceGateEvents {
      id
      priority
      startTime
      lastTimeUpdated
      endTime
      title
    }
  }`;
};
