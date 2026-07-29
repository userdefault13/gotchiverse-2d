import type { NextApiRequest, NextApiResponse } from 'next';
import { traitNumber } from 'helpers/composeGotchi';

type CartridgeRecord = {
  cartridgeId?: string;
  gameId?: string;
  owner?: string;
  [key: string]: unknown;
};

type CartridgeHeroRow = {
  id: string;
  bindType?: string;
  collateral: string;
  templateId?: string;
  sourceTokenId?: string;
  traits?: number[];
  equippedWearables?: number[];
  level?: number;
  kinship?: number;
  experience?: number;
};

type AarcadeCartridgeResponse = {
  wallet: string;
  gameId: string;
  hasCartridge: boolean;
  cartridgeId: string | null;
  heroes: CartridgeHeroRow[];
  activeCAavegotchiId: string | null;
  cartridges: CartridgeRecord[];
  catalogUrl: string;
  checkedAt: string;
};

function extractHeroes(match: CartridgeRecord | null): {
  heroes: CartridgeHeroRow[];
  activeCAavegotchiId: string | null;
} {
  if (!match) return { heroes: [], activeCAavegotchiId: null };
  const roster = Array.isArray(match.cAavegotchis)
    ? match.cAavegotchis
    : match.cAavegotchi
    ? [match.cAavegotchi]
    : [];
  const heroes: CartridgeHeroRow[] = [];
  for (const raw of roster) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const id = String(row.id || '').trim();
    const collateral =
      String(row.collateral || '')
        .trim()
        .toLowerCase() || 'dai';
    if (!id) continue;
    const traits = Array.isArray(row.traits)
      ? row.traits.map((n) => traitNumber(n, 50)).slice(0, 6)
      : [50, 50, 50, 50, 50, 50];
    const equippedWearables = Array.isArray(row.equippedWearables)
      ? row.equippedWearables.map((n) => Number(n) || 0).slice(0, 16)
      : undefined;
    heroes.push({
      id,
      bindType: row.bindType ? String(row.bindType) : undefined,
      collateral,
      templateId: row.templateId ? String(row.templateId) : undefined,
      sourceTokenId: row.sourceTokenId != null ? String(row.sourceTokenId) : undefined,
      traits,
      equippedWearables,
      level: Number(row.level) || 1,
      kinship: Number(row.kinship) || 0,
      experience: Number(row.experience) || 0,
    });
  }
  const activeCAavegotchiId = match.activeCAavegotchiId
    ? String(match.activeCAavegotchiId)
    : heroes[0]?.id || null;
  return { heroes, activeCAavegotchiId };
}

type CacheEntry = {
  body: AarcadeCartridgeResponse;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_GAME_ID = 'gotchiverse';
const DEFAULT_CARTRIDGE_SIM_URL = 'https://aarcadeghst.com/api/cartridge-sim';
const DEFAULT_AARCADE_HOME = 'https://aarcadeghst.com';

function normalizeWallet(raw: unknown): string | null {
  const wallet = String(raw || '')
    .trim()
    .toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) return null;
  return wallet;
}

function normalizeGameId(raw: unknown): string {
  const gameId = String(raw || DEFAULT_GAME_ID)
    .trim()
    .toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(gameId) ? gameId : DEFAULT_GAME_ID;
}

function cacheKey(wallet: string, gameId: string): string {
  return `${wallet}:${gameId}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = normalizeWallet(req.query.wallet);
  if (!wallet) {
    return res.status(400).json({ error: 'Invalid wallet', hasCartridge: false });
  }

  const gameId = normalizeGameId(req.query.gameId);
  const simBase = String(process.env.AARCADE_CARTRIDGE_SIM_URL || DEFAULT_CARTRIDGE_SIM_URL).replace(/\/$/, '');
  const aarcadeHome = String(process.env.NEXT_PUBLIC_AARCADE_HOME || DEFAULT_AARCADE_HOME).replace(/\/$/, '');
  const catalogUrl = `${aarcadeHome}/games`;

  const fresh = String(req.query.fresh || '') === '1' || String(req.query.fresh || '') === 'true';
  const key = cacheKey(wallet, gameId);
  const cached = cache.get(key);
  if (!fresh && cached && cached.expiresAt > Date.now()) {
    return res.status(200).json(cached.body);
  }

  try {
    const url = `${simBase}/cartridges?owner=${encodeURIComponent(wallet)}&gameId=${encodeURIComponent(gameId)}`;
    const upstream = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    const payload = (await upstream.json().catch(() => null)) as
      | { cartridges?: CartridgeRecord[]; error?: string }
      | null;

    if (!upstream.ok) {
      console.warn('aarcade-cartridge: upstream error', upstream.status, payload);
      return res.status(upstream.status === 404 ? 502 : upstream.status).json({
        error: payload?.error || 'Upstream cartridge lookup failed',
        hasCartridge: false,
        wallet,
        gameId,
        catalogUrl,
      });
    }

    const cartridges = Array.isArray(payload?.cartridges) ? payload.cartridges : [];
    // Never fall back to another gameId's cartridge (Base vs RH must stay separate).
    const match =
      cartridges.find((c) => String(c?.gameId || '').toLowerCase() === gameId) || null;
    const cartridgeId = match?.cartridgeId ? String(match.cartridgeId) : null;
    const { heroes, activeCAavegotchiId } = extractHeroes(match);

    const body: AarcadeCartridgeResponse = {
      wallet,
      gameId,
      hasCartridge: Boolean(cartridgeId),
      cartridgeId,
      heroes,
      activeCAavegotchiId,
      cartridges,
      catalogUrl,
      checkedAt: new Date().toISOString(),
    };

    cache.set(key, { body, expiresAt: Date.now() + CACHE_TTL_MS });
    return res.status(200).json(body);
  } catch (err) {
    console.warn('aarcade-cartridge: fetch failed', err);
    return res.status(502).json({
      error: 'Cartridge request failed',
      hasCartridge: false,
      wallet,
      gameId,
      catalogUrl,
    });
  }
}
