import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Read-only proxy for the Aarcade RH weekly stock tournament API (public routes only).
 *   GET /api/aarcade-rh-tourney?path=status
 *   GET /api/aarcade-rh-tourney?path=weeks/current
 *   GET /api/aarcade-rh-tourney?path=weeks/<weekKey>/standings
 *   GET /api/aarcade-rh-tourney?path=players/<wallet>/status
 * Admin / realm routes are never proxied from the game client.
 */
const DEFAULT_RH_TOURNEY_URL = 'https://aarcadeghst.com/api/rh-tourney';
const ALLOWED = /^(status|weeks(\/[A-Za-z0-9_-]+(\/(standings|inventory))?)?|players\/0x[0-9a-fA-F]{40}\/status)$/;

function base(): string {
  return String(process.env.AARCADE_RH_TOURNEY_URL || DEFAULT_RH_TOURNEY_URL).replace(/\/$/, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const path = String(req.query.path || '')
    .split('/')
    .filter(Boolean)
    .join('/');
  if (!ALLOWED.test(path)) return res.status(400).json({ error: 'path not allowed' });
  const qs = new URLSearchParams();
  if (req.query.limit) qs.set('limit', String(req.query.limit));
  const url = `${base()}/${path}${qs.toString() ? `?${qs}` : ''}`;
  try {
    const upstream = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || payload?.ok === false) {
      return res.status(upstream.status || 502).json({ error: payload?.error || 'Tournament lookup failed' });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(payload?.data ?? payload);
  } catch (err) {
    console.warn('aarcade-rh-tourney GET failed', err);
    return res.status(502).json({ error: 'Tournament lookup failed' });
  }
}
