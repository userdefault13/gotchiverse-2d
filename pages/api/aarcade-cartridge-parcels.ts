import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_GAME_ID = 'gotchiverse-base';
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

/** cPaarcels are Base soft-launch only. */
function assertBaseParcelsGame(gameId: string): string | null {
  if (gameId !== 'gotchiverse-base') {
    return 'cPaarcels are only available on Base (gotchiverse-base)';
  }
  return null;
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

type ParcelImportItem = {
  realmTokenId: string;
  installations?: Array<Record<string, unknown>>;
};

type InstallationImportItem = {
  itemTypeId: number;
  kind?: string;
  balanceIndex?: number;
  sourceRealmTokenId?: string;
  x?: number;
  y?: number;
  name?: string;
  installationType?: number;
};

function parseParcels(body: Record<string, unknown>): ParcelImportItem[] {
  const raw = body.parcels;
  if (!Array.isArray(raw)) {
    const single = String(body.realmTokenId || '').trim();
    if (/^\d+$/.test(single)) {
      return [{ realmTokenId: single, installations: Array.isArray(body.installations) ? body.installations : undefined }];
    }
    return [];
  }
  const out: ParcelImportItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const realmTokenId = String(item.realmTokenId || '').trim();
    if (!/^\d+$/.test(realmTokenId)) continue;
    out.push({
      realmTokenId,
      installations: Array.isArray(item.installations) ? (item.installations as Array<Record<string, unknown>>) : undefined,
    });
  }
  return out;
}

function parseInstallations(body: Record<string, unknown>): InstallationImportItem[] {
  const raw = body.installations;
  if (!Array.isArray(raw)) return [];
  const out: InstallationImportItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const itemTypeId = Number(item.itemTypeId);
    if (!Number.isFinite(itemTypeId) || itemTypeId <= 0) continue;
    out.push({
      itemTypeId,
      kind: item.kind != null ? String(item.kind) : undefined,
      balanceIndex: item.balanceIndex != null ? Number(item.balanceIndex) : undefined,
      sourceRealmTokenId: item.sourceRealmTokenId != null ? String(item.sourceRealmTokenId) : undefined,
      x: item.x != null ? Number(item.x) : undefined,
      y: item.y != null ? Number(item.y) : undefined,
      name: item.name != null ? String(item.name) : undefined,
      installationType: item.installationType != null ? Number(item.installationType) : undefined,
    });
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
        parcelInventory: Array.isArray(payload?.parcelInventory) ? payload.parcelInventory : [],
        installationInventory: Array.isArray(payload?.installationInventory) ? payload.installationInventory : [],
        cartridge: payload,
      });
    } catch (err) {
      console.warn('aarcade-cartridge-parcels GET failed', err);
      return res.status(502).json({ error: 'Parcels lookup failed' });
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
  const gameErr = assertBaseParcelsGame(gameId);
  if (gameErr) {
    return res.status(403).json({ error: gameErr, code: 'PARCELS_DISABLED' });
  }

  const mode = String(req.body?.mode || 'parcels').toLowerCase() === 'installations' ? 'installations' : 'parcels';
  const parcels = mode === 'parcels' ? parseParcels(req.body || {}) : [];
  const installations = mode === 'installations' ? parseInstallations(req.body || {}) : [];
  if (mode === 'parcels' && parcels.length === 0) {
    return res.status(400).json({ error: 'No parcels to import', code: 'EMPTY_PARCELS' });
  }
  if (mode === 'installations' && installations.length === 0) {
    return res.status(400).json({ error: 'No installations to import', code: 'EMPTY_INSTALLATIONS' });
  }
  const simPay = req.body?.simPay !== false;

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

    let imported = 0;
    let alreadyMinted = 0;

    if (mode === 'parcels') {
      const failed: Array<{ realmTokenId: string; error: string; code?: string }> = [];
      for (const parcel of parcels) {
        const upstream = await fetch(
          `${simBase()}/cartridges/${encodeURIComponent(cartridgeId)}/parcels/import`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              realmTokenId: parcel.realmTokenId,
              // Nested equipped installs — Aarcade nestEquippedAll snapshots these onto the cPaarcel.
              installations: parcel.installations,
              sessionToken: session.sessionToken,
              simPay,
            }),
            cache: 'no-store',
          },
        );
        const payload = await readJson(upstream);
        if (!upstream.ok) {
          failed.push({
            realmTokenId: parcel.realmTokenId,
            error: String(payload?.error || `Failed importing parcel #${parcel.realmTokenId}`),
            code: payload?.code ? String(payload.code) : 'IMPORT_FAILED',
          });
          // Soft-launch: skip not-owned / already-bad rows so one rented parcel
          // does not abort the rest of the cart.
          continue;
        }
        lastCartridge = payload;
        if (payload?.alreadyMinted) alreadyMinted += 1;
        else imported += 1;
      }

      if (imported === 0 && alreadyMinted === 0 && failed.length > 0) {
        return res.status(failed[0]?.code === 'PARCEL_NOT_OWNED' ? 403 : 502).json({
          error: failed[0]?.error || 'Failed importing parcels',
          code: failed[0]?.code || 'IMPORT_FAILED',
          cartridgeId,
          imported: 0,
          alreadyMinted: 0,
          failed,
          parcelInventory: Array.isArray(lastCartridge?.parcelInventory) ? lastCartridge.parcelInventory : [],
          installationInventory: Array.isArray(lastCartridge?.installationInventory)
            ? lastCartridge.installationInventory
            : [],
        });
      }

      return res.status(imported > 0 ? 201 : 200).json({
        ok: true,
        cartridgeId,
        imported,
        alreadyMinted,
        failed: failed.length ? failed : undefined,
        parcelInventory: Array.isArray(lastCartridge?.parcelInventory) ? lastCartridge.parcelInventory : [],
        installationInventory: Array.isArray(lastCartridge?.installationInventory)
          ? lastCartridge.installationInventory
          : [],
        cartridge: lastCartridge,
      });
    } else {
      const failed: Array<{ itemTypeId: number; error: string; code?: string }> = [];
      for (const inst of installations) {
        const upstream = await fetch(
          `${simBase()}/cartridges/${encodeURIComponent(cartridgeId)}/installations/import`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              ...inst,
              sessionToken: session.sessionToken,
              simPay,
            }),
            cache: 'no-store',
          },
        );
        const payload = await readJson(upstream);
        if (!upstream.ok) {
          failed.push({
            itemTypeId: inst.itemTypeId,
            error: String(payload?.error || `Failed importing installation ${inst.itemTypeId}`),
            code: payload?.code ? String(payload.code) : 'IMPORT_FAILED',
          });
          continue;
        }
        lastCartridge = payload;
        if (payload?.alreadyMinted) alreadyMinted += 1;
        else imported += 1;
      }

      if (imported === 0 && alreadyMinted === 0 && failed.length > 0) {
        return res.status(failed[0]?.code === 'INSTALLATION_NOT_OWNED' || failed[0]?.code === 'PARCEL_NOT_OWNED' ? 403 : 502).json({
          error: failed[0]?.error || 'Failed importing installations',
          code: failed[0]?.code || 'IMPORT_FAILED',
          cartridgeId,
          imported: 0,
          alreadyMinted: 0,
          failed,
          parcelInventory: Array.isArray(lastCartridge?.parcelInventory) ? lastCartridge.parcelInventory : [],
          installationInventory: Array.isArray(lastCartridge?.installationInventory)
            ? lastCartridge.installationInventory
            : [],
        });
      }

      return res.status(imported > 0 ? 201 : 200).json({
        ok: true,
        cartridgeId,
        imported,
        alreadyMinted,
        failed: failed.length ? failed : undefined,
        parcelInventory: Array.isArray(lastCartridge?.parcelInventory) ? lastCartridge.parcelInventory : [],
        installationInventory: Array.isArray(lastCartridge?.installationInventory)
          ? lastCartridge.installationInventory
          : [],
        cartridge: lastCartridge,
      });
    }
  } catch (err) {
    console.warn('aarcade-cartridge-parcels POST failed', err);
    return res.status(502).json({ error: 'Parcels import failed' });
  }
}
