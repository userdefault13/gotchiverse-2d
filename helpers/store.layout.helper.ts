/** Soft-launch store interior furniture + listing pointers (phase 1b). */

import {
  CONSOLE_AARCADE_GAMES,
  CONSOLE_ITEM_ID as CONSOLE_L1,
  CONSOLE_ITEM_ID_END as CONSOLE_END,
  CONSOLE_ITEM_ID_START as CONSOLE_START,
  consoleLevelFromItemId,
  getLocalConsoleUpgradeInfo,
  isConsoleItemId,
  normalizeLoadedTitles,
} from './console.installation.helper';

/** Cashier L1–9 (Maaker-style), own spritesheet `cashier`. */
export const CASHIER_ITEM_ID_START = 189;
export const CASHIER_ITEM_ID_END = 197;
/** Level-1 Cashier craft/place id */
export const CASHIER_ITEM_ID = CASHIER_ITEM_ID_START;

/** Shelf L1 only (own spritesheet `shelf`). */
export const SHELF_ITEM_ID = 198;

/** Console L1–9 (re-export for furniture callers). */
export const CONSOLE_ITEM_ID_START = CONSOLE_START;
export const CONSOLE_ITEM_ID_END = CONSOLE_END;
export const CONSOLE_ITEM_ID = CONSOLE_L1;

export const STORE_FURNITURE_TYPE = 10;

export const STORE_LAYOUT_KEY = 'gotchiverse.store.layout.v1';
export const STORE_FURNITURE_INV_KEY = 'gotchiverse.store.furnitureInv.v1';
export const CONSOLE_BAG_KEY = 'gotchiverse.store.consoleBag.v1';

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
  /** Console: Aarcade game ids loaded onto this piece. */
  loadedTitles?: string[];
};

/** Floor cell art: greyscale base pack vs owner wallet Tile_LE PNG. */
export type StoreFloorArt = 'base' | 'wallet';

export type StoreFloorCell = {
  tileId: number;
  art: StoreFloorArt;
};

/** Map key `${x},${y}` → floor tile. */
export type StoreFloorMap = Record<string, StoreFloorCell>;

export type StoreLayout = {
  storeId: string;
  furniture: StoreFurniturePiece[];
  /** Interior floor decoration (random greyscale bases + owner wallet tiles). */
  floor?: StoreFloorMap;
  updatedAt: number;
};

/** Source tile ids with shade_00_base greyscale assets (8–37). */
export const STORE_BASE_SHADE_IDS: number[] = Array.from({ length: 30 }, (_, i) => i + 8);

export const STORE_GRID = 16;

/** Bottom-center door opening (2 tiles). */
export const STORE_DOOR_TX = [7, 8] as const;
/** Top-wall storefront windows. */
export const STORE_WINDOW_TX = [2, 3, 4, 11, 12, 13] as const;
export const STORE_SPAWN_TX = 7;
export const STORE_SPAWN_TY = STORE_GRID - 2;

export type StoreStructureKind = 'floor' | 'wall' | 'door' | 'window';

export function storeStructureAt(tx: number, ty: number, grid = STORE_GRID): StoreStructureKind {
  const onEdge = tx === 0 || tx === grid - 1 || ty === 0 || ty === grid - 1;
  if (ty === grid - 1 && (STORE_DOOR_TX as readonly number[]).includes(tx)) return 'door';
  if (ty === 0 && (STORE_WINDOW_TX as readonly number[]).includes(tx)) return 'window';
  if (onEdge) return 'wall';
  return 'floor';
}

export function storeIsWalkable(tx: number, ty: number, grid = STORE_GRID): boolean {
  if (tx < 0 || ty < 0 || tx >= grid || ty >= grid) return false;
  const kind = storeStructureAt(tx, ty, grid);
  return kind === 'floor' || kind === 'door';
}

export function storeInteriorFloorKeys(grid = STORE_GRID): string[] {
  const keys: string[] = [];
  for (let ty = 0; ty < grid; ty += 1) {
    for (let tx = 0; tx < grid; tx += 1) {
      if (storeStructureAt(tx, ty, grid) === 'floor') keys.push(floorKey(tx, ty));
    }
  }
  return keys;
}

export function storeTileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * 64 + 32, y: ty * 64 + 32 };
}

export function floorKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function greyscaleBaseUrl(tileId: number): string {
  return `/images/tiles/greyscale/Tile_LE_${tileId}_base.png`;
}

export function walletTileUrl(tileId: number): string {
  return `/images/tiles/Tile_LE_${tileId}.png`;
}

export function floorCellUrl(cell: StoreFloorCell | undefined | null): string | null {
  if (!cell?.tileId) return null;
  return cell.art === 'wallet' ? walletTileUrl(cell.tileId) : greyscaleBaseUrl(cell.tileId);
}

function pickBaseShadeId(): number {
  return STORE_BASE_SHADE_IDS[Math.floor(Math.random() * STORE_BASE_SHADE_IDS.length)];
}

/** Fill every interior floor cell with a random greyscale base shade (walls/door/window excluded by caller keys). */
export function buildRandomFloorMap(keys: string[]): StoreFloorMap {
  const floor: StoreFloorMap = {};
  keys.forEach((key) => {
    floor[key] = { tileId: pickBaseShadeId(), art: 'base' };
  });
  return floor;
}

export function ensureStoreFloor(layout: StoreLayout, floorKeys: string[]): StoreLayout {
  const existing = layout.floor && Object.keys(layout.floor).length > 0 ? layout.floor : null;
  if (existing) return layout;
  return {
    ...layout,
    floor: buildRandomFloorMap(floorKeys),
  };
}

export function setFloorTile(
  layout: StoreLayout,
  x: number,
  y: number,
  tileId: number,
  art: StoreFloorArt = 'wallet',
): StoreLayout {
  const floor = { ...(layout.floor || {}) };
  floor[floorKey(x, y)] = { tileId: Number(tileId), art };
  return { ...layout, floor };
}

export type StoreCartLine = {
  shelfId: string;
  listing: StoreListingBind;
  quantity: number;
};

export type StoreFurnitureInventory = {
  [itemId: string]: number;
};

export type ConsoleBagInstance = {
  bagId: string;
  itemId: number;
  loadedTitles: string[];
};

export function isShelfItemId(itemId: number | string): boolean {
  return Number(itemId) === SHELF_ITEM_ID;
}

export function isCashierItemId(itemId: number | string): boolean {
  const id = Number(itemId);
  return id >= CASHIER_ITEM_ID_START && id <= CASHIER_ITEM_ID_END;
}

export { isConsoleItemId };

export function isStoreFurnitureItemId(itemId: number | string): boolean {
  return isShelfItemId(itemId) || isCashierItemId(itemId) || isConsoleItemId(itemId);
}

function migrateFurnitureItemId(itemId: number): number {
  if (itemId === LEGACY_SHELF_ITEM_ID) return SHELF_ITEM_ID;
  if (itemId === LEGACY_CASHIER_ITEM_ID) return CASHIER_ITEM_ID;
  return itemId;
}

function migrateFurnitureList(furniture: StoreFurniturePiece[]): StoreFurniturePiece[] {
  return (furniture || []).map((piece) => {
    const itemId = migrateFurnitureItemId(Number(piece.itemId));
    const next: StoreFurniturePiece = { ...piece, itemId };
    if (isConsoleItemId(itemId)) {
      next.loadedTitles = normalizeLoadedTitles(piece.loadedTitles);
    }
    return next;
  });
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
    return {
      ...existing,
      storeId,
      furniture: migrateFurnitureList(existing.furniture),
      floor: existing.floor && typeof existing.floor === 'object' ? existing.floor : undefined,
    };
  }
  return { storeId, furniture: [], floor: undefined, updatedAt: Date.now() };
}

export function saveStoreLayout(layout: StoreLayout): StoreLayout {
  const all = readJson<Record<string, StoreLayout>>(STORE_LAYOUT_KEY, {});
  const next = { ...layout, updatedAt: Date.now() };
  all[layout.storeId] = next;
  writeJson(STORE_LAYOUT_KEY, all);
  return next;
}

export function parseLayoutJson(raw: string | undefined | null, storeId: string): StoreLayout {
  if (!raw) return { storeId, furniture: [], floor: undefined, updatedAt: 0 };
  try {
    const parsed = JSON.parse(raw) as StoreLayout;
    if (!parsed || !Array.isArray(parsed.furniture)) {
      return { storeId, furniture: [], floor: undefined, updatedAt: 0 };
    }
    return {
      storeId,
      furniture: migrateFurnitureList(parsed.furniture),
      floor: parsed.floor && typeof parsed.floor === 'object' ? parsed.floor : undefined,
      updatedAt: Number(parsed.updatedAt) || 0,
    };
  } catch {
    return { storeId, furniture: [], floor: undefined, updatedAt: 0 };
  }
}

export function serializeLayout(layout: StoreLayout): string {
  return JSON.stringify({
    storeId: layout.storeId,
    furniture: layout.furniture,
    floor: layout.floor || {},
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
  if (isConsoleItemId(itemId)) {
    return loadConsoleBag().filter((c) => Number(c.itemId) === Number(itemId)).length;
  }
  const inv = loadFurnitureInventory();
  return Math.max(0, Number(inv[String(itemId)] || 0));
}

export function adjustFurnitureQty(itemId: number, delta: number): number {
  if (isConsoleItemId(itemId)) {
    // Console uses instance bag; qty helpers only for shelf/cashier.
    return getFurnitureQty(itemId);
  }
  const inv = loadFurnitureInventory();
  const next = Math.max(0, Number(inv[String(itemId)] || 0) + delta);
  inv[String(itemId)] = next;
  saveFurnitureInventory(inv);
  return next;
}

export function loadConsoleBag(): ConsoleBagInstance[] {
  const raw = readJson<ConsoleBagInstance[]>(CONSOLE_BAG_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && isConsoleItemId(row.itemId))
    .map((row) => ({
      bagId: String(row.bagId || `bag_${Date.now()}`),
      itemId: Number(row.itemId),
      loadedTitles: normalizeLoadedTitles(row.loadedTitles),
    }));
}

export function saveConsoleBag(bag: ConsoleBagInstance[]): void {
  writeJson(CONSOLE_BAG_KEY, bag);
}

export function getConsoleBagCount(itemId?: number): number {
  const bag = loadConsoleBag();
  if (itemId == null) return bag.length;
  return bag.filter((c) => Number(c.itemId) === Number(itemId)).length;
}

/** Soft-launch free craft into store-furniture bag (not parcel inventory). */
export function craftStoreFurniture(itemId: number, quantity = 1): { ok: boolean; message: string; qty: number } {
  if (!isStoreFurnitureItemId(itemId) || quantity < 1) {
    return { ok: false, message: 'Invalid furniture', qty: 0 };
  }
  if (isConsoleItemId(itemId)) {
    return { ok: false, message: 'Console craft requires a title — use craftConsoleFurniture', qty: 0 };
  }
  const qty = adjustFurnitureQty(itemId, quantity);
  const name = isShelfItemId(itemId) ? 'Shelf' : 'Cashier';
  return { ok: true, message: `Crafted ${quantity}× ${name}`, qty };
}

/**
 * Craft a Console into the instance bag with at least one loaded title.
 * Soft-launch: free craft (no alchemica).
 */
export function craftConsoleFurniture(
  itemId: number,
  firstTitle: string,
  quantity = 1,
): { ok: boolean; message: string; qty: number; bagIds: string[] } {
  if (!isConsoleItemId(itemId) || quantity < 1) {
    return { ok: false, message: 'Invalid Console', qty: 0, bagIds: [] };
  }
  const title = String(firstTitle || '')
    .trim()
    .toLowerCase();
  if (!CONSOLE_AARCADE_GAMES.some((g) => g.id === title)) {
    return { ok: false, message: 'Pick an Aarcade title to load', qty: 0, bagIds: [] };
  }
  const bag = loadConsoleBag();
  const bagIds: string[] = [];
  for (let i = 0; i < quantity; i += 1) {
    const bagId = `console_${itemId}_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`;
    bag.push({ bagId, itemId: Number(itemId), loadedTitles: [title] });
    bagIds.push(bagId);
  }
  saveConsoleBag(bag);
  const name = CONSOLE_AARCADE_GAMES.find((g) => g.id === title)?.name || title;
  return {
    ok: true,
    message: `Crafted ${quantity}× Console with ${name}`,
    qty: bag.filter((c) => Number(c.itemId) === Number(itemId)).length,
    bagIds,
  };
}

export function placeFurniture(
  layout: StoreLayout,
  itemId: number,
  x: number,
  y: number,
): { ok: boolean; message: string; layout: StoreLayout } {
  if (x < 0 || y < 0 || x > 15 || y > 15) {
    return { ok: false, message: 'Out of bounds', layout };
  }
  if (layout.furniture.some((f) => f.x === x && f.y === y)) {
    return { ok: false, message: 'Tile occupied', layout };
  }

  if (isConsoleItemId(itemId)) {
    const bag = loadConsoleBag();
    let idx = bag.findIndex((c) => Number(c.itemId) === Number(itemId));
    // Place Console brush is L1 id — allow placing any bag instance (incl. reclaimed upgrades).
    if (idx < 0 && Number(itemId) === CONSOLE_ITEM_ID && bag.length > 0) {
      idx = 0;
    }
    if (idx < 0) {
      return { ok: false, message: 'No Console in bag — craft first', layout };
    }
    const [instance] = bag.splice(idx, 1);
    saveConsoleBag(bag);
    const piece: StoreFurniturePiece = {
      id: `f_${instance.itemId}_${x}_${y}_${Date.now()}`,
      itemId: Number(instance.itemId),
      x,
      y,
      listing: null,
      loadedTitles: normalizeLoadedTitles(instance.loadedTitles),
    };
    const next = saveStoreLayout({
      ...layout,
      furniture: [...layout.furniture, piece],
    });
    return { ok: true, message: 'Placed Console', layout: next };
  }

  if (!isShelfItemId(itemId) && !isCashierItemId(itemId)) {
    return { ok: false, message: 'Invalid furniture', layout };
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

  if (isConsoleItemId(piece.itemId)) {
    const bag = loadConsoleBag();
    bag.push({
      bagId: `console_reclaim_${piece.id}_${Date.now()}`,
      itemId: Number(piece.itemId),
      loadedTitles: normalizeLoadedTitles(piece.loadedTitles),
    });
    saveConsoleBag(bag);
  } else {
    adjustFurnitureQty(piece.itemId, 1);
  }

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

export function setConsoleLoadedTitles(
  layout: StoreLayout,
  furnitureId: string,
  loadedTitles: string[],
): { ok: boolean; message: string; layout: StoreLayout } {
  const idx = layout.furniture.findIndex((f) => f.id === furnitureId);
  if (idx < 0) return { ok: false, message: 'Console not found', layout };
  if (!isConsoleItemId(layout.furniture[idx].itemId)) {
    return { ok: false, message: 'Not a Console', layout };
  }
  const furniture = layout.furniture.map((f, i) =>
    i === idx ? { ...f, loadedTitles: normalizeLoadedTitles(loadedTitles) } : f,
  );
  const next = saveStoreLayout({ ...layout, furniture });
  return { ok: true, message: 'Titles updated', layout: next };
}

/** Soft-launch in-store Console upgrade: bump itemId, keep loadedTitles. */
export function upgradeConsoleFurniture(
  layout: StoreLayout,
  furnitureId: string,
): { ok: boolean; message: string; layout: StoreLayout } {
  const idx = layout.furniture.findIndex((f) => f.id === furnitureId);
  if (idx < 0) return { ok: false, message: 'Console not found', layout };
  const piece = layout.furniture[idx];
  if (!isConsoleItemId(piece.itemId)) {
    return { ok: false, message: 'Not a Console', layout };
  }
  const info = getLocalConsoleUpgradeInfo(piece.itemId);
  if (!info?.next) {
    return { ok: false, message: 'Console is max level', layout };
  }
  const furniture = layout.furniture.map((f, i) =>
    i === idx
      ? {
          ...f,
          itemId: info.next!.id,
          loadedTitles: normalizeLoadedTitles(f.loadedTitles),
        }
      : f,
  );
  const next = saveStoreLayout({ ...layout, furniture });
  return {
    ok: true,
    message: `Upgraded to ${info.next.name} (slots: ${
      Number.isFinite(info.next.titleCapacity) ? info.next.titleCapacity : '∞'
    })`,
    layout: next,
  };
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

/** Re-export for callers that only import layout helper. */
export { consoleLevelFromItemId };
