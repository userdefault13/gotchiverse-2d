/**
 * Runtime REALM URL resolution for ephemeral smoke tunnels.
 * Probes candidates (smoke JSON → API config → env) so Enter keeps working
 * when localhost.run / cloudflared URLs rotate without a FE rebuild.
 */

const SMOKE_URL_JSON =
  process.env.NEXT_PUBLIC_REALM_SMOKE_JSON ||
  'https://raw.githubusercontent.com/userdefault13/gotchiverse-2d/cursor/vercel-colyseus-mvp-9c04/docs/realm-smoke-url.json';

let cachedUrl: string | null = null;
let resolveInflight: Promise<string> | null = null;

function normalizeUrl(url: string | undefined | null): string {
  return String(url || '')
    .trim()
    .replace(/\/$/, '');
}

function uniqueUrls(urls: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const url = normalizeUrl(raw);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function envCandidates(): string[] {
  const list = String(process.env.NEXT_PUBLIC_REALM_URLS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return uniqueUrls([
    ...list,
    process.env.NEXT_PUBLIC_COLYSEUS_URL,
    process.env.NEXT_PUBLIC_API_URL,
    typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:2567' : '',
  ]);
}

function probeHeaders(url: string): HeadersInit {
  // localtunnel interstitial blocks browsers unless this header is present.
  if (url.includes('loca.lt')) {
    return { 'Bypass-Tunnel-Reminder': 'true' };
  }
  return {};
}

async function fetchJsonUrls(url: string): Promise<string[]> {
  try {
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      cache: 'no-store',
      mode: 'cors',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { url?: string; urls?: string[]; colyseusUrl?: string };
    return uniqueUrls([data.url, data.colyseusUrl, ...(data.urls || [])]);
  } catch {
    return [];
  }
}

async function probeHealthy(url: string, timeoutMs = 4500): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    // Prefer same-origin proxy in the browser so preview CORS misconfig cannot block Enter.
    const probeUrl =
      typeof window !== 'undefined'
        ? `/api/realm-health?url=${encodeURIComponent(url)}`
        : `${url}/health`;

    const res = await fetch(probeUrl, {
      signal: ctrl.signal,
      cache: 'no-store',
      mode: typeof window !== 'undefined' ? 'same-origin' : 'cors',
      headers: typeof window !== 'undefined' ? {} : probeHeaders(url),
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const body = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    return body?.ok !== false;
  } catch {
    return false;
  }
}

/** Extra headers for REALM HTTP calls (e.g. localtunnel bypass). */
export function realmFetchHeaders(url?: string): HeadersInit {
  return probeHeaders(url || getRealmUrlSync());
}

/** Last known-good URL (may be empty before first resolve). */
export function getRealmUrlSync(): string {
  return cachedUrl || normalizeUrl(process.env.NEXT_PUBLIC_API_URL) || normalizeUrl(process.env.NEXT_PUBLIC_COLYSEUS_URL);
}

/** Force a later resolve (e.g. after connect failure). */
export function clearRealmUrlCache(): void {
  cachedUrl = null;
}

/**
 * Resolve a live REALM base URL (HTTPS, no trailing slash).
 * Prefers cached healthy URL, then smoke JSON /api/realm-config / env candidates.
 */
export async function resolveRealmBaseUrl(force = false): Promise<string> {
  if (!force && cachedUrl) {
    if (await probeHealthy(cachedUrl, 2500)) return cachedUrl;
    cachedUrl = null;
  }
  if (resolveInflight) return resolveInflight;

  resolveInflight = (async () => {
    // Prefer /api/realm-config first — it reads live Edge Config (no redeploy).
    const candidates = uniqueUrls([
      ...(typeof window !== 'undefined' ? await fetchJsonUrls('/api/realm-config') : []),
      ...(await fetchJsonUrls(SMOKE_URL_JSON)),
      ...envCandidates(),
    ]);

    if (!candidates.length) {
      throw new Error('No REALM URL candidates configured');
    }

    // Probe sequentially in priority order so a fresh LHR wins over stale CF.
    for (const url of candidates) {
      if (await probeHealthy(url)) {
        cachedUrl = url;
        return url;
      }
    }
    throw new Error(`REALM unreachable (tried ${candidates.join(', ')})`);
  })();

  try {
    return await resolveInflight;
  } finally {
    resolveInflight = null;
  }
}
