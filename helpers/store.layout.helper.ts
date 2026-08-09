/** Soft-launch store interior furniture + listing pointers (phase 1b). */

import {
  CONSOLE_AARCADE_GAMES,
  CONSOLE_ITEM_ID as CONSOLE_L1,
  CONSOLE_ITEM_ID_END as CONSOLE_END,
  CONSOLE_ITEM_ID_START as CONSOLE_START,
  consoleLevelFromItemId,
  getLocalConsoleUpgradeInfo,
  isConsoleItemId,
  loadSharedConsoleBag,
  normalizeLoadedTitles,
  saveSharedConsoleBag,
} from './console.installation.helper';

/** Cashier L1–9 (Maaker-style), own spritesheet `cashier`. */
export const CASHIER_ITEM_ID_START = 189;
export const CASHIER_ITEM_ID_END = 197;
/** Level-1 Cashier craft/place id */
export const CASHIER_ITEM_ID = CASHIER_ITEM_ID_START;

/**
 * Shelf family (furniture type 10):
 * 198 Display Table 2×2 · 213 Feature Table 2×2 · 214 Rack H 3×1 · 215 Rack V 1×3
 * Legacy bag id 198 kept as Display Table.
 */
export const SHELF_ITEM_ID = 198;
export const DISPLAY_TABLE_ITEM_ID = 198;
export const FEATURE_TABLE_ITEM_ID = 213;
export const RACK_H_ITEM_ID = 214;
export const RACK_V_ITEM_ID = 215;
export const SHELF_FAMILY_ITEM_IDS = [
  DISPLAY_TABLE_ITEM_ID,
  FEATURE_TABLE_ITEM_ID,
  RACK_H_ITEM_ID,
  RACK_V_ITEM_ID,
] as const;

/** Terminal L1 only (own spritesheet `terminal`) — owner store SaaS desk. */
export const TERMINAL_ITEM_ID = 208;

/** Console L1–9 (re-export for furniture callers). */
export const CONSOLE_ITEM_ID_START = CONSOLE_START;
export const CONSOLE_ITEM_ID_END = CONSOLE_END;
export const CONSOLE_ITEM_ID = CONSOLE_L1;

export const STORE_FURNITURE_TYPE = 10;

export const STORE_LAYOUT_KEY = 'gotchiverse.store.layout.v1';
export const STORE_FURNITURE_INV_KEY = 'gotchiverse.store.furnitureInv.v1';
/** @deprecated use shared bag via loadSharedConsoleBag — kept for callers. */
export { CONSOLE_BAG_KEY } from './console.installation.helper';

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

export type ShelfKind = 'feature_table' | 'display_table' | 'rack_h' | 'rack_v';
export type HolderLayout = '3sm' | '2md' | '1lg';
export type HolderSize = 'sm' | 'md' | 'lg';

export type ShelfSlot = {
  id: string;
  size: HolderSize;
  /** 0 for tables; 0..shelfCount-1 for racks. */
  tier: number;
  listing?: StoreListingBind | null;
};

export type StoreFurniturePiece = {
  id: string;
  itemId: number;
  x: number;
  y: number;
  /** @deprecated prefer slots — migrated into slots[0] on load */
  listing?: StoreListingBind | null;
  kind?: ShelfKind;
  shelfCount?: 1 | 2 | 3;
  holderLayout?: HolderLayout;
  slots?: ShelfSlot[];
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
  /** Slot id when multi-holder shelf; omit for legacy single listing. */
  slotId?: string;
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

export function shelfKindFromItemId(itemId: number | string): ShelfKind | null {
  const id = Number(itemId);
  if (id === FEATURE_TABLE_ITEM_ID) return 'feature_table';
  if (id === DISPLAY_TABLE_ITEM_ID) return 'display_table';
  if (id === RACK_H_ITEM_ID) return 'rack_h';
  if (id === RACK_V_ITEM_ID) return 'rack_v';
  return null;
}

export function isRackShelfKind(kind: ShelfKind | undefined | null): boolean {
  return kind === 'rack_h' || kind === 'rack_v';
}

export function shelfFootprint(itemId: number | string): { width: number; height: number } {
  const kind = shelfKindFromItemId(itemId);
  if (kind === 'feature_table' || kind === 'display_table') return { width: 2, height: 2 };
  if (kind === 'rack_h') return { width: 3, height: 1 };
  if (kind === 'rack_v') return { width: 1, height: 3 };
  return { width: 1, height: 1 };
}

export function shelfSpriteKey(itemId: number | string): string {
  const kind = shelfKindFromItemId(itemId);
  if (kind === 'feature_table') return 'feature_table';
  if (kind === 'display_table') return 'display_table';
  if (kind === 'rack_h') return 'rack_h';
  if (kind === 'rack_v') return 'rack_v';
  return 'shelf';
}

export function shelfDisplayName(itemId: number | string): string {
  const kind = shelfKindFromItemId(itemId);
  if (kind === 'feature_table') return 'Feature Table';
  if (kind === 'display_table') return 'Display Table';
  if (kind === 'rack_h') return 'Rack (Horizontal)';
  if (kind === 'rack_v') return 'Rack (Vertical)';
  return 'Shelf';
}

function sizesForHolderLayout(layout: HolderLayout): HolderSize[] {
  if (layout === '2md') return ['md', 'md'];
  if (layout === '1lg') return ['lg'];
  return ['sm', 'sm', 'sm'];
}

export function buildShelfSlots(
  kind: ShelfKind,
  shelfCount: 1 | 2 | 3 = 1,
  holderLayout: HolderLayout = '3sm',
): ShelfSlot[] {
  if (kind === 'feature_table') {
    return [{ id: 's0', size: 'lg', tier: 0, listing: null }];
  }
  if (kind === 'display_table') {
    return [0, 1, 2, 3].map((i) => ({ id: `s${i}`, size: 'sm' as const, tier: 0, listing: null }));
  }
  const sizes = sizesForHolderLayout(holderLayout);
  const slots: ShelfSlot[] = [];
  for (let tier = 0; tier < shelfCount; tier += 1) {
    sizes.forEach((size, i) => {
      slots.push({ id: `t${tier}_${i}`, size, tier, listing: null });
    });
  }
  return slots;
}

/** Slot local offsets within the furniture footprint (tile fractions → later * TILE_SIZE). */
export function shelfSlotAnchors(
  kind: ShelfKind,
  slots: ShelfSlot[],
  shelfCount: 1 | 2 | 3 = 1,
): Array<{ slotId: string; ox: number; oy: number }> {
  const out: Array<{ slotId: string; ox: number; oy: number }> = [];
  if (kind === 'feature_table') {
    const s = slots[0];
    if (s) out.push({ slotId: s.id, ox: 1, oy: 1 });
    return out;
  }
  if (kind === 'display_table') {
    const positions = [
      { ox: 0.5, oy: 0.5 },
      { ox: 1.5, oy: 0.5 },
      { ox: 0.5, oy: 1.5 },
      { ox: 1.5, oy: 1.5 },
    ];
    slots.forEach((s, i) => {
      const p = positions[i] || positions[0];
      out.push({ slotId: s.id, ox: p.ox, oy: p.oy });
    });
    return out;
  }
  // Racks: distribute along width (H) or height (V), split tiers across the short axis.
  const isH = kind === 'rack_h';
  const tiers = Math.max(1, shelfCount);
  const byTier = new Map<number, ShelfSlot[]>();
  slots.forEach((s) => {
    const list = byTier.get(s.tier) || [];
    list.push(s);
    byTier.set(s.tier, list);
  });
  for (let tier = 0; tier < tiers; tier += 1) {
    const tierSlots = byTier.get(tier) || [];
    const n = Math.max(1, tierSlots.length);
    const tierFrac = (tier + 0.5) / tiers;
    tierSlots.forEach((s, i) => {
      const along = (i + 0.5) / n;
      if (isH) {
        out.push({ slotId: s.id, ox: along * 3, oy: tierFrac });
      } else {
        out.push({ slotId: s.id, ox: tierFrac, oy: along * 3 });
      }
    });
  }
  return out;
}

export function normalizeShelfPiece(piece: StoreFurniturePiece): StoreFurniturePiece {
  const itemId = Number(piece.itemId);
  const kind = shelfKindFromItemId(itemId);
  if (!kind) return piece;

  const isRack = isRackShelfKind(kind);
  const shelfCount = (isRack ? Math.min(3, Math.max(1, Number(piece.shelfCount) || 1)) : 1) as 1 | 2 | 3;
  const holderLayout: HolderLayout =
    piece.holderLayout === '2md' || piece.holderLayout === '1lg' || piece.holderLayout === '3sm'
      ? piece.holderLayout
      : '3sm';

  let slots = Array.isArray(piece.slots) ? piece.slots.map((s) => ({ ...s })) : [];
  const expected = buildShelfSlots(kind, shelfCount, holderLayout);
  if (slots.length !== expected.length || slots.some((s, i) => s.size !== expected[i].size || s.tier !== expected[i].tier)) {
    const listingByKey = new Map<string, StoreListingBind | null | undefined>();
    slots.forEach((s) => listingByKey.set(`${s.tier}:${s.size}:${s.id}`, s.listing));
    // Prefer matching by index when sizes align partially
    const oldListings = slots.map((s) => s.listing).filter(Boolean) as StoreListingBind[];
    slots = expected.map((e, i) => ({
      ...e,
      listing: listingByKey.get(`${e.tier}:${e.size}:${e.id}`) ?? oldListings[i] ?? null,
    }));
  }

  // Migrate legacy single listing → first empty / first slot
  if (piece.listing && !slots.some((s) => s.listing)) {
    if (slots[0]) slots[0] = { ...slots[0], listing: piece.listing };
  }

  return {
    ...piece,
    itemId,
    kind,
    shelfCount: isRack ? shelfCount : undefined,
    holderLayout: isRack ? holderLayout : undefined,
    slots,
    listing: slots[0]?.listing ?? piece.listing ?? null,
  };
}

export function pieceListedSlots(piece: StoreFurniturePiece): ShelfSlot[] {
  const normalized = normalizeShelfPiece(piece);
  return (normalized.slots || []).filter((s) => s.listing && s.listing.listingId);
}

export function isShelfItemId(itemId: number | string): boolean {
  return SHELF_FAMILY_ITEM_IDS.includes(Number(itemId) as (typeof SHELF_FAMILY_ITEM_IDS)[number]);
}

export function isCashierItemId(itemId: number | string): boolean {
  const id = Number(itemId);
  return id >= CASHIER_ITEM_ID_START && id <= CASHIER_ITEM_ID_END;
}

export function isTerminalItemId(itemId: number | string): boolean {
  return Number(itemId) === TERMINAL_ITEM_ID;
}

export { isConsoleItemId };

export function isStoreFurnitureItemId(itemId: number | string): boolean {
  return (
    isShelfItemId(itemId) ||
    isCashierItemId(itemId) ||
    isTerminalItemId(itemId) ||
    isConsoleItemId(itemId)
  );
}

function migrateFurnitureItemId(itemId: number): number {
  if (itemId === LEGACY_SHELF_ITEM_ID) return SHELF_ITEM_ID;
  if (itemId === LEGACY_CASHIER_ITEM_ID) return CASHIER_ITEM_ID;
  return itemId;
}

function migrateFurnitureList(furniture: StoreFurniturePiece[]): StoreFurniturePiece[] {
  return (furniture || []).map((piece) => {
    const itemId = migrateFurnitureItemId(Number(piece.itemId));
    let next: StoreFurniturePiece = { ...piece, itemId };
    if (isConsoleItemId(itemId)) {
      next.loadedTitles = normalizeLoadedTitles(piece.loadedTitles);
    }
    if (isShelfItemId(itemId)) {
      next = normalizeShelfPiece(next);
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
  return loadSharedConsoleBag();
}

export function saveConsoleBag(bag: ConsoleBagInstance[]): void {
  saveSharedConsoleBag(bag);
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
  const name = isShelfItemId(itemId)
    ? shelfDisplayName(itemId)
    : isTerminalItemId(itemId)
      ? 'Terminal'
      : 'Cashier';
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

export function furnitureTiles(piece: { itemId: number; x: number; y: number }): Array<{ x: number; y: number }> {
  const { width, height } = isShelfItemId(piece.itemId)
    ? shelfFootprint(piece.itemId)
    : { width: 1, height: 1 };
  const tiles: Array<{ x: number; y: number }> = [];
  for (let dy = 0; dy < height; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      tiles.push({ x: piece.x + dx, y: piece.y + dy });
    }
  }
  return tiles;
}

function tileOccupied(
  layout: StoreLayout,
  x: number,
  y: number,
  ignoreId?: string,
): boolean {
  return layout.furniture.some((f) => {
    if (ignoreId && f.id === ignoreId) return false;
    return furnitureTiles(f).some((t) => t.x === x && t.y === y);
  });
}

export function placeFurniture(
  layout: StoreLayout,
  itemId: number,
  x: number,
  y: number,
): { ok: boolean; message: string; layout: StoreLayout } {
  const fp = isShelfItemId(itemId) ? shelfFootprint(itemId) : { width: 1, height: 1 };
  if (x < 0 || y < 0 || x + fp.width - 1 > 15 || y + fp.height - 1 > 15) {
    return { ok: false, message: 'Out of bounds', layout };
  }
  for (let dy = 0; dy < fp.height; dy += 1) {
    for (let dx = 0; dx < fp.width; dx += 1) {
      const tx = x + dx;
      const ty = y + dy;
      if (storeStructureAt(tx, ty) !== 'floor') {
        return { ok: false, message: 'Furniture goes on the floor', layout };
      }
      if (tileOccupied(layout, tx, ty)) {
        return { ok: false, message: 'Tile occupied', layout };
      }
    }
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

  if (!isShelfItemId(itemId) && !isCashierItemId(itemId) && !isTerminalItemId(itemId)) {
    return { ok: false, message: 'Invalid furniture', layout };
  }
  if (getFurnitureQty(itemId) < 1) {
    return { ok: false, message: 'No furniture in inventory — craft first', layout };
  }
  adjustFurnitureQty(itemId, -1);

  const kind = shelfKindFromItemId(itemId);
  let piece: StoreFurniturePiece = {
    id: `f_${itemId}_${x}_${y}_${Date.now()}`,
    itemId,
    x,
    y,
    listing: null,
  };
  if (kind) {
    piece = normalizeShelfPiece({
      ...piece,
      kind,
      shelfCount: isRackShelfKind(kind) ? 1 : undefined,
      holderLayout: isRackShelfKind(kind) ? '3sm' : undefined,
      slots: buildShelfSlots(kind, 1, '3sm'),
    });
  }

  const next = saveStoreLayout({
    ...layout,
    furniture: [...layout.furniture, piece],
  });
  const label = isShelfItemId(itemId)
    ? shelfDisplayName(itemId)
    : isTerminalItemId(itemId)
      ? 'Terminal'
      : 'Cashier';
  return { ok: true, message: `Placed ${label}`, layout: next };
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
  slotId?: string,
): { ok: boolean; message: string; layout: StoreLayout } {
  const idx = layout.furniture.findIndex((f) => f.id === shelfId);
  if (idx < 0) return { ok: false, message: 'Shelf not found', layout };
  if (!isShelfItemId(layout.furniture[idx].itemId)) {
    return { ok: false, message: 'Not a shelf', layout };
  }
  const base = normalizeShelfPiece(layout.furniture[idx]);
  const targetSlotId = slotId || base.slots?.[0]?.id;
  if (!targetSlotId || !base.slots?.some((s) => s.id === targetSlotId)) {
    return { ok: false, message: 'Slot not found', layout };
  }
  const slots = (base.slots || []).map((s) => (s.id === targetSlotId ? { ...s, listing } : s));
  const furniture = layout.furniture.map((f, i) =>
    i === idx
      ? {
          ...base,
          slots,
          listing: slots[0]?.listing ?? null,
        }
      : f,
  );
  const next = saveStoreLayout({ ...layout, furniture });
  return { ok: true, message: listing ? 'Listing bound' : 'Listing cleared', layout: next };
}

export function configureRackShelf(
  layout: StoreLayout,
  furnitureId: string,
  shelfCount: 1 | 2 | 3,
  holderLayout: HolderLayout,
): { ok: boolean; message: string; layout: StoreLayout } {
  const idx = layout.furniture.findIndex((f) => f.id === furnitureId);
  if (idx < 0) return { ok: false, message: 'Shelf not found', layout };
  const piece = layout.furniture[idx];
  const kind = shelfKindFromItemId(piece.itemId);
  if (!kind || !isRackShelfKind(kind)) {
    return { ok: false, message: 'Not a rack', layout };
  }
  const nextPiece = normalizeShelfPiece({
    ...piece,
    kind,
    shelfCount,
    holderLayout,
    slots: buildShelfSlots(kind, shelfCount, holderLayout).map((slot, i) => ({
      ...slot,
      listing: piece.slots?.[i]?.listing ?? null,
    })),
  });
  // Re-run normalize to rematch listings by size/tier when possible
  const rematched = normalizeShelfPiece({
    ...nextPiece,
    slots: buildShelfSlots(kind, shelfCount, holderLayout).map((slot) => {
      const prev =
        (piece.slots || []).find((s) => s.id === slot.id) ||
        (piece.slots || []).find((s) => s.tier === slot.tier && s.size === slot.size && s.listing);
      return { ...slot, listing: prev?.listing ?? null };
    }),
  });
  const furniture = layout.furniture.map((f, i) => (i === idx ? rematched : f));
  const next = saveStoreLayout({ ...layout, furniture });
  return { ok: true, message: `Rack set to ${shelfCount} shelf(ves), ${holderLayout}`, layout: next };
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

/** Soft-launch in-store Cashier upgrade: bump itemId within 189–197. */
export function upgradeCashierFurniture(
  layout: StoreLayout,
  furnitureId: string,
): { ok: boolean; message: string; layout: StoreLayout } {
  const idx = layout.furniture.findIndex((f) => f.id === furnitureId);
  if (idx < 0) return { ok: false, message: 'Cashier not found', layout };
  const piece = layout.furniture[idx];
  if (!isCashierItemId(piece.itemId)) {
    return { ok: false, message: 'Not a Cashier', layout };
  }
  if (Number(piece.itemId) >= CASHIER_ITEM_ID_END) {
    return { ok: false, message: 'Cashier is max level', layout };
  }
  const nextId = Number(piece.itemId) + 1;
  const furniture = layout.furniture.map((f, i) => (i === idx ? { ...f, itemId: nextId } : f));
  const next = saveStoreLayout({ ...layout, furniture });
  return {
    ok: true,
    message: `Upgraded Cashier to level ${nextId - CASHIER_ITEM_ID_START + 1}`,
    layout: next,
  };
}

export function furnitureAt(layout: StoreLayout, x: number, y: number): StoreFurniturePiece | undefined {
  return layout.furniture.find((f) => furnitureTiles(f).some((t) => t.x === x && t.y === y));
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
