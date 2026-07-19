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
