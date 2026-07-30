import _ from 'lodash';
import installationTypes from 'shared_code/data/installationsCatalog';
import { InstallationTypeLocal, Recipe } from 'types';

/** Soft-launch Broadcaster TV — lodge furniture only (itemId 209). */
export const BROADCASTER_ITEM_ID = 209;
export const BROADCASTER_SPRITE_KEY = 'broadcaster';
export const BROADCASTER_INSTALLATION_TYPE = 10;

const ALLOWED_HOSTS = new Set([
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
  'platform.twitter.com',
  'publish.twitter.com',
]);

export function isBroadcasterItemId(itemId: number | string): boolean {
  return Number(itemId) === BROADCASTER_ITEM_ID;
}

function toRecipe(item: InstallationTypeLocal): Recipe {
  const cost = item.alchemicaCost || [0, 0, 0, 0];
  return {
    id: item.itemId,
    name: item.name,
    ingredients: {
      fud: Number(cost[0] || 0),
      fomo: Number(cost[1] || 0),
      alpha: Number(cost[2] || 0),
      kek: Number(cost[3] || 0),
    },
    craftingTime: Number(item.craftTime || 0),
    itemType: Number(item.installationType),
    type: 'INSTALLATION' as const,
    installationType: Number(item.installationType),
    deprecated: false,
    level: Number(item.level) || 1,
    endDate: undefined,
  };
}

export function getLocalBroadcasterRecipes(): Recipe[] {
  return _.values(installationTypes)
    .filter((item) => isBroadcasterItemId(item.itemId) && Number(item.level) === 1)
    .map(toRecipe);
}

export type XStreamParseResult = {
  ok: boolean;
  message: string;
  /** Canonical watch / open URL on X. */
  watchUrl?: string;
  /** Best-effort iframe embed URL (may still be blocked by X). */
  embedUrl?: string;
};

/** Normalize pasted X/Twitter live or broadcast URLs for modal use. */
export function parseXStreamUrl(raw: string): XStreamParseResult {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return { ok: false, message: 'Paste an X live / broadcast URL' };
  }

  let url: URL;
  try {
    url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, message: 'Invalid URL' };
  }

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return { ok: false, message: 'Only x.com / twitter.com links are allowed' };
  }

  // Force https
  url.protocol = 'https:';

  const path = url.pathname;
  const watchUrl = url.toString();

  // Broadcast: /i/broadcasts/{id}
  const broadcastMatch = path.match(/\/i\/broadcasts\/([A-Za-z0-9_-]+)/i);
  if (broadcastMatch) {
    const id = broadcastMatch[1];
    return {
      ok: true,
      message: 'ok',
      watchUrl: `https://x.com/i/broadcasts/${id}`,
      embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(id)}`,
    };
  }

  // Spaces: /i/spaces/{id} — embed usually fails; still allow open-on-X
  const spacesMatch = path.match(/\/i\/spaces\/([A-Za-z0-9_-]+)/i);
  if (spacesMatch) {
    const id = spacesMatch[1];
    return {
      ok: true,
      message: 'ok',
      watchUrl: `https://x.com/i/spaces/${id}`,
      // Spaces rarely iframe; leave embed empty so UI shows fallback
      embedUrl: undefined,
    };
  }

  // Status / video tweet: /user/status/{id}
  const statusMatch = path.match(/\/status(?:es)?\/(\d+)/i);
  if (statusMatch) {
    const id = statusMatch[1];
    return {
      ok: true,
      message: 'ok',
      watchUrl,
      embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(id)}`,
    };
  }

  // Generic profile / live page — open on X only
  return {
    ok: true,
    message: 'ok',
    watchUrl,
    embedUrl: undefined,
  };
}

export function sanitizeStoredStreamUrl(raw: string | undefined | null): string {
  const parsed = parseXStreamUrl(String(raw || ''));
  return parsed.ok && parsed.watchUrl ? parsed.watchUrl : '';
}
