import { LeaderboardData, ParcelData } from 'types';

export async function fetchParcelMetadata(parcelId: string): Promise<ParcelData[] | undefined> {
  try {
    return await fetch(`${process.env.NEXT_PUBLIC_API_URL}/realm/parcel/info?parcelId=${parcelId}`)
      .then(async (response) => await response.json())
      .then(({ data }) => data);
  } catch (e) {
    console.warn('Failed to load selected parcel Metadata via API', e);
  }
}

export async function fetchParcelMetadataByParcelIds(parcelIds: string[]): Promise<ParcelData[]> {
  try {
    return await fetch(`${process.env.NEXT_PUBLIC_API_URL}/realm/parcel/info?parcelId=${parcelIds.join(',')}`)
      .then(async (response) => await response.json())
      .then(({ data }) => data);
  } catch (e) {
    console.warn('Failed to load selected parcel Metadata via API', e);
  }
}

export async function getQueueSize() {
  try {
    return await fetch(`${process.env.NEXT_PUBLIC_API_URL}/join-queue-size`).then(async (response) => await response.json());
  } catch (e) {
    console.warn('Failed to load selected parcel Metadata via API', e);
  }
}

export async function fetchParcelMetadataByTokenId(tokenId: string): Promise<ParcelData[]> {
  try {
    return await fetch(`${process.env.NEXT_PUBLIC_API_URL}/realm/parcel/info?tokenId=${tokenId}`)
      .then(async (response) => await response.json())
      .then(({ data }) => data);
  } catch (e) {
    console.warn('Failed to load selected parcel Metadata via API', e);
  }
}

export async function getFakeGotchisArtMetadata(tokenId: string): Promise<string> {
  try {
    return await fetch(`${process.env.NEXT_PUBLIC_API_URL}/metadata/fakegotchisart?tokenId=${tokenId}`)
      .then(async (response) => await response.json())
      .then(({ data }) => data);
  } catch (e) {
    console.warn('Failed to load selected fake gotchi Metadata via API', e);
  }
}

interface LeaderboardRes {
  leaderboard: LeaderboardData[];
  gotchis: LeaderboardData[];
}
export async function getLeaderboardAll(filter?: string, page?: number, limit = 10, sort = 'kills', dir = 'desc'): Promise<LeaderboardRes> {
  let offset = 0;
  if (page) offset = page * limit;

  try {
    return await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/leaderboard/all?limit=${limit}&offset=${offset}&filterBy=${
        filter.length ? filter : undefined
      }&sortBy=${sort}&sortType=${dir}`,
    ).then(async (response) => await response.json());
  } catch (e) {
    console.warn('Failed to load leaderboard all via API', e);
  }
}

export async function fetchParcelMetadataByTokenIds(tokenIds: string[]): Promise<ParcelData[]> {
  try {
    return await fetch(`${process.env.NEXT_PUBLIC_API_URL}/realm/parcel/info?tokenId=${tokenIds.join(',')}`)
      .then(async (response) => await response.json())
      .then(({ data }) => data);
  } catch (e) {
    console.warn('Failed to load selected parcel Metadata via API', e);
  }
}

export async function fetchParcelImageData(parcelId: string, size: string | number) {
  return await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/realm/map/load?map=citaadel&format=rgba-buffer-integers&parcel=${parcelId},${size}`,
  )
    .then(async (response) => await response.json())
    .then((data) => data);
}

export async function fetchUserFavParcels(userAddress: string): Promise<{ data: string[] | undefined }> {
  return await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/favorite/parcel/list?address=${userAddress}`)
    .then(async (response) => await response.json())
    .then((data) => data);
}

export async function fetchItemStoreAvilable(): Promise<{ [id: string]: number }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/realm/item-store/available`)
      .then(async (response) => await response.json())
      .then((data) => data);
    return res.data;
  } catch (e) {
    console.warn('@fetchItemStoreAvilable API call, faild to fetch ItemShop supply! ', e);
  }
}

export async function fetchChannelSigniture(params) {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/realm/alchemica/signature/channel/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(async (response) => await response.json())
      .then((data) => data);
    return r;
  } catch (error) {
    console.log('@fetchChannelSigniture: err', error);
  }
}
export async function fetchEquipSigniture(params) {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/realm/installation/signature/equip/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(async (response) => await response.json())
      .then((data) => Object.values(data));
    return r;
  } catch (error) {
    console.log('@fetchEquipSigniture: err', error);
  }
}

export async function fetchUpgrade(params) {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/realm/installation/signature/upgrade/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(async (response) => await response.json())
      .then((data) => Object.values(data));
    return r;
  } catch (error) {
    console.log('@fetchUpgrade: err', error);
  }
}

export async function fetchSpeedup(params) {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/realm/installation/signature/speedup/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(async (response) => await response.json())
      .then((data) => Object.values(data));
    return r;
  } catch (error) {
    console.log('@fetchSpeedup: err', error);
  }
}
