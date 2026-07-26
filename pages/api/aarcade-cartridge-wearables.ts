import type { NextApiRequest, NextApiResponse } from 'next';

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

function simBase(): string {
  return String(process.env.AARCADE_CARTRIDGE_SIM_URL || DEFAULT_CARTRIDGE_SIM_URL).replace(/\/$/, '');
}

function sessionUrl(): string {
  const aarcadeHome = String(process.env.NEXT_PUBLIC_AARCADE_HOME || DEFAULT_AARCADE_HOME).replace(/\/$/, '');
  return String(process.env.AARCADE_GAME_SESSION_URL || `${aarcadeHome}/api/game-session`).replace(/\/$/, '');
}

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
}

async function createSession(
  gameId: string,
  wallet: string,
): Promise<{ sessionToken: string | null; error?: string; status?: number }> {
  const res = await fetch(sessionUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ gameType: gameId, walletAddress: wallet }),
    cache: 'no-store',
  });
  const body = await readJson(res);
  if (!res.ok) {
    return {
      sessionToken: null,
      status: res.status,
      error: String(body?.error || 'Failed to create Aarcade game session'),
    };
  }
  const sessionToken = String(body?.sessionToken || '').trim();
  if (!sessionToken) {
    return { sessionToken: null, status: 502, error: 'game-session returned no sessionToken' };
  }
  return { sessionToken };
}

async function ensureCartridge(
  wallet: string,
  gameId: string,
  sessionToken: string,
): Promise<{ cartridgeId: string | null; cartridge: Record<string, unknown> | null; error?: string; status?: number }> {
  const ensureRes = await fetch(`${simBase()}/cartridges/ensure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ owner: wallet, gameId, sessionToken, simPay: true }),
    cache: 'no-store',
  });
  const ensureBody = await readJson(ensureRes);
  if (!ensureRes.ok) {
    return {
      cartridgeId: null,
      cartridge: null,
      status: ensureRes.status,
      error: String(ensureBody?.error || 'Failed to ensure cartridge'),
    };
  }
  const cartridgeId = String(ensureBody?.cartridgeId || '').trim();
  if (!cartridgeId) {
    return { cartridgeId: null, cartridge: null, status: 502, error: 'ensure returned no cartridgeId' };
  }
  return { cartridgeId, cartridge: ensureBody };
}

type ImportItem = { itemTypeId: number; slotIndex: number };

function parseImportItems(body: Record<string, unknown>): ImportItem[] {
  const raw = body.items;
  if (!Array.isArray(raw)) return [];
  const out: ImportItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const itemTypeId = Number(item.itemTypeId);
    const slotIndex = Number(item.slotIndex);
    if (!Number.isFinite(itemTypeId) || itemTypeId <= 0) continue;
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 15) continue;
    out.push({ itemTypeId, slotIndex });
  }
  return out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const wallet = normalizeWallet(req.query.wallet);
    const cartridgeId = String(req.query.cartridgeId || '').trim();
    if (!wallet || !cartridgeId) {
      return res.status(400).json({ error: 'wallet and cartridgeId required' });
    }
    try {
      const upstream = await fetch(`${simBase()}/cartridges/${encodeURIComponent(cartridgeId)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const payload = await readJson(upstream);
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: payload?.error || 'Lookup failed' });
      }
      const owner = String(payload?.owner || '').toLowerCase();
      if (owner && owner !== wallet) {
        return res.status(403).json({ error: 'Cartridge not owned by wallet' });
      }
      return res.status(200).json({
        ok: true,
        wallet,
        cartridgeId,
        wearableInventory: Array.isArray(payload?.wearableInventory) ? payload.wearableInventory : [],
        cartridge: payload,
      });
    } catch (err) {
      console.warn('aarcade-cartridge-wearables GET failed', err);
      return res.status(502).json({ error: 'Wearables lookup failed' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = normalizeWallet(req.body?.wallet);
  if (!wallet) {
    return res.status(400).json({ error: 'Invalid wallet' });
  }

  const gameId = normalizeGameId(req.body?.gameId || process.env.NEXT_PUBLIC_AARCADE_CARTRIDGE_GAME_ID);
  const sourceTokenId = String(req.body?.sourceTokenId || '').trim();
  if (!/^\d+$/.test(sourceTokenId)) {
    return res.status(400).json({ error: 'Invalid sourceTokenId', code: 'INVALID_SOURCE_TOKEN' });
  }
  const bindKind = String(req.body?.bindKind || 'owned').toLowerCase() === 'rental' ? 'rental' : 'owned';
  const items = parseImportItems(req.body || {});
  if (items.length === 0) {
    return res.status(400).json({ error: 'No wearables to import', code: 'EMPTY_ITEMS' });
  }
  const simPay = req.body?.simPay !== false;
  const equipAfterImport = req.body?.equipAfterImport === true;
  const heroId = String(req.body?.heroId || '').trim();
  if (equipAfterImport && !heroId) {
    return res.status(400).json({ error: 'heroId required when equipAfterImport', code: 'HERO_REQUIRED' });
  }

  try {
    const session = await createSession(gameId, wallet);
    if (!session.sessionToken) {
      return res.status(session.status === 400 ? 400 : 502).json({
        error: session.error || 'Failed to create Aarcade game session',
        code: 'SESSION_FAILED',
      });
    }

    let cartridgeId = String(req.body?.cartridgeId || '').trim();
    let lastCartridge: Record<string, unknown> | null = null;
    if (!cartridgeId) {
      const ensured = await ensureCartridge(wallet, gameId, session.sessionToken);
      if (!ensured.cartridgeId) {
        return res.status(ensured.status && ensured.status >= 400 && ensured.status < 500 ? ensured.status : 502).json({
          error: ensured.error || 'Failed to ensure cartridge',
          code: 'ENSURE_FAILED',
        });
      }
      cartridgeId = ensured.cartridgeId;
      lastCartridge = ensured.cartridge;
    }

    const minted: unknown[] = [];
    let alreadyMinted = 0;
    let imported = 0;
    let equipped = 0;

    for (const item of items) {
      const importRes = await fetch(
        `${simBase()}/cartridges/${encodeURIComponent(cartridgeId)}/wearables/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            sourceTokenId,
            itemTypeId: item.itemTypeId,
            slotIndex: item.slotIndex,
            bindKind,
            sessionToken: session.sessionToken,
            simPay,
          }),
          cache: 'no-store',
        },
      );
      const importBody = await readJson(importRes);
      if (!importRes.ok) {
        console.warn('aarcade-cartridge-wearables: import failed', importRes.status, importBody);
        return res.status(importRes.status >= 400 && importRes.status < 500 ? importRes.status : 502).json({
          error: String(importBody?.error || `Failed importing item ${item.itemTypeId}`),
          code: String(importBody?.code || 'IMPORT_FAILED'),
          cartridgeId,
          imported,
          alreadyMinted,
          equipped,
          minted,
          wearableInventory: Array.isArray(lastCartridge?.wearableInventory)
            ? lastCartridge.wearableInventory
            : [],
        });
      }
      lastCartridge = importBody;
      if (importBody?.alreadyMinted) alreadyMinted += 1;
      else imported += 1;
      if (importBody?.minted) minted.push(importBody.minted);
    }

    if (equipAfterImport && heroId) {
      const selectRes = await fetch(
        `${simBase()}/cartridges/${encodeURIComponent(cartridgeId)}/select-hero`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ cAavegotchiId: heroId, sessionToken: session.sessionToken }),
          cache: 'no-store',
        },
      );
      const selectBody = await readJson(selectRes);
      if (!selectRes.ok) {
        return res.status(selectRes.status >= 400 && selectRes.status < 500 ? selectRes.status : 502).json({
          error: String(selectBody?.error || 'Failed selecting hero for equip'),
          code: String(selectBody?.code || 'SELECT_HERO_FAILED'),
          cartridgeId,
          imported,
          alreadyMinted,
          equipped,
          minted,
          wearableInventory: Array.isArray(lastCartridge?.wearableInventory)
            ? lastCartridge.wearableInventory
            : [],
        });
      }
      lastCartridge = selectBody;

      for (const row of minted) {
        if (!row || typeof row !== 'object') continue;
        const w = row as Record<string, unknown>;
        const cWearableId = String(w.id || '').trim();
        if (!cWearableId) continue;
        // Skip if already on this hero.
        if (w.equippedTo != null && String(w.equippedTo) === heroId) {
          equipped += 1;
          continue;
        }
        const slotIndex = Number(w.slotIndex);
        const equipRes = await fetch(
          `${simBase()}/cartridges/${encodeURIComponent(cartridgeId)}/wearables/equip`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              cWearableId,
              slotIndex: Number.isInteger(slotIndex) ? slotIndex : undefined,
              sessionToken: session.sessionToken,
            }),
            cache: 'no-store',
          },
        );
        const equipBody = await readJson(equipRes);
        if (!equipRes.ok) {
          console.warn('aarcade-cartridge-wearables: equip failed', equipRes.status, equipBody);
          return res.status(equipRes.status >= 400 && equipRes.status < 500 ? equipRes.status : 502).json({
            error: String(equipBody?.error || `Failed equipping ${cWearableId}`),
            code: String(equipBody?.code || 'EQUIP_FAILED'),
            cartridgeId,
            imported,
            alreadyMinted,
            equipped,
            minted,
            wearableInventory: Array.isArray(lastCartridge?.wearableInventory)
              ? lastCartridge.wearableInventory
              : [],
          });
        }
        lastCartridge = equipBody;
        equipped += 1;
      }
    }

    return res.status(200).json({
      ok: true,
      wallet,
      gameId,
      cartridgeId,
      bindKind,
      sourceTokenId,
      imported,
      alreadyMinted,
      equipped,
      minted,
      wearableInventory: Array.isArray(lastCartridge?.wearableInventory)
        ? lastCartridge.wearableInventory
        : [],
      cartridge: lastCartridge,
    });
  } catch (err) {
    console.warn('aarcade-cartridge-wearables POST failed', err);
    return res.status(502).json({ error: 'Wearables import failed', code: 'IMPORT_FAILED' });
  }
}
