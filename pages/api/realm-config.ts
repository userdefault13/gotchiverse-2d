import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Runtime REALM endpoint discovery for the Colyseus MVP.
 * Server-only REALM_UPSTREAM_URL can be rotated without baking into the client bundle
 * (still requires a deployment that includes the updated env). Prefer docs/realm-smoke-url.json
 * for zero-redeploy tunnel URL updates via the watchdog.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse): void {
  const primary = String(process.env.REALM_UPSTREAM_URL || process.env.NEXT_PUBLIC_API_URL || '')
    .trim()
    .replace(/\/$/, '');
  const extras = String(process.env.REALM_FALLBACK_URLS || process.env.NEXT_PUBLIC_REALM_URLS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const urls = Array.from(new Set([primary, ...extras].filter(Boolean)));

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    url: urls[0] || '',
    colyseusUrl: urls[0] || '',
    urls,
  });
}
