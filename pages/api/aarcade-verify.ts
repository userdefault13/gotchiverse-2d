import type { NextApiRequest, NextApiResponse } from 'next';

type AarcadeVerifyResponse = {
  wallet: string;
  verified: boolean;
  discordLinked: boolean;
  inAavegotchiGuild: boolean;
  checkedAt?: string | null;
  stale?: boolean;
};

type CacheEntry = {
  body: AarcadeVerifyResponse;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function normalizeWallet(raw: unknown): string | null {
  const wallet = String(raw || '')
    .trim()
    .toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) return null;
  return wallet;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = normalizeWallet(req.query.wallet);
  if (!wallet) {
    return res.status(400).json({ error: 'Invalid wallet', verified: false });
  }

  const verifyUrl = String(process.env.AARCADE_VERIFY_URL || 'https://aarcadeghst.com/api/gotchiverse-verify').replace(
    /\/$/,
    '',
  );
  const secret = String(process.env.AARCADE_VERIFY_SECRET || '').trim();
  if (!secret) {
    console.warn('aarcade-verify: AARCADE_VERIFY_SECRET is not set');
    return res.status(503).json({ error: 'Verification not configured', verified: false });
  }

  const fresh = String(req.query.fresh || '') === '1' || String(req.query.fresh || '') === 'true';
  const cached = cache.get(wallet);
  if (!fresh && cached && cached.expiresAt > Date.now()) {
    return res.status(200).json(cached.body);
  }

  try {
    const url = `${verifyUrl}?wallet=${encodeURIComponent(wallet)}`;
    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
        'x-verify-secret': secret,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const payload = (await upstream.json().catch(() => null)) as AarcadeVerifyResponse | { error?: string } | null;

    if (!upstream.ok) {
      console.warn('aarcade-verify: upstream error', upstream.status, payload);
      return res.status(upstream.status === 401 ? 502 : upstream.status).json({
        error: (payload as { error?: string })?.error || 'Upstream verification failed',
        verified: false,
      });
    }

    const body: AarcadeVerifyResponse = {
      wallet,
      verified: Boolean((payload as AarcadeVerifyResponse)?.verified),
      discordLinked: Boolean((payload as AarcadeVerifyResponse)?.discordLinked),
      inAavegotchiGuild: Boolean((payload as AarcadeVerifyResponse)?.inAavegotchiGuild),
      checkedAt: (payload as AarcadeVerifyResponse)?.checkedAt ?? null,
      stale: Boolean((payload as AarcadeVerifyResponse)?.stale),
    };

    cache.set(wallet, { body, expiresAt: Date.now() + CACHE_TTL_MS });
    return res.status(200).json(body);
  } catch (err) {
    console.warn('aarcade-verify: fetch failed', err);
    return res.status(502).json({ error: 'Verification request failed', verified: false });
  }
}
