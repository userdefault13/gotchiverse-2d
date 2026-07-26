import { toast } from 'react-toastify';
import Router from 'next/router';

/** @deprecated Prefer Aarcade Discord connect — kept for legacy callback routes. */
export const oauthLink = process.env.OAUTH_LINK;

const AARCADE_HOME = (process.env.NEXT_PUBLIC_AARCADE_HOME || 'https://aarcadeghst.com').replace(/\/$/, '');

/** Open Aarcade profile Discord OAuth (wallet must be linked there). */
export const getAarcadeDiscordConnectUrl = (wallet?: string): string => {
  const address = String(wallet || '').trim();
  if (!address) return `${AARCADE_HOME}`;
  // Aarcade only accepts relative returnTo paths on aarcadeghst.com.
  const returnTo = `/player/${address}?discord=linked`;
  return `${AARCADE_HOME}/api/profile-discord-oauth/start?wallet=${encodeURIComponent(address)}&returnTo=${encodeURIComponent(
    returnTo,
  )}`;
};

export const getAarcadeProfileUrl = (wallet?: string): string => {
  const address = String(wallet || '').trim();
  if (!address) return AARCADE_HOME;
  return `${AARCADE_HOME}/player/${address}`;
};

export const postAuthUnlink = async (code: string | string[]): Promise<boolean> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/discord/unlink`, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
      method: 'POST',
    });
    const responseData = await response.json();
    const errorMessage = responseData?.error?.message;
    const successMessage = responseData?.message;
    const link = responseData?.link;
    if (errorMessage) {
      toast.warn(errorMessage, {
        theme: 'dark',
        autoClose: false,
        closeButton: true,
      });
    } else if (successMessage) {
      toast.info(successMessage, {
        theme: 'dark',
        autoClose: false,
        closeButton: true,
        onClose: !link ? null : async () => await Router.push(link),
      });
    }
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export const postAuthValidation = async (address: string, code: string | string[]): Promise<boolean> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/discord/validate`, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, code }),
      method: 'POST',
    });
    const responseData = await response.json();
    const errorMessage = responseData?.error?.message;
    const successMessage = responseData?.message;
    const link = responseData?.link;
    if (errorMessage) {
      toast.warn(errorMessage, {
        theme: 'dark',
        autoClose: false,
        closeButton: true,
      });
    } else if (successMessage) {
      toast.info(successMessage, {
        theme: 'dark',
        autoClose: false,
        closeButton: true,
        onClose: !link ? null : async () => await Router.push(link),
      });
    }
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export type AarcadeVerifyStatus = {
  verified: boolean;
  discordLinked: boolean;
  inAavegotchiGuild: boolean;
  checkedAt?: string | null;
  stale?: boolean;
};

/**
 * Check Aarcade verification (discordLinked && inAavegotchiGuild)
 * via Gotchiverse server proxy — secret never reaches the browser.
 */
export const getAarcadeVerifyStatus = async (
  address: string,
  opts?: { fresh?: boolean },
): Promise<AarcadeVerifyStatus | null> => {
  try {
    if (!address) return null;
    const qs = new URLSearchParams({ wallet: address });
    if (opts?.fresh) qs.set('fresh', '1');
    const response = await fetch(`/api/aarcade-verify?${qs.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      verified: Boolean(data?.verified),
      discordLinked: Boolean(data?.discordLinked),
      inAavegotchiGuild: Boolean(data?.inAavegotchiGuild),
      checkedAt: data?.checkedAt ?? null,
      stale: Boolean(data?.stale),
    };
  } catch (err) {
    console.warn('getAarcadeVerifyStatus failed', err);
    return null;
  }
};

export const getIsValidated = async (address: string, opts?: { fresh?: boolean }): Promise<boolean> => {
  const status = await getAarcadeVerifyStatus(address, opts);
  return Boolean(status?.verified);
};

export type AarcadeCartridgeStatus = {
  wallet: string;
  gameId: string;
  hasCartridge: boolean;
  cartridgeId: string | null;
  heroes: import('helpers/cartridgeHero.helper').CartridgeHero[];
  activeCAavegotchiId?: string | null;
  catalogUrl: string;
  checkedAt?: string | null;
};

/** Aarcade Games catalog (mint / buy cartridge). */
export const getAarcadeGamesCatalogUrl = (): string => `${AARCADE_HOME}/games`;

async function fetchCartridgeStatusForGameId(
  address: string,
  gameId: string,
  fresh?: boolean,
): Promise<AarcadeCartridgeStatus | null> {
  const qs = new URLSearchParams({ wallet: address, gameId });
  if (fresh) qs.set('fresh', '1');
  const response = await fetch(`/api/aarcade-cartridge?${qs.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const data = await response.json();
  const { normalizeCartridgeHeroes } = await import('helpers/cartridgeHero.helper');
  return {
    wallet: String(data?.wallet || address).toLowerCase(),
    gameId: String(data?.gameId || gameId),
    hasCartridge: Boolean(data?.hasCartridge),
    cartridgeId: data?.cartridgeId ? String(data.cartridgeId) : null,
    heroes: normalizeCartridgeHeroes(data?.heroes),
    activeCAavegotchiId: data?.activeCAavegotchiId ? String(data.activeCAavegotchiId) : null,
    catalogUrl: String(data?.catalogUrl || getAarcadeGamesCatalogUrl()),
    checkedAt: data?.checkedAt ?? null,
  };
}

/**
 * Look up Aarcade cartridge-sim ownership for this wallet via Gotchiverse proxy.
 * Scoped by chain: Base (`gotchiverse-base`) vs RH (`gotchiverse-rh`).
 * Soft launch: does not gate play; used for identity + catalog CTA.
 */
export const getAarcadeCartridgeStatus = async (
  address: string,
  opts?: { fresh?: boolean; gameId?: string; network?: string | null },
): Promise<AarcadeCartridgeStatus | null> => {
  try {
    if (!address) return null;
    const { cartridgeGameIdForNetwork, cartridgeLegacyGameIdForNetwork } = await import(
      'helpers/cartridgeGameId'
    );
    const gameId = String(opts?.gameId || cartridgeGameIdForNetwork(opts?.network));
    const primary = await fetchCartridgeStatusForGameId(address, gameId, opts?.fresh);
    if (primary?.hasCartridge && primary.cartridgeId) return primary;

    // RH soft-launch mints lived under bare `gotchiverse` — accept on RH only.
    const legacyId = opts?.gameId
      ? null
      : cartridgeLegacyGameIdForNetwork(opts?.network);
    if (legacyId && legacyId !== gameId) {
      const legacy = await fetchCartridgeStatusForGameId(address, legacyId, opts?.fresh);
      if (legacy?.hasCartridge && legacy.cartridgeId) return legacy;
    }

    return (
      primary || {
        wallet: String(address).toLowerCase(),
        gameId,
        hasCartridge: false,
        cartridgeId: null,
        heroes: [],
        activeCAavegotchiId: null,
        catalogUrl: getAarcadeGamesCatalogUrl(),
        checkedAt: null,
      }
    );
  } catch (err) {
    console.warn('getAarcadeCartridgeStatus failed', err);
    return null;
  }
};

export type AarcadeCartridgeMintResult = {
  ok: boolean;
  phase?: 'ensure' | 'bind' | 'bind-owned' | 'bind-rental';
  alreadyBound?: boolean;
  wallet: string;
  gameId: string;
  collateral?: string;
  sourceTokenId?: string;
  cartridgeId: string;
  hasCartridge: boolean;
  heroes?: import('helpers/cartridgeHero.helper').CartridgeHero[];
  cartridge?: unknown;
  error?: string;
  code?: string;
};

type MintPhase = 'ensure' | 'bind' | 'bind-owned' | 'bind-rental';

async function postAarcadeCartridgeMint(
  address: string,
  body: Record<string, unknown>,
  opts?: { network?: string | null; gameId?: string },
): Promise<AarcadeCartridgeMintResult> {
  const { cartridgeGameIdForNetwork } = await import('helpers/cartridgeGameId');
  const gameId = String(opts?.gameId || cartridgeGameIdForNetwork(opts?.network));
  if (!address) {
    return {
      ok: false,
      wallet: '',
      gameId,
      cartridgeId: '',
      hasCartridge: false,
      error: 'Wallet required',
      code: 'NO_WALLET',
    };
  }
  try {
    const response = await fetch('/api/aarcade-cartridge-mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        wallet: address,
        gameId,
        simPay: true,
        ...body,
      }),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        phase: body.phase as MintPhase | undefined,
        wallet: String(address).toLowerCase(),
        gameId: String(data?.gameId || gameId),
        collateral: data?.collateral ? String(data.collateral) : undefined,
        sourceTokenId: data?.sourceTokenId ? String(data.sourceTokenId) : undefined,
        cartridgeId: data?.cartridgeId ? String(data.cartridgeId) : '',
        hasCartridge: false,
        error: String(data?.error || 'Mint failed'),
        code: data?.code ? String(data.code) : 'MINT_FAILED',
      };
    }
    const { heroesFromCartridgeSnapshot } = await import('helpers/cartridgeHero.helper');
    return {
      ok: true,
      phase: (data?.phase as MintPhase) || (body.phase as MintPhase),
      alreadyBound: Boolean(data?.alreadyBound),
      wallet: String(data?.wallet || address).toLowerCase(),
      gameId: String(data?.gameId || gameId),
      collateral: data?.collateral ? String(data.collateral) : undefined,
      sourceTokenId: data?.sourceTokenId ? String(data.sourceTokenId) : undefined,
      cartridgeId: String(data?.cartridgeId || ''),
      hasCartridge: Boolean(data?.hasCartridge ?? data?.cartridgeId),
      heroes: heroesFromCartridgeSnapshot(data?.cartridge),
      cartridge: data?.cartridge,
    };
  } catch (err) {
    console.warn('postAarcadeCartridgeMint failed', err);
    return {
      ok: false,
      phase: body.phase as MintPhase | undefined,
      wallet: String(address).toLowerCase(),
      gameId,
      cartridgeId: '',
      hasCartridge: false,
      error: 'Mint request failed',
      code: 'MINT_FAILED',
    };
  }
}

/** Step 1: free cartridge ensure (session → cartridges/ensure). */
export const ensureAarcadeCartridge = async (
  address: string,
  opts?: { network?: string | null; gameId?: string },
): Promise<AarcadeCartridgeMintResult> =>
  postAarcadeCartridgeMint(address, { phase: 'ensure' }, opts);

/**
 * Step 2: bind starter cAavegotchi.
 * `collateral` accepts gallery names (aDAI, amWETH, …); server maps to sim ids.
 */
export const bindAarcadeStarter = async (
  address: string,
  collateral: string,
  opts?: { network?: string | null; gameId?: string },
): Promise<AarcadeCartridgeMintResult> =>
  postAarcadeCartridgeMint(address, { phase: 'bind', collateral }, opts);

/** Bind an owned L1 gotchi as a cAavegotchi (`bind-owned`). Free for owners (simPay). */
export const bindAarcadeOwnedGotchi = async (
  address: string,
  sourceTokenId: string,
  collateral: string,
  opts?: { network?: string | null; gameId?: string },
): Promise<AarcadeCartridgeMintResult> =>
  postAarcadeCartridgeMint(
    address,
    { phase: 'bind-owned', sourceTokenId, collateral },
    opts,
  );

/** Bind a borrowed L1 gotchi as a cAavegotchi (`bind-rental`). Free for borrowers (simPay). */
export const bindAarcadeRentalGotchi = async (
  address: string,
  sourceTokenId: string,
  collateral: string,
  opts?: { network?: string | null; gameId?: string },
): Promise<AarcadeCartridgeMintResult> =>
  postAarcadeCartridgeMint(
    address,
    { phase: 'bind-rental', sourceTokenId, collateral },
    opts,
  );

export type AarcadeWearablesResult = {
  ok: boolean;
  wallet: string;
  cartridgeId: string;
  wearableInventory: import('helpers/cartridgeWearable.helper').CWearable[];
  imported?: number;
  alreadyMinted?: number;
  equipped?: number;
  error?: string;
  code?: string;
};

/** Load cWearable inventory for a cartridge. */
export const getCartridgeWearables = async (
  address: string,
  cartridgeId: string,
): Promise<AarcadeWearablesResult> => {
  const wallet = String(address || '').toLowerCase();
  const id = String(cartridgeId || '').trim();
  if (!wallet || !id) {
    return { ok: false, wallet, cartridgeId: id, wearableInventory: [], error: 'wallet and cartridgeId required' };
  }
  try {
    const qs = new URLSearchParams({ wallet, cartridgeId: id });
    const response = await fetch(`/api/aarcade-cartridge-wearables?${qs.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    const { normalizeCWearables } = await import('helpers/cartridgeWearable.helper');
    if (!response.ok) {
      return {
        ok: false,
        wallet,
        cartridgeId: id,
        wearableInventory: [],
        error: String(data?.error || 'Wearables lookup failed'),
        code: data?.code ? String(data.code) : 'LOOKUP_FAILED',
      };
    }
    return {
      ok: true,
      wallet,
      cartridgeId: id,
      wearableInventory: normalizeCWearables(data?.wearableInventory),
    };
  } catch (err) {
    console.warn('getCartridgeWearables failed', err);
    return { ok: false, wallet, cartridgeId: id, wearableInventory: [], error: 'Wearables lookup failed' };
  }
};

/** Import selected L1 equipped wearables onto the cartridge as cWearables. */
export const importCartridgeWearables = async (
  address: string,
  opts: {
    sourceTokenId: string;
    items: { itemTypeId: number; slotIndex: number }[];
    bindKind: 'owned' | 'rental';
    cartridgeId?: string | null;
    network?: string | null;
    gameId?: string;
    /** After import, select hero and equip each minted cWearable. */
    equipAfterImport?: boolean;
    heroId?: string | null;
  },
): Promise<AarcadeWearablesResult> => {
  const { cartridgeGameIdForNetwork } = await import('helpers/cartridgeGameId');
  const gameId = String(opts.gameId || cartridgeGameIdForNetwork(opts.network));
  const wallet = String(address || '').toLowerCase();
  if (!wallet) {
    return { ok: false, wallet: '', cartridgeId: '', wearableInventory: [], error: 'Wallet required' };
  }
  try {
    const response = await fetch('/api/aarcade-cartridge-wearables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        wallet,
        gameId,
        cartridgeId: opts.cartridgeId || undefined,
        sourceTokenId: opts.sourceTokenId,
        bindKind: opts.bindKind,
        items: opts.items,
        simPay: true,
        equipAfterImport: opts.equipAfterImport === true,
        heroId: opts.heroId || undefined,
      }),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    const { normalizeCWearables, wearablesFromCartridgeSnapshot } = await import(
      'helpers/cartridgeWearable.helper'
    );
    const inventory =
      normalizeCWearables(data?.wearableInventory).length > 0
        ? normalizeCWearables(data?.wearableInventory)
        : wearablesFromCartridgeSnapshot(data?.cartridge);
    if (!response.ok) {
      return {
        ok: false,
        wallet,
        cartridgeId: String(data?.cartridgeId || opts.cartridgeId || ''),
        wearableInventory: inventory,
        imported: Number(data?.imported) || 0,
        alreadyMinted: Number(data?.alreadyMinted) || 0,
        equipped: Number(data?.equipped) || 0,
        error: String(data?.error || 'Import failed'),
        code: data?.code ? String(data.code) : 'IMPORT_FAILED',
      };
    }
    return {
      ok: true,
      wallet,
      cartridgeId: String(data?.cartridgeId || opts.cartridgeId || ''),
      wearableInventory: inventory,
      imported: Number(data?.imported) || 0,
      alreadyMinted: Number(data?.alreadyMinted) || 0,
      equipped: Number(data?.equipped) || 0,
    };
  } catch (err) {
    console.warn('importCartridgeWearables failed', err);
    return {
      ok: false,
      wallet,
      cartridgeId: String(opts.cartridgeId || ''),
      wearableInventory: [],
      error: 'Import request failed',
      code: 'IMPORT_FAILED',
    };
  }
};
