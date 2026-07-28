/** Soft-launch store interior furniture + listing pointers (phase 1b). */

/** Cashier L1–9 (Maaker-style), own spritesheet `cashier`. */
export const CASHIER_ITEM_ID_START = 189;
export const CASHIER_ITEM_ID_END = 197;
/** Level-1 Cashier craft/place id */
export const CASHIER_ITEM_ID = CASHIER_ITEM_ID_START;

/** Shelf L1 only (own spritesheet `shelf`). */
export const SHELF_ITEM_ID = 198;

export const STORE_FURNITURE_TYPE = 10;

export const STORE_LAYOUT_KEY = 'gotchiverse.store.layout.v1';
export const STORE_FURNITURE_INV_KEY = 'gotchiverse.store.furnitureInv.v1';

/** Legacy furniture ids from first soft-launch pass (before local L1–9 catalog). */
const LEGACY_SHELF_ITEM_ID = 181;
const LEGACY_CASHIER_ITEM_ID = 182;

export type StoreListingBind = {
  listingId: string;
  chainId: number;
  title: string;
  description: string;
  price: number;
  currency: 'sim_credit';
  imageUrl?: string;
  tokenAddress?: string;
  tokenId?: string;
};

export type StoreFurniturePiece = {
  id: string;
  itemId: number;
  x: number;
  y: number;
  listing?: StoreListingBind | null;
};

export type StoreLayout = {
  storeId: string;
  furniture: StoreFurniturePiece[];
  updatedAt: number;
};

export type StoreCartLine = {
  shelfId: string;
  listing: StoreListingBind;
  quantity: number;
};

export type StoreFurnitureInventory = {
  [itemId: string]: number;
};

export function isShelfItemId(itemId: number | string): boolean {
  return Number(itemId) === SHELF_ITEM_ID;
}

export function isCashierItemId(itemId: number | string): boolean {
  const id = Number(itemId);
  return id >= CASHIER_ITEM_ID_START && id <= CASHIER_ITEM_ID_END;
}

export function isStoreFurnitureItemId(itemId: number | string): boolean {
  return isShelfItemId(itemId) || isCashierItemId(itemId);
}

function migrateFurnitureItemId(itemId: number): number {
  if (itemId === LEGACY_SHELF_ITEM_ID) return SHELF_ITEM_ID;
  if (itemId === LEGACY_CASHIER_ITEM_ID) return CASHIER_ITEM_ID;
  return itemId;
}

function migrateFurnitureList(furniture: StoreFurniturePiece[]): StoreFurniturePiece[] {
  return (furniture || []).map((piece) => ({
    ...piece,
    itemId: migrateFurnitureItemId(Number(piece.itemId)),
  }));
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export function loadStoreLayout(storeId: string): StoreLayout {
  const all = readJson<Record<string, StoreLayout>>(STORE_LAYOUT_KEY, {});
  const existing = all[storeId];
  if (existing?.furniture) {
    return { ...existing, storeId, furniture: migrateFurnitureList(existing.furniture) };
  }
  return { storeId, furniture: [], updatedAt: Date.now() };
}

export function saveStoreLayout(layout: StoreLayout): StoreLayout {
  const all = readJson<Record<string, StoreLayout>>(STORE_LAYOUT_KEY, {});
  const next = { ...layout, updatedAt: Date.now() };
  all[layout.storeId] = next;
  writeJson(STORE_LAYOUT_KEY, all);
  return next;
}

export function parseLayoutJson(raw: string | undefined | null, storeId: string): StoreLayout {
  if (!raw) return { storeId, furniture: [], updatedAt: 0 };
  try {
    const parsed = JSON.parse(raw) as StoreLayout;
    if (!parsed || !Array.isArray(parsed.furniture)) {
      return { storeId, furniture: [], updatedAt: 0 };
    }
    return {
      storeId,
      furniture: migrateFurnitureList(parsed.furniture),
      updatedAt: Number(parsed.updatedAt) || 0,
    };
  } catch {
    return { storeId, furniture: [], updatedAt: 0 };
  }
}

export function serializeLayout(layout: StoreLayout): string {
  return JSON.stringify({
    storeId: layout.storeId,
    furniture: layout.furniture,
    updatedAt: layout.updatedAt,
  });
}

export function loadFurnitureInventory(): StoreFurnitureInventory {
  const raw = readJson<StoreFurnitureInventory>(STORE_FURNITURE_INV_KEY, {});
  const next: StoreFurnitureInventory = { ...raw };
  if (raw[String(LEGACY_SHELF_ITEM_ID)]) {
    next[String(SHELF_ITEM_ID)] =
      Number(next[String(SHELF_ITEM_ID)] || 0) + Number(raw[String(LEGACY_SHELF_ITEM_ID)] || 0);
    delete next[String(LEGACY_SHELF_ITEM_ID)];
  }
  if (raw[String(LEGACY_CASHIER_ITEM_ID)]) {
    next[String(CASHIER_ITEM_ID)] =
      Number(next[String(CASHIER_ITEM_ID)] || 0) + Number(raw[String(LEGACY_CASHIER_ITEM_ID)] || 0);
    delete next[String(LEGACY_CASHIER_ITEM_ID)];
  }
  if (JSON.stringify(next) !== JSON.stringify(raw)) saveFurnitureInventory(next);
  return next;
}

export function saveFurnitureInventory(inv: StoreFurnitureInventory): void {
  writeJson(STORE_FURNITURE_INV_KEY, inv);
}

export function getFurnitureQty(itemId: number): number {
  const inv = loadFurnitureInventory();
  return Math.max(0, Number(inv[String(itemId)] || 0));
}

export function adjustFurnitureQty(itemId: number, delta: number): number {
  const inv = loadFurnitureInventory();
  const next = Math.max(0, Number(inv[String(itemId)] || 0) + delta);
  inv[String(itemId)] = next;
  saveFurnitureInventory(inv);
  return next;
}

/** Soft-launch free craft into store-furniture bag (not parcel inventory). */
export function craftStoreFurniture(itemId: number, quantity = 1): { ok: boolean; message: string; qty: number } {
  if (!isStoreFurnitureItemId(itemId) || quantity < 1) {
    return { ok: false, message: 'Invalid furniture', qty: 0 };
  }
  const qty = adjustFurnitureQty(itemId, quantity);
  const name = isShelfItemId(itemId) ? 'Shelf' : 'Cashier';
  return { ok: true, message: `Crafted ${quantity}× ${name}`, qty };
}

export function placeFurniture(
  layout: StoreLayout,
  itemId: typeof SHELF_ITEM_ID | typeof CASHIER_ITEM_ID,
  x: number,
  y: number,
): { ok: boolean; message: string; layout: StoreLayout } {
  if (x < 0 || y < 0 || x > 15 || y > 15) {
    return { ok: false, message: 'Out of bounds', layout };
  }
  if (layout.furniture.some((f) => f.x === x && f.y === y)) {
    return { ok: false, message: 'Tile occupied', layout };
  }
  if (getFurnitureQty(itemId) < 1) {
    return { ok: false, message: 'No furniture in inventory — craft first', layout };
  }
  adjustFurnitureQty(itemId, -1);
  const piece: StoreFurniturePiece = {
    id: `f_${itemId}_${x}_${y}_${Date.now()}`,
    itemId,
    x,
    y,
    listing: null,
  };
  const next = saveStoreLayout({
    ...layout,
    furniture: [...layout.furniture, piece],
  });
  return { ok: true, message: 'Placed', layout: next };
}

export function removeFurniture(layout: StoreLayout, furnitureId: string): { ok: boolean; layout: StoreLayout } {
  const piece = layout.furniture.find((f) => f.id === furnitureId);
  if (!piece) return { ok: false, layout };
  adjustFurnitureQty(piece.itemId, 1);
  const next = saveStoreLayout({
    ...layout,
    furniture: layout.furniture.filter((f) => f.id !== furnitureId),
  });
  return { ok: true, layout: next };
}

export function bindListingToShelf(
  layout: StoreLayout,
  shelfId: string,
  listing: StoreListingBind | null,
): { ok: boolean; message: string; layout: StoreLayout } {
  const idx = layout.furniture.findIndex((f) => f.id === shelfId);
  if (idx < 0) return { ok: false, message: 'Shelf not found', layout };
  if (!isShelfItemId(layout.furniture[idx].itemId)) {
    return { ok: false, message: 'Not a shelf', layout };
  }
  const furniture = layout.furniture.map((f, i) => (i === idx ? { ...f, listing } : f));
  const next = saveStoreLayout({ ...layout, furniture });
  return { ok: true, message: listing ? 'Listing bound' : 'Listing cleared', layout: next };
}

export function furnitureAt(layout: StoreLayout, x: number, y: number): StoreFurniturePiece | undefined {
  return layout.furniture.find((f) => f.x === x && f.y === y);
}

export function makeDemoListing(seed = 1): StoreListingBind {
  return {
    listingId: `sim-listing-${seed}`,
    chainId: 8453,
    title: seed === 1 ? 'Pixel Plush Gotchi' : `SIM Listing #${seed}`,
    description: 'Soft-launch shelf listing. Checkout escrow lands in phase 1c.',
    price: 25 * seed,
    currency: 'sim_credit',
    imageUrl: undefined,
  };
}
