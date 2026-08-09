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
    const base = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_COLYSEUS_URL || '').replace(/\/$/, '');
    if (!base) return { leaderboard: [], gotchis: [] };
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      sortBy: sort || 'kills',
      sortType: dir || 'desc',
    });
    if (filter && filter.length) params.set('filterBy', filter);
    const response = await fetch(`${base}/leaderboard/all?${params.toString()}`);
    if (!response.ok) return { leaderboard: [], gotchis: [] };
    return await response.json();
  } catch (e) {
    console.warn('Failed to load leaderboard all via API', e);
    return { leaderboard: [], gotchis: [] };
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
    const { getRealmUrlSync, resolveRealmBaseUrl, realmFetchHeaders } = await import('helpers/realm.url');
    let base = getRealmUrlSync();
    if (!base) {
      try {
        base = await resolveRealmBaseUrl();
      } catch {
        base = String(process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      }
    }
    if (!base) {
      console.warn('@fetchChannelSigniture: no REALM URL configured');
      return undefined;
    }

    const response = await fetch(`${base}/realm/alchemica/signature/channel/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...realmFetchHeaders(base),
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      console.warn('@fetchChannelSigniture: HTTP', response.status);
      return undefined;
    }
    const data = await response.json();
    if (typeof data?.signature === 'string' && data.signature.startsWith('0x')) {
      return data;
    }
    if (typeof data === 'string' && data.startsWith('0x')) {
      return { signature: data };
    }
    return data;
  } catch (error) {
    console.log('@fetchChannelSigniture: err', error);
  }
}
export async function fetchEquipSigniture(params) {
  try {
    const { getRealmUrlSync, resolveRealmBaseUrl, realmFetchHeaders } = await import('helpers/realm.url');
    let base = getRealmUrlSync();
    if (!base) {
      try {
        base = await resolveRealmBaseUrl();
      } catch {
        base = String(process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      }
    }
    if (!base) {
      console.warn('@fetchEquipSigniture: no REALM URL configured');
      return undefined;
    }

    const response = await fetch(`${base}/realm/installation/signature/equip/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...realmFetchHeaders(base),
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      console.warn('@fetchEquipSigniture: HTTP', response.status);
      return undefined;
    }
    const data = await response.json();
    // Prefer an explicit signature field; fall back to legacy Object.values payload.
    if (typeof data?.signature === 'string' && data.signature.startsWith('0x')) {
      return data.signature;
    }
    if (typeof data === 'string' && data.startsWith('0x')) {
      return data;
    }
    const values = Object.values(data || {});
    if (values.length === 1 && typeof values[0] === 'string' && values[0].startsWith('0x')) {
      return values[0];
    }
    // Legacy polygon signer returned a byte-map / fragmented payload.
    if (values.length > 1) {
      return values as any;
    }
    return undefined;
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
