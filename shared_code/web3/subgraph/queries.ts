export function getSingleGotchi(id) {
  // aavegotchis(first: 1, orderBy: gotchiId, orderDirection: asc, where: { id:"${id}", status: 3} }) {
  return `
  {
    aavegotchis( where:{id: "${id.toLowerCase()}"}) {
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
      level
      experience
      stakedAmount
      collateral
      kinship
    }
  }
  `;
};

export function getAllAavegotchisOfOwner(owner, sortValue, searchValue) {
  const getSortQuery = (sort) => {
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
      default:
        return 'orderBy: withSetsRarityScore, orderDirection: desc';
    }
  };

  const getSearchQuery = (search) => {
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
        level
        experience
        stakedAmount
        collateral
        kinship
      }
    }
  `;
  return query;
};

function getAuctionLeaderboard() {
  return `{users(orderBy:bids, orderDirection:desc) {
    id
    bids
    bidAmount
  }}`;
};

function getUserParcelsQuery(currentAccount) {
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

function getAavegotchiSvg(id) {
  return `{
      aavegotchis( where:{id: "${id.toLowerCase()}"}) {
        svg
      }
    }
    `;
};

function getAavegotchiSideSVGs(id) {
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

export function getParcelOwners(ids) {
  const url = process.env.NEXT_PUBLIC_GOTCHIVERSE_SUBGRAPH_URL || '';
  const hasura =
    url.includes('gotchiverse-base') ||
    process.env.REALM_NETWORK === 'base' ||
    process.env.NETWORK === 'base';
  const ownerField = hasura ? 'owner_id' : 'owner { id }';
  return `{
    parcels (where: { id_in: [${ids}]}) {
      id
      ${ownerField}
    }
  }`;
};

export function getParcelEvent(parcelTokenId) {
  // note that id here is the parcel tokenId
  return `{
    bounceGateEvents (where:{id: "${parcelTokenId}"}) {
      id
      title
      startTime
      endTime
      priority
      equipped
      lastTimeUpdated
      cancelled
    }
  }`;
};

export function getAllParcelEvents() {
  // note that id here is the parcel tokenId
  const timeSecondsNow = Number(Number(Date.now() / 1000).toFixed()).toString();
  return `{
    bounceGateEvents(where:{cancelled: false, endTime_gt:"${timeSecondsNow}"} orderBy:priority, orderDirection:desc ) {
      id
      title
      startTime
      endTime
      priority
      equipped
      lastTimeUpdated
      cancelled
    }
  }`;
};

export function getOwnedAavegotchisOfOwner(owner) {
  return `  {users (where :{id:"${owner.toLowerCase()}"}){
    gotchisOriginalOwned {
      id
    }
  }}`;
};

export function getNFTDisplayStatuses() {
  return `{
    nftdisplayStatuses (where: {allowed:true}){
      id
      contractAddress
      contractId
      chainId
    }
  }`;
};