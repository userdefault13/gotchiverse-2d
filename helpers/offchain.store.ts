/**
 * Session memory store for PoC Waall/Lodge inventory + placements.
 * - Reads: always memory (after hydrate)
 * - Writes: memory + localStorage mirror + debounced PUT /api/offchain
 * - Never called from pointer-move / brush hover paths
 */

import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';

export type OffchainState = {
  inventory: Record<string, number>;
  placements: Record<string, string[]>;
};

const LEGACY_WAALL_INV = 'gotchiverse.waall.inventory.v1';
const LEGACY_LODGE_INV = 'gotchiverse.lodge.inventory.v1';
const LEGACY_PLACEMENTS = 'gotchiverse.offchain.placements.v1';
const FLUSH_MS = 1500;

/** Waall 162–170 + Lodge 171–179 — keep inline to avoid circular imports with lodge.helper. */
function isOffchainInstallationId(id: string): boolean {
  try {
    const itemId = Number(String(id).split('_')[1]);
    return itemId >= 162 && itemId <= 179;
  } catch {
    return false;
  }
}

let wallet: string | null = null;
let state: OffchainState = { inventory: {}, placements: {} };
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushInFlight: Promise<void> | null = null;
let dirty = false;

function normalizeWallet(raw: string | null | undefined): string | null {
  const w = String(raw || '')
    .trim()
    .toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(w)) return null;
  return w;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    return (JSON.parse(localStorage.getItem(key) || '') as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private mode
  }
}

/** Split inventory into legacy per-type keys for offline mirror. */
function mirrorLocalStorage(next: OffchainState) {
  const waall: Record<string, number> = {};
  const lodge: Record<string, number> = {};
  for (const [id, qty] of Object.entries(next.inventory)) {
    const n = Number(id);
    if (n >= 162 && n <= 170) waall[id] = qty;
    else if (n >= 171 && n <= 179) lodge[id] = qty;
  }
  writeJson(LEGACY_WAALL_INV, waall);
  writeJson(LEGACY_LODGE_INV, lodge);
  writeJson(LEGACY_PLACEMENTS, next.placements);
}

function seedFromLocalStorage(): OffchainState {
  const waall = readJson<Record<string, number>>(LEGACY_WAALL_INV, {});
  const lodge = readJson<Record<string, number>>(LEGACY_LODGE_INV, {});
  const placements = readJson<Record<string, string[]>>(LEGACY_PLACEMENTS, {});
  return {
    inventory: { ...waall, ...lodge },
    placements: placements || {},
  };
}

function scheduleFlush() {
  dirty = true;
  mirrorLocalStorage(state);
  if (typeof window === 'undefined' || !wallet) return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushOffchainStore();
  }, FLUSH_MS);
}

export function getOffchainWallet(): string | null {
  return wallet;
}

export function isOffchainHydrated(): boolean {
  return hydrated;
}

export function getOffchainInventory(): Record<string, number> {
  return { ...state.inventory };
}

export function getOffchainInventoryQty(itemId: number): number {
  return Number(state.inventory[String(itemId)] || 0);
}

export function setOffchainInventoryQty(itemId: number, quantity: number): number {
  const next = Math.max(0, Math.floor(Number(quantity) || 0));
  if (next <= 0) delete state.inventory[String(itemId)];
  else state.inventory[String(itemId)] = next;
  scheduleFlush();
  return next;
}

export function adjustOffchainInventoryQty(itemId: number, delta: number): number {
  const cur = getOffchainInventoryQty(itemId);
  return setOffchainInventoryQty(itemId, cur + delta);
}

export function getOffchainPlacements(parcelId: string): string[] {
  if (!parcelId) return [];
  return (state.placements[parcelId] || []).filter(isOffchainInstallationId);
}

export function writeOffchainPlacements(parcelId: string, ids: string[]) {
  if (!parcelId) return;
  const next = ids.filter(isOffchainInstallationId);
  if (!next.length) delete state.placements[parcelId];
  else state.placements[parcelId] = next;
  scheduleFlush();
}

export function upsertOffchainPlacement(installationId: string) {
  if (!isOffchainInstallationId(installationId)) return;
  const data = getInstallationIdDataById(installationId);
  if (!data?.parcelId) return;
  const next = getOffchainPlacements(data.parcelId).filter((id) => {
    if (id === installationId) return false;
    const other = getInstallationIdDataById(id);
    return !(other.position.x === data.position.x && other.position.y === data.position.y);
  });
  next.push(installationId);
  writeOffchainPlacements(data.parcelId, next);
}

export function removeOffchainPlacement(installationId: string) {
  if (!installationId) return;
  try {
    const data = getInstallationIdDataById(installationId);
    if (!data?.parcelId) return;
    writeOffchainPlacements(
      data.parcelId,
      getOffchainPlacements(data.parcelId).filter((id) => id !== installationId),
    );
  } catch {
    // ignore
  }
}

/**
 * Load wallet state once per session. Prefer Mongo; seed from localStorage on miss/error.
 */
export async function hydrateOffchainStore(account: string | null | undefined): Promise<void> {
  const nextWallet = normalizeWallet(account);
  if (!nextWallet) return;
  if (wallet === nextWallet && hydrated) return;
  if (hydratePromise && wallet === nextWallet) return hydratePromise;

  wallet = nextWallet;
  hydrated = false;
  hydratePromise = (async () => {
    let loaded: OffchainState | null = null;
    try {
      const res = await fetch(`/api/offchain?wallet=${encodeURIComponent(nextWallet)}`, {
        headers: {
          Accept: 'application/json',
          'x-wallet-address': nextWallet,
        },
      });
      const json = await res.json();
      if (res.ok && json?.ok && json.doc) {
        loaded = {
          inventory: json.doc.inventory || {},
          placements: json.doc.placements || {},
        };
      }
    } catch (e) {
      console.warn('[offchain.store] hydrate fetch failed, using localStorage', e);
    }

    if (!loaded || (!Object.keys(loaded.inventory).length && !Object.keys(loaded.placements).length)) {
      const seeded = seedFromLocalStorage();
      // Prefer remote non-empty; else local seed.
      if (!loaded) loaded = seeded;
      else if (!Object.keys(loaded.inventory).length && !Object.keys(loaded.placements).length) {
        loaded = seeded;
        // Push seed to mongo when we have local data and remote was empty.
        if (Object.keys(seeded.inventory).length || Object.keys(seeded.placements).length) {
          state = loaded;
          dirty = true;
        }
      }
    }

    state = {
      inventory: { ...(loaded?.inventory || {}) },
      placements: { ...(loaded?.placements || {}) },
    };
    mirrorLocalStorage(state);
    hydrated = true;
    if (dirty) scheduleFlush();
  })().finally(() => {
    hydratePromise = null;
  });

  return hydratePromise;
}

/** Immediate flush (batch confirm / leave build). Safe to call often — coalesces in-flight. */
export async function flushOffchainStore(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!wallet || !dirty) return;
  if (flushInFlight) return flushInFlight;

  const snapshot: OffchainState = {
    inventory: { ...state.inventory },
    placements: { ...state.placements },
  };
  const w = wallet;
  dirty = false;
  mirrorLocalStorage(snapshot);

  flushInFlight = (async () => {
    try {
      const res = await fetch('/api/offchain', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-wallet-address': w,
        },
        body: JSON.stringify({
          wallet: w,
          inventory: snapshot.inventory,
          placements: snapshot.placements,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        // Keep local mirror; mark dirty so a later flush retries when proxy is up.
        if (json?.configured !== false) {
          dirty = true;
          console.warn('[offchain.store] flush failed', json?.error || res.status);
        }
      }
    } catch (e) {
      dirty = true;
      console.warn('[offchain.store] flush error', e);
    }
  })().finally(() => {
    flushInFlight = null;
  });

  return flushInFlight;
}
