/**
 * Thin home Mongo op client — POST https://mongo-api…/v1/op (Bearer + JSON).
 * Same contract as AarcadeGh-t/lib/mongoProxyClient.cjs; plain JSON is enough for string/_id docs.
 */

export type MongoProxyOpRequest = {
  collection: string;
  op: string;
  args?: unknown[];
  options?: Record<string, unknown>;
  cursor?: Record<string, unknown>;
};

function proxyBaseUrl(): string {
  return String(process.env.MONGO_PROXY_URL || '')
    .trim()
    .replace(/\/$/, '');
}

function proxySecret(): string {
  return String(process.env.MONGO_PROXY_SECRET || '').trim();
}

export function isMongoProxyConfigured(): boolean {
  return Boolean(proxyBaseUrl() && proxySecret());
}

export function getMongoDbName(): string {
  return String(process.env.MONGO_DB_NAME || 'Aarcadeghst').trim();
}

export async function proxyOp<T = unknown>(req: MongoProxyOpRequest): Promise<T> {
  const base = proxyBaseUrl();
  if (!base) throw new Error('MONGO_PROXY_URL is not set');
  const secret = proxySecret();
  if (!secret) throw new Error('MONGO_PROXY_SECRET is not set');

  const timeoutMs = Number(process.env.MONGO_PROXY_TIMEOUT_MS || 15000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${base}/v1/op`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        db: getMongoDbName(),
        collection: req.collection,
        op: req.op,
        args: req.args ?? [],
        options: req.options ?? {},
        cursor: req.cursor,
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      const e = new Error(`mongo-proxy timeout after ${timeoutMs}ms (${req.op} ${req.collection})`);
      e.name = 'MongoProxyTimeoutError';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let payload: { ok?: boolean; result?: T; error?: { name?: string; code?: number; message?: string } };
  try {
    payload = JSON.parse(text || '{}');
  } catch {
    throw new Error(`mongo-proxy invalid JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok || !payload.ok) {
    const e = new Error(payload.error?.message || `mongo-proxy error (HTTP ${res.status})`);
    e.name = payload.error?.name || 'MongoProxyError';
    (e as any).code = payload.error?.code;
    (e as any).statusCode = res.status;
    throw e;
  }

  return payload.result as T;
}

export const OFFCHAIN_COLLECTION = 'gotchiverse_offchain';
