import type { NextApiRequest, NextApiResponse } from 'next';
import { isMongoProxyConfigured, OFFCHAIN_COLLECTION, proxyOp } from 'lib/mongoProxy';

export type OffchainDoc = {
  _id: string;
  inventory: Record<string, number>;
  placements: Record<string, string[]>;
  updatedAt: string;
};

function normalizeWallet(raw: unknown): string | null {
  const wallet = String(raw || '')
    .trim()
    .toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) return null;
  return wallet;
}

function emptyDoc(wallet: string): OffchainDoc {
  return {
    _id: wallet,
    inventory: {},
    placements: {},
    updatedAt: new Date().toISOString(),
  };
}

function sanitizeInventory(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) continue;
    out[String(k)] = Math.floor(n);
  }
  return out;
}

function sanitizePlacements(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string[]> = {};
  for (const [parcelId, ids] of Object.entries(raw as Record<string, unknown>)) {
    if (!parcelId || !Array.isArray(ids)) continue;
    out[parcelId] = ids.map((id) => String(id)).filter(Boolean);
  }
  return out;
}

/**
 * PoC offchain Waall/Lodge state — one doc per wallet.
 * GET  /api/offchain?wallet=0x…
 * PUT  /api/offchain  body: { wallet, inventory, placements }
 * Header x-wallet-address must match (unsigned PoC auth).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (!isMongoProxyConfigured()) {
    return res.status(503).json({
      ok: false,
      configured: false,
      error: 'Mongo proxy not configured (set MONGO_PROXY_URL + MONGO_PROXY_SECRET)',
    });
  }

  if (req.method === 'GET') {
    const wallet = normalizeWallet(req.query.wallet);
    const headerWallet = normalizeWallet(req.headers['x-wallet-address']);
    if (!wallet) return res.status(400).json({ ok: false, error: 'Invalid wallet' });
    if (!headerWallet || headerWallet !== wallet) {
      return res.status(401).json({ ok: false, error: 'x-wallet-address mismatch' });
    }

    try {
      const doc = await proxyOp<OffchainDoc | null>({
        collection: OFFCHAIN_COLLECTION,
        op: 'findOne',
        args: [{ _id: wallet }],
      });
      return res.status(200).json({
        ok: true,
        configured: true,
        doc: doc
          ? {
              _id: wallet,
              inventory: sanitizeInventory(doc.inventory),
              placements: sanitizePlacements(doc.placements),
              updatedAt: doc.updatedAt || null,
            }
          : emptyDoc(wallet),
      });
    } catch (e: any) {
      console.warn('[api/offchain] GET failed', e?.message || e);
      return res.status(502).json({ ok: false, configured: true, error: e?.message || 'Mongo read failed' });
    }
  }

  if (req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const wallet = normalizeWallet(body.wallet);
    const headerWallet = normalizeWallet(req.headers['x-wallet-address']);
    if (!wallet) return res.status(400).json({ ok: false, error: 'Invalid wallet' });
    if (!headerWallet || headerWallet !== wallet) {
      return res.status(401).json({ ok: false, error: 'x-wallet-address mismatch' });
    }

    const doc: OffchainDoc = {
      _id: wallet,
      inventory: sanitizeInventory(body.inventory),
      placements: sanitizePlacements(body.placements),
      updatedAt: new Date().toISOString(),
    };

    try {
      await proxyOp({
        collection: OFFCHAIN_COLLECTION,
        op: 'replaceOne',
        args: [{ _id: wallet }, doc, { upsert: true }],
      });
      return res.status(200).json({ ok: true, configured: true, updatedAt: doc.updatedAt });
    } catch (e: any) {
      console.warn('[api/offchain] PUT failed', e?.message || e);
      return res.status(502).json({ ok: false, configured: true, error: e?.message || 'Mongo write failed' });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
