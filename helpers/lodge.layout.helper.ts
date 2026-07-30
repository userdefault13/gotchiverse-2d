/** Soft-launch lodge interior furniture + listing pointers (phase 1b). */

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
import {
  BROADCASTER_ITEM_ID as BROADCASTER_L1,
  isBroadcasterItemId,
  sanitizeStoredStreamUrl,
} from './broadcaster.installation.helper';

/** Cashier L1–9 (Maaker-style), own spritesheet `cashier`. */
export const CASHIER_ITEM_ID_START = 189;
export const CASHIER_ITEM_ID_END = 197;
/** Level-1 Cashier craft/place id */
export const CASHIER_ITEM_ID = CASHIER_ITEM_ID_START;

/** Shelf L1 only (own spritesheet `shelf`). */
export const SHELF_ITEM_ID = 198;

/** Terminal L1 only (own spritesheet `terminal`) — owner store SaaS desk. */
export const TERMINAL_ITEM_ID = 208;

/** Broadcaster TV L1 (own spritesheet `broadcaster`) — X live stream TV. */
export const BROADCASTER_ITEM_ID = BROADCASTER_L1;

/** Console L1–9 (re-export for furniture callers). */
export const CONSOLE_ITEM_ID_START = CONSOLE_START;
export const CONSOLE_ITEM_ID_END = CONSOLE_END;
export const CONSOLE_ITEM_ID = CONSOLE_L1;

export const LODGE_FURNITURE_TYPE = 10;

export const LODGE_LAYOUT_KEY = 'gotchiverse.lodge.layout.v1';
export const LODGE_FURNITURE_INV_KEY = 'gotchiverse.lodge.furnitureInv.v1';
export const CONSOLE_BAG_KEY = 'gotchiverse.lodge.consoleBag.v1';

/** Legacy furniture ids from first soft-launch pass (before local L1–9 catalog). */
const LEGACY_SHELF_ITEM_ID = 181;
const LEGACY_CASHIER_ITEM_ID = 182;

export type LodgeListingBind = {
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

export type LodgeFurniturePiece = {
  id: string;
  itemId: number;
  x: number;
  y: number;
  listing?: LodgeListingBind | null;
  /** Console: Aarcade game ids loaded onto this piece. */
  loadedTitles?: string[];
  /** Broadcaster: owner-configured X live / broadcast URL. */
  streamUrl?: string;
};

/** Floor cell art: greyscale base pack vs owner wallet Tile_LE PNG. */
export type LodgeFloorArt = 'base' | 'wallet';

export type LodgeFloorCell = {
  tileId: number;
  art: LodgeFloorArt;
};

/** Map key `${x},${y}` → floor tile. */
export type LodgeFloorMap = Record<string, LodgeFloorCell>;

export type LodgeLayout = {
  lodgeId: string;
  furniture: LodgeFurniturePiece[];
  /** Interior floor decoration (random greyscale bases + owner wallet tiles). */
  floor?: LodgeFloorMap;
  updatedAt: number;
};

/** Source tile ids with shade_00_base greyscale assets (8–37). */
export const LODGE_BASE_SHADE_IDS: number[] = Array.from({ length: 30 }, (_, i) => i + 8);

export const LODGE_GRID = 16;

/** Bottom-center door opening (2 tiles). */
export const LODGE_DOOR_TX = [7, 8] as const;
/** Top-wall storefront windows. */
export const LODGE_WINDOW_TX = [2, 3, 4, 11, 12, 13] as const;
export const LODGE_SPAWN_TX = 7;
export const LODGE_SPAWN_TY = LODGE_GRID - 2;

export type LodgeStructureKind = 'floor' | 'wall' | 'door' | 'window';

export function lodgeStructureAt(tx: number, ty: number, grid = LODGE_GRID): LodgeStructureKind {
  const onEdge = tx === 0 || tx === grid - 1 || ty === 0 || ty === grid - 1;
  if (ty === grid - 1 && (LODGE_DOOR_TX as readonly number[]).includes(tx)) return 'door';
  if (ty === 0 && (LODGE_WINDOW_TX as readonly number[]).includes(tx)) return 'window';
  if (onEdge) return 'wall';
  return 'floor';
}

export function lodgeIsWalkable(tx: number, ty: number, grid = LODGE_GRID): boolean {
  if (tx < 0 || ty < 0 || tx >= grid || ty >= grid) return false;
  const kind = lodgeStructureAt(tx, ty, grid);
  return kind === 'floor' || kind === 'door';
}

export function lodgeInteriorFloorKeys(grid = LODGE_GRID): string[] {
  const keys: string[] = [];
  for (let ty = 0; ty < grid; ty += 1) {
    for (let tx = 0; tx < grid; tx += 1) {
      if (lodgeStructureAt(tx, ty, grid) === 'floor') keys.push(floorKey(tx, ty));
    }
  }
  return keys;
}

export function lodgeTileCenter(tx: number, ty: number): { x: number; y: number } {
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

export function floorCellUrl(cell: LodgeFloorCell | undefined | null): string | null {
  if (!cell?.tileId) return null;
  return cell.art === 'wallet' ? walletTileUrl(cell.tileId) : greyscaleBaseUrl(cell.tileId);
}

function pickBaseShadeId(): number {
  return LODGE_BASE_SHADE_IDS[Math.floor(Math.random() * LODGE_BASE_SHADE_IDS.length)];
}

/** Fill every interior floor cell with a random greyscale base shade (walls/door/window excluded by caller keys). */
export function buildRandomFloorMap(keys: string[]): LodgeFloorMap {
  const floor: LodgeFloorMap = {};
  keys.forEach((key) => {
    floor[key] = { tileId: pickBaseShadeId(), art: 'base' };
  });
  return floor;
}

export function ensureLodgeFloor(layout: LodgeLayout, floorKeys: string[]): LodgeLayout {
  const existing = layout.floor && Object.keys(layout.floor).length > 0 ? layout.floor : null;
  if (existing) return layout;
  return {
    ...layout,
    floor: buildRandomFloorMap(floorKeys),
  };
}

export function setFloorTile(
  layout: LodgeLayout,
  x: number,
  y: number,
  tileId: number,
  art: LodgeFloorArt = 'wallet',
): LodgeLayout {
  const floor = { ...(layout.floor || {}) };
  floor[floorKey(x, y)] = { tileId: Number(tileId), art };
  return { ...layout, floor };
}

export type LodgeCartLine = {
  shelfId: string;
  listing: LodgeListingBind;
  quantity: number;
};

export type LodgeFurnitureInventory = {
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

export function isTerminalItemId(itemId: number | string): boolean {
  return Number(itemId) === TERMINAL_ITEM_ID;
}

export { isConsoleItemId, isBroadcasterItemId };

export function isLodgeFurnitureItemId(itemId: number | string): boolean {
  return (
    isShelfItemId(itemId) ||
    isCashierItemId(itemId) ||
    isTerminalItemId(itemId) ||
    isConsoleItemId(itemId) ||
    isBroadcasterItemId(itemId)
  );
}

function migrateFurnitureItemId(itemId: number): number {
  if (itemId === LEGACY_SHELF_ITEM_ID) return SHELF_ITEM_ID;
  if (itemId === LEGACY_CASHIER_ITEM_ID) return CASHIER_ITEM_ID;
  return itemId;
}

function migrateFurnitureList(furniture: LodgeFurniturePiece[]): LodgeFurniturePiece[] {
  return (furniture || []).map((piece) => {
    const itemId = migrateFurnitureItemId(Number(piece.itemId));
    const next: LodgeFurniturePiece = { ...piece, itemId };
    if (isConsoleItemId(itemId)) {
      next.loadedTitles = normalizeLoadedTitles(piece.loadedTitles);
    }
    if (isBroadcasterItemId(itemId)) {
      next.streamUrl = sanitizeStoredStreamUrl(piece.streamUrl);
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

export function loadLodgeLayout(lodgeId: string): LodgeLayout {
  const all = readJson<Record<string, LodgeLayout>>(LODGE_LAYOUT_KEY, {});
  const existing = all[lodgeId];
  if (existing?.furniture) {
    return {
      ...existing,
      lodgeId,
      furniture: migrateFurnitureList(existing.furniture),
      floor: existing.floor && typeof existing.floor === 'object' ? existing.floor : undefined,
    };
  }
  return { lodgeId, furniture: [], floor: undefined, updatedAt: Date.now() };
}

export function saveLodgeLayout(layout: LodgeLayout): LodgeLayout {
  const all = readJson<Record<string, LodgeLayout>>(LODGE_LAYOUT_KEY, {});
  const next = { ...layout, updatedAt: Date.now() };
  all[layout.lodgeId] = next;
  writeJson(LODGE_LAYOUT_KEY, all);
  return next;
}

export function parseLodgeLayoutJson(raw: string | undefined | null, lodgeId: string): LodgeLayout {
  if (!raw) return { lodgeId, furniture: [], floor: undefined, updatedAt: 0 };
  try {
    const parsed = JSON.parse(raw) as LodgeLayout;
    if (!parsed || !Array.isArray(parsed.furniture)) {
      return { lodgeId, furniture: [], floor: undefined, updatedAt: 0 };
    }
    return {
      lodgeId,
      furniture: migrateFurnitureList(parsed.furniture),
      floor: parsed.floor && typeof parsed.floor === 'object' ? parsed.floor : undefined,
      updatedAt: Number(parsed.updatedAt) || 0,
    };
  } catch {
    return { lodgeId, furniture: [], floor: undefined, updatedAt: 0 };
  }
}

export function serializeLodgeLayout(layout: LodgeLayout): string {
  return JSON.stringify({
    lodgeId: layout.lodgeId,
    furniture: layout.furniture,
    floor: layout.floor || {},
    updatedAt: layout.updatedAt,
  });
}

export function loadLodgeFurnitureInventory(): LodgeFurnitureInventory {
  const raw = readJson<LodgeFurnitureInventory>(LODGE_FURNITURE_INV_KEY, {});
  const next: LodgeFurnitureInventory = { ...raw };
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
  if (JSON.stringify(next) !== JSON.stringify(raw)) saveLodgeFurnitureInventory(next);
  return next;
}

export function saveLodgeFurnitureInventory(inv: LodgeFurnitureInventory): void {
  writeJson(LODGE_FURNITURE_INV_KEY, inv);
}

export function getLodgeFurnitureQty(itemId: number): number {
  if (isConsoleItemId(itemId)) {
    return loadConsoleBag().filter((c) => Number(c.itemId) === Number(itemId)).length;
  }
  const inv = loadLodgeFurnitureInventory();
  return Math.max(0, Number(inv[String(itemId)] || 0));
}

export function adjustLodgeFurnitureQty(itemId: number, delta: number): number {
  if (isConsoleItemId(itemId)) {
    // Console uses instance bag; qty helpers only for shelf/cashier.
    return getLodgeFurnitureQty(itemId);
  }
  const inv = loadLodgeFurnitureInventory();
  const next = Math.max(0, Number(inv[String(itemId)] || 0) + delta);
  inv[String(itemId)] = next;
  saveLodgeFurnitureInventory(inv);
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
export function craftLodgeFurniture(itemId: number, quantity = 1): { ok: boolean; message: string; qty: number } {
  if (!isLodgeFurnitureItemId(itemId) || quantity < 1) {
    return { ok: false, message: 'Invalid furniture', qty: 0 };
  }
  if (isConsoleItemId(itemId)) {
    return { ok: false, message: 'Console craft requires a title — use craftConsoleFurniture', qty: 0 };
  }
  const qty = adjustLodgeFurnitureQty(itemId, quantity);
  const name = isShelfItemId(itemId)
    ? 'Shelf'
    : isTerminalItemId(itemId)
      ? 'Terminal'
      : isBroadcasterItemId(itemId)
        ? 'Broadcaster'
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

export function placeLodgeFurniture(
  layout: LodgeLayout,
  itemId: number,
  x: number,
  y: number,
): { ok: boolean; message: string; layout: LodgeLayout } {
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
    const piece: LodgeFurniturePiece = {
      id: `f_${instance.itemId}_${x}_${y}_${Date.now()}`,
      itemId: Number(instance.itemId),
      x,
      y,
      listing: null,
      loadedTitles: normalizeLoadedTitles(instance.loadedTitles),
    };
    const next = saveLodgeLayout({
      ...layout,
      furniture: [...layout.furniture, piece],
    });
    return { ok: true, message: 'Placed Console', layout: next };
  }

  if (
    !isShelfItemId(itemId) &&
    !isCashierItemId(itemId) &&
    !isTerminalItemId(itemId) &&
    !isBroadcasterItemId(itemId)
  ) {
    return { ok: false, message: 'Invalid furniture', layout };
  }
  if (getLodgeFurnitureQty(itemId) < 1) {
    return { ok: false, message: 'No furniture in inventory — craft first', layout };
  }
  adjustLodgeFurnitureQty(itemId, -1);
  const piece: LodgeFurniturePiece = {
    id: `f_${itemId}_${x}_${y}_${Date.now()}`,
    itemId,
    x,
    y,
    listing: null,
    ...(isBroadcasterItemId(itemId) ? { streamUrl: '' } : {}),
  };
  const next = saveLodgeLayout({
    ...layout,
    furniture: [...layout.furniture, piece],
  });
  const label = isShelfItemId(itemId)
    ? 'Shelf'
    : isTerminalItemId(itemId)
      ? 'Terminal'
      : isBroadcasterItemId(itemId)
        ? 'Broadcaster'
        : 'Cashier';
  return { ok: true, message: `Placed ${label}`, layout: next };
}

export function removeLodgeFurniture(layout: LodgeLayout, furnitureId: string): { ok: boolean; layout: LodgeLayout } {
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
    adjustLodgeFurnitureQty(piece.itemId, 1);
  }

  const next = saveLodgeLayout({
    ...layout,
    furniture: layout.furniture.filter((f) => f.id !== furnitureId),
  });
  return { ok: true, layout: next };
}

export function bindListingToShelf(
  layout: LodgeLayout,
  shelfId: string,
  listing: LodgeListingBind | null,
): { ok: boolean; message: string; layout: LodgeLayout } {
  const idx = layout.furniture.findIndex((f) => f.id === shelfId);
  if (idx < 0) return { ok: false, message: 'Shelf not found', layout };
  if (!isShelfItemId(layout.furniture[idx].itemId)) {
    return { ok: false, message: 'Not a shelf', layout };
  }
  const furniture = layout.furniture.map((f, i) => (i === idx ? { ...f, listing } : f));
  const next = saveLodgeLayout({ ...layout, furniture });
  return { ok: true, message: listing ? 'Listing bound' : 'Listing cleared', layout: next };
}

export function setConsoleLoadedTitles(
  layout: LodgeLayout,
  furnitureId: string,
  loadedTitles: string[],
): { ok: boolean; message: string; layout: LodgeLayout } {
  const idx = layout.furniture.findIndex((f) => f.id === furnitureId);
  if (idx < 0) return { ok: false, message: 'Console not found', layout };
  if (!isConsoleItemId(layout.furniture[idx].itemId)) {
    return { ok: false, message: 'Not a Console', layout };
  }
  const furniture = layout.furniture.map((f, i) =>
    i === idx ? { ...f, loadedTitles: normalizeLoadedTitles(loadedTitles) } : f,
  );
  const next = saveLodgeLayout({ ...layout, furniture });
  return { ok: true, message: 'Titles updated', layout: next };
}

export function setBroadcasterStreamUrl(
  layout: LodgeLayout,
  furnitureId: string,
  streamUrl: string,
): { ok: boolean; message: string; layout: LodgeLayout } {
  const idx = layout.furniture.findIndex((f) => f.id === furnitureId);
  if (idx < 0) return { ok: false, message: 'Broadcaster not found', layout };
  if (!isBroadcasterItemId(layout.furniture[idx].itemId)) {
    return { ok: false, message: 'Not a Broadcaster', layout };
  }
  const cleaned = sanitizeStoredStreamUrl(streamUrl);
  if (String(streamUrl || '').trim() && !cleaned) {
    return { ok: false, message: 'Only x.com / twitter.com live links are allowed', layout };
  }
  const furniture = layout.furniture.map((f, i) => (i === idx ? { ...f, streamUrl: cleaned } : f));
  const next = saveLodgeLayout({ ...layout, furniture });
  return { ok: true, message: cleaned ? 'Stream URL saved' : 'Stream cleared', layout: next };
}

/** Soft-launch in-store Console upgrade: bump itemId, keep loadedTitles. */
export function upgradeConsoleFurniture(
  layout: LodgeLayout,
  furnitureId: string,
): { ok: boolean; message: string; layout: LodgeLayout } {
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
  const next = saveLodgeLayout({ ...layout, furniture });
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
  layout: LodgeLayout,
  furnitureId: string,
): { ok: boolean; message: string; layout: LodgeLayout } {
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
  const next = saveLodgeLayout({ ...layout, furniture });
  return {
    ok: true,
    message: `Upgraded Cashier to level ${nextId - CASHIER_ITEM_ID_START + 1}`,
    layout: next,
  };
}

export function furnitureAt(layout: LodgeLayout, x: number, y: number): LodgeFurniturePiece | undefined {
  return layout.furniture.find((f) => f.x === x && f.y === y);
}

export function makeDemoListing(seed = 1): LodgeListingBind {
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
