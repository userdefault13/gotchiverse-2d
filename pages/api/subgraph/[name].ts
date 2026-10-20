import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Same-origin passthrough to the Aarcade subgraph edge (subgraph.aarcadeghst.com).
 * aarcadeghst.com/api/subgraph/* rejects unauthenticated browsers since Aarcade PR #46, and
 * the edge only trusts X-Subgraph-Proxy-Key, so the browser posts here and the key
 * (SUBGRAPH_PROXY_SECRET) stays server-side — same pattern as Aarcade's own Vercel functions.
 */
const DEFAULT_EDGE_BASE = 'https://subgraph.aarcadeghst.com/subgraphs/name';
const MAX_QUERY_LENGTH = 20000;

const ALLOWED_SUBGRAPHS = new Set([
  'aavegotchi-core-base',
  'gotchiverse-base',
  'aavegotchi-svg-base',
  'aavegotchi-gbm-baazaar-base',
]);

function upstreamUrl(name: string): string {
  const base = String(process.env.SUBGRAPH_EDGE_URL || DEFAULT_EDGE_BASE).replace(/\/$/, '');
  return `${base}/${name}`;
}

/** Only serve our own pages; blocks other sites from borrowing the server-side key. */
function isSameSiteRequest(req: NextApiRequest): boolean {
  const host = String(req.headers.host || '').toLowerCase();
  const source = String(req.headers.origin || req.headers.referer || '');
  if (!source) return false;
  try {
    return new URL(source).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    res.status(405).json({ errors: [{ message: 'method_not_allowed' }] });
    return;
  }

  const name = String(req.query.name || '').trim();
  if (!ALLOWED_SUBGRAPHS.has(name)) {
    res.status(404).json({ errors: [{ message: `Unknown subgraph: ${name || '(missing)'}` }] });
    return;
  }

  if (!isSameSiteRequest(req)) {
    res.status(403).json({ errors: [{ message: 'forbidden' }] });
    return;
  }

  const proxyKey = String(process.env.SUBGRAPH_PROXY_SECRET || '').trim();
  if (!proxyKey) {
    console.error('[subgraph] SUBGRAPH_PROXY_SECRET is not set');
    res.status(503).json({ errors: [{ message: 'Subgraph proxy is not configured' }] });
    return;
  }

  const body = (typeof req.body === 'object' && req.body) || {};
  const { query, variables, operationName } = body as Record<string, unknown>;
  if (typeof query !== 'string' || !query || query.length > MAX_QUERY_LENGTH) {
    res.status(400).json({ errors: [{ message: 'Missing or invalid query' }] });
    return;
  }

  try {
    const upstream = await fetch(upstreamUrl(name), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Subgraph-Proxy-Key': proxyKey,
      },
      body: JSON.stringify({ query, variables, operationName }),
      cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    });
    const json = await upstream.json().catch(() => null);
    if (!json) {
      res.status(502).json({ errors: [{ message: `Subgraph upstream returned HTTP ${upstream.status}` }] });
      return;
    }
    res.status(upstream.status).json(json);
  } catch (err) {
    console.error('[subgraph]', name, (err as Error)?.message || err);
    res.status(502).json({ errors: [{ message: 'Subgraph proxy error' }] });
  }
}
