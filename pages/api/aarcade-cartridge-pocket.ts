import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_CARTRIDGE_SIM_URL = 'https://aarcadeghst.com/api/cartridge-sim';

function normalizeWallet(raw: unknown): string | null {
  const wallet = String(raw || '')
    .trim()
    .toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) return null;
  return wallet;
}

function simBase(): string {
  return String(process.env.AARCADE_CARTRIDGE_SIM_URL || DEFAULT_CARTRIDGE_SIM_URL).replace(/\/$/, '');
}

function serviceKey(): string {
  return String(process.env.AARCADE_POCKET_CREDIT_SECRET || '').trim();
}

/** GET pocket snapshot / POST SIM withdraw (marks sim_pending). */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const wallet = normalizeWallet(req.method === 'GET' ? req.query.wallet : req.body?.wallet);
  const cartridgeId = String(
    (req.method === 'GET' ? req.query.cartridgeId : req.body?.cartridgeId) || '',
  ).trim();

  if (!wallet || !cartridgeId) {
    return res.status(400).json({ error: 'wallet and cartridgeId required' });
  }

  const base = simBase();

  if (req.method === 'GET') {
    try {
      const upstream = await fetch(`${base}/cartridges/${encodeURIComponent(cartridgeId)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const payload = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: payload?.error || 'Lookup failed' });
      }
      const owner = String(payload?.owner || '').toLowerCase();
      if (owner && owner !== wallet) {
        return res.status(403).json({ error: 'Cartridge not owned by wallet' });
      }
      return res.status(200).json({
        cartridgeId,
        wallet,
        pocket: payload?.pocket || {},
        pendingWithdrawals: payload?.pendingWithdrawals || [],
      });
    } catch (err) {
      console.warn('aarcade-cartridge-pocket GET failed', err);
      return res.status(502).json({ error: 'Pocket lookup failed' });
    }
  }

  if (req.method === 'POST') {
    const key = serviceKey();
    if (!key) {
      return res.status(503).json({
        error: 'Withdraw unavailable — AARCADE_POCKET_CREDIT_SECRET not configured on Gotchiverse',
      });
    }
    const token = String(req.body?.token || 'nvda').toLowerCase();
    const amount = String(req.body?.amount || '').trim();
    if (!amount) {
      return res.status(400).json({ error: 'amount required' });
    }
    try {
      const upstream = await fetch(
        `${base}/cartridges/${encodeURIComponent(cartridgeId)}/pocket/withdraw`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Accept: 'application/json',
            'x-aarcade-service-key': key,
          },
          body: JSON.stringify({ token, amount, owner: wallet }),
        },
      );
      const payload = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        return res.status(upstream.status).json({
          error: payload?.error || 'Withdraw failed',
          code: payload?.code,
        });
      }
      return res.status(200).json(payload);
    } catch (err) {
      console.warn('aarcade-cartridge-pocket POST failed', err);
      return res.status(502).json({ error: 'Withdraw request failed' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
