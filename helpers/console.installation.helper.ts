import _ from 'lodash';
import installationTypes from 'shared_code/data/installationsCatalog';
import { InstallationTypeLocal, Recipe } from 'types';

/**
 * Soft-launch Console catalog lives in `console.installations.local.json`.
 * Console L1–9: 199–207 · store furniture (installationType 10)
 */
export const CONSOLE_ITEM_ID_START = 199;
export const CONSOLE_ITEM_ID_END = 207;
/** Level-1 Console craft/place id */
export const CONSOLE_ITEM_ID = CONSOLE_ITEM_ID_START;
/** Furniture type shared with Shelf/Cashier. */
export const CONSOLE_INSTALLATION_TYPE = 10;
export const CONSOLE_SPRITE_KEY = 'console';

/** Soft-launch Aarcade games unlockable / playable from a Console. */
export const CONSOLE_AARCADE_GAMES: Array<{ id: string; name: string; tag?: string }> = [
  { id: 'gotchinopoly', name: 'Gotchinopoly', tag: 'Cartridge' },
  { id: 'billy-mandy', name: 'Billy Mandy', tag: 'Cartridge' },
  { id: 'fakewaars', name: 'FakeWaars', tag: 'Cartridge' },
  { id: 'gotp', name: 'Guardian of the Portal', tag: 'Cartridge' },
  { id: 'r-o-f-l', name: 'R.O.F.L', tag: 'Cartridge' },
  { id: 'lickquidaator', name: 'Lickquidaator', tag: 'Cartridge' },
  { id: 'paarcel', name: 'Paarcel', tag: 'Cartridge' },
];

export function isConsoleItemId(itemId: number | string): boolean {
  const id = Number(itemId);
  return id >= CONSOLE_ITEM_ID_START && id <= CONSOLE_ITEM_ID_END;
}

export function consoleLevelFromItemId(itemId: number | string): number {
  const id = Number(itemId);
  if (!isConsoleItemId(id)) return 0;
  return Math.max(1, Math.min(9, id - CONSOLE_ITEM_ID_START + 1));
}

/** L1–8: capacity = level. L9: unlimited (Infinity). */
export function consoleTitleCapacity(levelOrItemId: number): number {
  const level =
    levelOrItemId >= CONSOLE_ITEM_ID_START && levelOrItemId <= CONSOLE_ITEM_ID_END
      ? consoleLevelFromItemId(levelOrItemId)
      : Number(levelOrItemId) || 0;
  if (level >= 9) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.min(8, level));
}

export function isConsoleTitleUnlimited(levelOrItemId: number): boolean {
  return !Number.isFinite(consoleTitleCapacity(levelOrItemId));
}

export function normalizeLoadedTitles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of raw) {
    const id = String(row || '')
      .trim()
      .toLowerCase();
    if (!id || seen.has(id)) continue;
    if (!CONSOLE_AARCADE_GAMES.some((g) => g.id === id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function getConsoleGameMeta(gameId: string): { id: string; name: string; tag?: string } | undefined {
  const id = String(gameId || '')
    .trim()
    .toLowerCase();
  return CONSOLE_AARCADE_GAMES.find((g) => g.id === id);
}

type ConsoleTitlePiece = { itemId: number; loadedTitles?: string[] };

export function canLoadTitleOntoConsole(
  piece: ConsoleTitlePiece,
  gameId: string,
): { ok: boolean; message: string } {
  if (!isConsoleItemId(piece.itemId)) {
    return { ok: false, message: 'Not a Console' };
  }
  const title = String(gameId || '')
    .trim()
    .toLowerCase();
  if (!getConsoleGameMeta(title)) {
    return { ok: false, message: 'Unknown Aarcade title' };
  }
  const loaded = normalizeLoadedTitles(piece.loadedTitles);
  if (loaded.includes(title)) {
    return { ok: false, message: 'Title already loaded' };
  }
  const cap = consoleTitleCapacity(piece.itemId);
  if (Number.isFinite(cap) && loaded.length >= cap) {
    return { ok: false, message: `Console is full (${loaded.length}/${cap})` };
  }
  return { ok: true, message: 'ok' };
}

/** Returns next loadedTitles array if load is allowed. */
export function loadTitleOntoConsole(
  piece: ConsoleTitlePiece,
  gameId: string,
): { ok: boolean; message: string; loadedTitles: string[] } {
  const check = canLoadTitleOntoConsole(piece, gameId);
  const loaded = normalizeLoadedTitles(piece.loadedTitles);
  if (!check.ok) return { ...check, loadedTitles: loaded };
  const title = String(gameId || '')
    .trim()
    .toLowerCase();
  return { ok: true, message: 'Loaded', loadedTitles: [...loaded, title] };
}

/** Games shown in the play picker for this Console. L9 = full catalog. */
export function playableConsoleGames(
  piece: ConsoleTitlePiece,
): Array<{ id: string; name: string; tag?: string }> {
  if (isConsoleTitleUnlimited(piece.itemId)) {
    return [...CONSOLE_AARCADE_GAMES];
  }
  const loaded = new Set(normalizeLoadedTitles(piece.loadedTitles));
  return CONSOLE_AARCADE_GAMES.filter((g) => loaded.has(g.id));
}

function toRecipe(item: InstallationTypeLocal): Recipe {
  const cost = item.alchemicaCost || [0, 0, 0, 0];
  return {
    id: item.itemId,
    name: item.name,
    ingredients: {
      fud: Number(cost[0] || 0),
      fomo: Number(cost[1] || 0),
      alpha: Number(cost[2] || 0),
      kek: Number(cost[3] || 0),
    },
    craftingTime: Number(item.craftTime || 0),
    itemType: Number(item.installationType),
    type: 'INSTALLATION' as const,
    installationType: Number(item.installationType),
    deprecated: false,
    level: Number(item.level) || 1,
    endDate: undefined,
  };
}

/** Soft-launch Console L1 recipe (furniture bag). */
export function getLocalConsoleRecipes(): Recipe[] {
  return _.values(installationTypes)
    .filter((item) => isConsoleItemId(item.itemId) && Number(item.level) === 1)
    .map(toRecipe);
}

export interface LocalConsoleUpgradeInfo {
  current: {
    name: string;
    level: number;
    id: number;
    installationType: number;
    titleCapacity: number;
  };
  next?: {
    name: string;
    level: number;
    id: number;
    installationType: number;
    titleCapacity: number;
    upgradeCost: number[];
  };
}

export function getLocalConsoleUpgradeInfo(itemId: number): LocalConsoleUpgradeInfo | null {
  if (!isConsoleItemId(itemId)) return null;
  const current = installationTypes[String(itemId)] || installationTypes[itemId];
  if (!current) return null;

  const level = Number(current.level) || consoleLevelFromItemId(itemId);
  const info: LocalConsoleUpgradeInfo = {
    current: {
      name: current.name,
      level,
      id: Number(current.itemId),
      installationType: Number(current.installationType),
      titleCapacity: consoleTitleCapacity(level),
    },
  };

  const nextId = itemId + 1;
  if (nextId <= CONSOLE_ITEM_ID_END) {
    const next = installationTypes[String(nextId)] || installationTypes[nextId];
    if (next) {
      const nextLevel = Number(next.level) || consoleLevelFromItemId(nextId);
      const cost = next.alchemicaCost || [0, 0, 0, 0];
      info.next = {
        name: next.name,
        level: nextLevel,
        id: Number(next.itemId),
        installationType: Number(next.installationType),
        titleCapacity: consoleTitleCapacity(nextLevel),
        upgradeCost: cost.map((c) => Number(c)),
      };
    }
  }
  return info;
}

export function buildConsoleEmbedUrl(opts: {
  gameId: string;
  playerId?: string | null;
  cartridgeId?: string | null;
  aarcadeHome?: string;
}): string {
  const home = String(opts.aarcadeHome || process.env.NEXT_PUBLIC_AARCADE_HOME || 'https://aarcadeghst.com').replace(
    /\/$/,
    '',
  );
  const gameId = String(opts.gameId || '').trim();
  const qs = new URLSearchParams({ embed: '1' });
  if (opts.playerId) qs.set('playerId', String(opts.playerId).toLowerCase());
  if (opts.cartridgeId) qs.set('cartridgeId', String(opts.cartridgeId));
  return `${home}/games/${encodeURIComponent(gameId)}?${qs.toString()}`;
}
