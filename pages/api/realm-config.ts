import type { NextApiRequest, NextApiResponse } from 'next';

type RealmConfig = {
  url: string;
  colyseusUrl: string;
  urls: string[];
  source?: string;
  updatedAt?: string;
};

function normalize(url: string | undefined | null): string {
  return String(url || '')
    .trim()
    .replace(/\/$/, '');
}

function unique(urls: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const url = normalize(raw);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

async function readEdgeConfig(): Promise<Partial<RealmConfig> | null> {
  const conn = process.env.EDGE_CONFIG;
  if (!conn) return null;
  try {
    const parsed = new URL(conn);
    const id = parsed.pathname.replace(/^\//, '');
    const token = parsed.searchParams.get('token');
    if (!id || !token) return null;

    const headers = { Authorization: `Bearer ${token}` };
    const [urlRes, urlsRes, updatedRes] = await Promise.all([
      fetch(`https://edge-config.vercel.com/${id}/item/url`, { headers, cache: 'no-store' }),
      fetch(`https://edge-config.vercel.com/${id}/item/urls`, { headers, cache: 'no-store' }),
      fetch(`https://edge-config.vercel.com/${id}/item/updatedAt`, { headers, cache: 'no-store' }),
    ]);

    const url = urlRes.ok ? normalize(JSON.parse(await urlRes.text())) : '';
    const urlsRaw = urlsRes.ok ? JSON.parse(await urlsRes.text()) : [];
    const updatedAt = updatedRes.ok ? String(JSON.parse(await updatedRes.text()) || '') : undefined;
    const urls = unique([url, ...(Array.isArray(urlsRaw) ? urlsRaw : [])]);
    if (!urls.length) return null;
    return { url: urls[0], urls, updatedAt, source: 'edge-config' };
  } catch (e) {
    console.warn('realm-config edge-config read failed', e);
    return null;
  }
}

function envFallback(): RealmConfig {
  const primary = normalize(process.env.REALM_UPSTREAM_URL || process.env.NEXT_PUBLIC_API_URL);
  const extras = String(process.env.REALM_FALLBACK_URLS || process.env.NEXT_PUBLIC_REALM_URLS || '')
    .split(',')
    .map((s) => normalize(s))
    .filter(Boolean);
  const urls = unique([primary, ...extras]);
  return {
    url: urls[0] || '',
    colyseusUrl: urls[0] || '',
    urls,
    source: 'env',
  };
}

/**
 * Runtime REALM endpoint discovery.
 * Prefers Vercel Edge Config (updated by the tunnel watchdog without redeploy),
 * then falls back to env baked at build time.
 */
export default async function handler(_req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const fromEdge = await readEdgeConfig();
  const fallback = envFallback();
  const urls = unique([...(fromEdge?.urls || []), ...fallback.urls]);
  const url = normalize(fromEdge?.url) || fallback.url || urls[0] || '';

  res.status(200).json({
    url,
    colyseusUrl: url,
    urls,
    source: fromEdge?.source || fallback.source,
    updatedAt: fromEdge?.updatedAt,
  } satisfies RealmConfig);
}
