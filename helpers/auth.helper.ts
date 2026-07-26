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

const AARCADE_CARTRIDGE_GAME_ID = (
  process.env.NEXT_PUBLIC_AARCADE_CARTRIDGE_GAME_ID || 'gotchiverse'
).toLowerCase();

/** Aarcade Games catalog (mint / buy cartridge). */
export const getAarcadeGamesCatalogUrl = (): string => `${AARCADE_HOME}/games`;

/**
 * Look up Aarcade cartridge-sim ownership for this wallet via Gotchiverse proxy.
 * Soft launch: does not gate play; used for identity + catalog CTA.
 */
export const getAarcadeCartridgeStatus = async (
  address: string,
  opts?: { fresh?: boolean; gameId?: string },
): Promise<AarcadeCartridgeStatus | null> => {
  try {
    if (!address) return null;
    const qs = new URLSearchParams({
      wallet: address,
      gameId: String(opts?.gameId || AARCADE_CARTRIDGE_GAME_ID),
    });
    if (opts?.fresh) qs.set('fresh', '1');
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
      gameId: String(data?.gameId || AARCADE_CARTRIDGE_GAME_ID),
      hasCartridge: Boolean(data?.hasCartridge),
      cartridgeId: data?.cartridgeId ? String(data.cartridgeId) : null,
      heroes: normalizeCartridgeHeroes(data?.heroes),
      activeCAavegotchiId: data?.activeCAavegotchiId ? String(data.activeCAavegotchiId) : null,
      catalogUrl: String(data?.catalogUrl || getAarcadeGamesCatalogUrl()),
      checkedAt: data?.checkedAt ?? null,
    };
  } catch (err) {
    console.warn('getAarcadeCartridgeStatus failed', err);
    return null;
  }
};

export type AarcadeCartridgeMintResult = {
  ok: boolean;
  phase?: 'ensure' | 'bind';
  alreadyBound?: boolean;
  wallet: string;
  gameId: string;
  collateral?: string;
  cartridgeId: string;
  hasCartridge: boolean;
  heroes?: import('helpers/cartridgeHero.helper').CartridgeHero[];
  cartridge?: unknown;
  error?: string;
  code?: string;
};

type MintPhase = 'ensure' | 'bind';

async function postAarcadeCartridgeMint(
  address: string,
  body: Record<string, unknown>,
): Promise<AarcadeCartridgeMintResult> {
  if (!address) {
    return {
      ok: false,
      wallet: '',
      gameId: AARCADE_CARTRIDGE_GAME_ID,
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
        gameId: AARCADE_CARTRIDGE_GAME_ID,
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
        gameId: String(data?.gameId || AARCADE_CARTRIDGE_GAME_ID),
        collateral: data?.collateral ? String(data.collateral) : undefined,
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
      gameId: String(data?.gameId || AARCADE_CARTRIDGE_GAME_ID),
      collateral: data?.collateral ? String(data.collateral) : undefined,
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
      gameId: AARCADE_CARTRIDGE_GAME_ID,
      cartridgeId: '',
      hasCartridge: false,
      error: 'Mint request failed',
      code: 'MINT_FAILED',
    };
  }
}

/** Step 1: free cartridge ensure (session → cartridges/ensure). */
export const ensureAarcadeCartridge = async (address: string): Promise<AarcadeCartridgeMintResult> =>
  postAarcadeCartridgeMint(address, { phase: 'ensure' });

/**
 * Step 2: bind starter cAavegotchi.
 * `collateral` accepts gallery names (aDAI, amWETH, …); server maps to sim ids.
 */
export const bindAarcadeStarter = async (
  address: string,
  collateral: string,
): Promise<AarcadeCartridgeMintResult> =>
  postAarcadeCartridgeMint(address, { phase: 'bind', collateral });
