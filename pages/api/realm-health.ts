import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Same-origin REALM /health proxy so browser discovery is not blocked by CORS.
 * Query: ?url=https://realm.example.com
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const raw = String(req.query.url || '').trim();
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    res.status(400).json({ ok: false, error: 'invalid_url' });
    return;
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    res.status(400).json({ ok: false, error: 'invalid_protocol' });
    return;
  }

  // Disallow obvious SSRF targets (metadata / loopback) except local REALM during dev.
  const host = target.hostname.toLowerCase();
  const isLocal =
    host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local');
  if (!isLocal && (host.endsWith('.internal') || host.startsWith('169.254.') || host === '0.0.0.0')) {
    res.status(400).json({ ok: false, error: 'blocked_host' });
    return;
  }

  const healthUrl = `${target.origin}/health`;
  const headers: Record<string, string> = {};
  if (host.endsWith('loca.lt')) {
    headers['Bypass-Tunnel-Reminder'] = 'true';
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4500);
    const upstream = await fetch(healthUrl, {
      signal: ctrl.signal,
      cache: 'no-store',
      headers,
    });
    clearTimeout(timer);
    const body = (await upstream.json().catch(() => null)) as { ok?: boolean } | null;
    const ok = upstream.ok && body?.ok !== false;
    res.status(ok ? 200 : 502).json({
      ok,
      status: upstream.status,
      url: target.origin,
      body,
    });
  } catch (e) {
    res.status(502).json({
      ok: false,
      url: target.origin,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
