import type { GotchiverseAavegotchi } from 'types';
import Items from 'data/items.json';
import rarityDb from 'data/aavegotchi/aavegotchi_db_rarity.json';
import wearableRarityIndex from 'data/aavegotchi/wearable_rarity_index.json';

export type CWearable = {
  id: string;
  itemTypeId: number;
  name: string;
  rarity: string;
  rarityScoreModifier: number;
  slotIndex: number;
  source?: string;
  sourceTokenId?: string;
  equippedTo?: string | null;
  refId?: string;
  mintedAt?: string;
};

export type EquippedWearableSlot = {
  slotIndex: number;
  itemTypeId: number;
  name: string;
  rarity: string;
  rarityScoreModifier: number;
  /** USD quote for rental/borrow import; 0 when owned/free. */
  importFeeUsd: number;
};

const RARITY_BY_MODIFIER: Record<number, string> = {
  1: 'common',
  2: 'uncommon',
  5: 'rare',
  10: 'legendary',
  20: 'mythical',
  50: 'godlike',
};

const MODIFIER_BY_RARITY: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 5,
  legendary: 10,
  mythical: 20,
  godlike: 50,
};

type WearableRarityIndexRow = {
  name?: string;
  rarity?: string;
  rarityScoreModifier?: number;
};

const WEARABLE_RARITY_BY_ID = wearableRarityIndex as Record<string, WearableRarityIndexRow>;

/** Hex from Paarcel `aavegotchi_db_rarity.json` trait-band ranges. */
function rarityBandHex(rangeKey: string, fallback: string): string {
  const ranges = (rarityDb as { rarityColors?: { ranges?: Record<string, { hex?: string }> } })
    ?.rarityColors?.ranges;
  const hex = ranges?.[rangeKey]?.hex;
  return typeof hex === 'string' && hex.startsWith('#') ? hex : fallback;
}

function shadeHex(hex: string, factor: number): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return hex;
  const n = parseInt(raw, 16);
  if (Number.isNaN(n)) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * factor);
  const g = clamp(((n >> 8) & 255) * factor);
  const b = clamp((n & 255) * factor);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Wearable tile colors from Paarcel `Assets/Resources/Aavegotchi/JSONs/aavegotchi_db_rarity.json`.
 * Trait-band hexes mapped onto wearable tiers (high-band for mid/high, low-band for mythical).
 */
function buildWearableRarityColors(): Record<
  string,
  { border: string; bg: string; label: string; glow: string }
> {
  const uncommon = rarityBandHex('75-90', '#37828e');
  const rare = rarityBandHex('91-97', '#ea8d27');
  const mythicalHigh = rarityBandHex('98-99', '#4fffa9'); // mint — legendary / godlike
  const mythicalLow = rarityBandHex('0-1', '#fe01ff');
  // Common band has no single hex in the JSON; use Uncommon-low purple (#5c25bf).
  const commonPurple = rarityBandHex('10-24', '#5c25bf');
  const mk = (border: string, bgFactor = 0.72, labelFactor = 0.55, glowFactor = 1.12) => ({
    border,
    bg: shadeHex(border, bgFactor),
    label: shadeHex(border, labelFactor),
    glow: shadeHex(border, glowFactor),
  });
  return {
    common: mk(commonPurple),
    uncommon: mk(uncommon),
    rare: mk(rare),
    legendary: mk(mythicalHigh),
    mythical: mk(mythicalLow),
    godlike: mk(mythicalHigh, 0.55, 0.4, 1.05),
  };
}

const WEARABLE_RARITY_COLORS = buildWearableRarityColors();

/** Reduced rental/borrow import fees (matches Aarcade). */
const RARITY_IMPORT_FEE_USD: Record<number, number> = {
  1: 1,
  2: 1.5,
  5: 2.5,
  10: 5,
  20: 10,
  50: 25,
};

const SLOT_LABELS = [
  'Body',
  'Face',
  'Eyes',
  'Head',
  'Left hand',
  'Right hand',
  'Pet',
  'Background',
  'Slot 8',
  'Slot 9',
  'Slot 10',
  'Slot 11',
  'Slot 12',
  'Slot 13',
  'Slot 14',
  'Slot 15',
];

type ItemRow = {
  svgId?: number | string;
  name?: string;
  rarityScoreModifier?: number | string;
  maxQuantity?: number | string;
  rarityLevel?: string;
};

function itemByTypeId(itemTypeId: number): ItemRow | undefined {
  const list = Items as ItemRow[];
  return list.find((row) => Number(row?.svgId) === itemTypeId);
}

function rarityFromModifier(mod: number): string {
  return RARITY_BY_MODIFIER[mod] || 'common';
}

function normalizeRarityLevel(raw: string | undefined): string | null {
  const r = String(raw || '')
    .trim()
    .toLowerCase();
  return MODIFIER_BY_RARITY[r] ? r : null;
}

/**
 * Wiki quantity → BRS bonus mapping
 * https://wiki.aavegotchi.com/en/wearables
 * Common 1000 (+1), Uncommon 500 (+2), Rare 250–308 (+5),
 * Legendary 100–150 (+10), Mythical 10–50 (+20), Godlike 5 (+50).
 */
function modifierFromMaxQuantity(maxQuantity: number): number {
  if (!Number.isFinite(maxQuantity) || maxQuantity <= 0) return 1; // unknown → common, never godlike
  if (maxQuantity >= 1000) return 1;
  if (maxQuantity >= 500) return 2;
  if (maxQuantity >= 250) return 5;
  if (maxQuantity >= 100) return 10;
  if (maxQuantity >= 10) return 20;
  return 50; // typically 5
}

export function slotLabel(slotIndex: number): string {
  return SLOT_LABELS[slotIndex] || `Slot ${slotIndex}`;
}

/** CSS custom props for rarity-colored wearable tiles (Paarcel rarity JSON hexes). */
export function wearableRarityCssVars(rarity: string | undefined): Record<string, string> {
  const r = String(rarity || 'common').toLowerCase();
  const colors = WEARABLE_RARITY_COLORS[r] || WEARABLE_RARITY_COLORS.common;
  return {
    '--rarity-border': colors.border,
    '--rarity-bg': colors.bg,
    '--rarity-label': colors.label,
    '--rarity-glow': colors.glow,
  };
}

export function importFeeUsdForModifier(mod: number, bindKind: 'owned' | 'rental'): number {
  if (bindKind === 'owned') return 0;
  return RARITY_IMPORT_FEE_USD[mod] ?? 1;
}

/** Official Aavegotchi item art CDN (itemTypeId === svgId). */
export function wearableThumbnailUrl(itemTypeId: number): string {
  return `https://app.aavegotchi.com/images/items/${Number(itemTypeId) || 0}.svg`;
}

export function wearableDisplayMeta(itemTypeId: number): {
  name: string;
  rarity: string;
  rarityScoreModifier: number;
} {
  const id = Number(itemTypeId) || 0;
  const fromPaarcel = WEARABLE_RARITY_BY_ID[String(id)];
  const paarcelRarity = normalizeRarityLevel(fromPaarcel?.rarity);
  const item = itemByTypeId(id);
  const fromLevel = normalizeRarityLevel(item?.rarityLevel);
  const modRaw = Number(item?.rarityScoreModifier);
  let mod: number;
  let rarity: string;

  if (paarcelRarity) {
    // Paarcel `aavegotchi_db_wearables.json` rarity (via wearable_rarity_index).
    rarity = paarcelRarity;
    mod =
      Number(fromPaarcel?.rarityScoreModifier) > 0
        ? Number(fromPaarcel?.rarityScoreModifier)
        : MODIFIER_BY_RARITY[paarcelRarity];
  } else if (fromLevel) {
    // Prefer explicit rarityLevel (e.g. Haunt 2 rows with qty 0 but level set).
    rarity = fromLevel;
    mod = MODIFIER_BY_RARITY[fromLevel];
  } else if (Number.isFinite(modRaw) && modRaw > 0) {
    mod = modRaw;
    rarity = rarityFromModifier(mod);
  } else {
    mod = modifierFromMaxQuantity(Number(item?.maxQuantity));
    rarity = rarityFromModifier(mod);
  }

  return {
    name: String(fromPaarcel?.name || item?.name || `Wearable #${id}`),
    rarity,
    rarityScoreModifier: mod,
  };
}

/** Non-zero equipped slots on a wallet gotchi. */
export function listEquippedWearableSlots(
  gotchi: GotchiverseAavegotchi | null | undefined,
  bindKind: 'owned' | 'rental' = 'owned',
): EquippedWearableSlot[] {
  const equipped = gotchi?.equippedWearables;
  if (!Array.isArray(equipped)) return [];
  const out: EquippedWearableSlot[] = [];
  for (let i = 0; i < Math.min(equipped.length, 16); i++) {
    const itemTypeId = Number(equipped[i]) || 0;
    if (itemTypeId <= 0) continue;
    const meta = wearableDisplayMeta(itemTypeId);
    out.push({
      slotIndex: i,
      itemTypeId,
      name: meta.name,
      rarity: meta.rarity,
      rarityScoreModifier: meta.rarityScoreModifier,
      importFeeUsd: importFeeUsdForModifier(meta.rarityScoreModifier, bindKind),
    });
  }
  return out;
}

/** Aarcade import identity — same source+item+slot = already minted; other sources stack. */
export function wearableImportRefId(
  sourceTokenId: string | number,
  itemTypeId: number,
  slotIndex: number,
): string {
  return `import-${String(sourceTokenId)}-${itemTypeId}-${slotIndex}`;
}

export type MintableWearableRow = EquippedWearableSlot & {
  sourceTokenId: string;
  gotchiName: string;
  bindKind: 'owned' | 'rental';
  alreadyMinted: boolean;
  key: string;
};

/** Equipped wearables on bound wallet gotchis that can be imported (stacks across sources). */
export function listMintableWearablesFromBoundGotchis(
  walletGotchis: GotchiverseAavegotchi[] | null | undefined,
  boundSourceTokenIds: Set<string>,
  inventory: CWearable[] | null | undefined,
): MintableWearableRow[] {
  const mintedRefs = new Set(
    (inventory || [])
      .map((w) => String(w.refId || '').trim())
      .filter(Boolean),
  );
  const out: MintableWearableRow[] = [];
  for (const gotchi of walletGotchis || []) {
    const tid = String(gotchi?.id || '').trim();
    if (!tid || !boundSourceTokenIds.has(tid)) continue;
    const bindKind: 'owned' | 'rental' = gotchi.isLent ? 'rental' : 'owned';
    for (const slot of listEquippedWearableSlots(gotchi, bindKind)) {
      const refId = wearableImportRefId(tid, slot.itemTypeId, slot.slotIndex);
      out.push({
        ...slot,
        sourceTokenId: tid,
        gotchiName: String(gotchi.name || `#${tid}`),
        bindKind,
        alreadyMinted: mintedRefs.has(refId),
        key: `${tid}:${slot.slotIndex}:${slot.itemTypeId}`,
      });
    }
  }
  return out;
}

export type WearableStack = {
  itemTypeId: number;
  name: string;
  rarity: string;
  rarityScoreModifier: number;
  count: number;
  /** Representative slot for display. */
  slotIndex: number;
  items: CWearable[];
};

/** Group cartridge inventory by itemTypeId for xN stack cards. */
export function stackWearableInventory(inventory: CWearable[] | null | undefined): WearableStack[] {
  const map = new Map<number, WearableStack>();
  for (const item of inventory || []) {
    const id = Number(item.itemTypeId);
    if (!Number.isFinite(id) || id <= 0) continue;
    const existing = map.get(id);
    if (existing) {
      existing.count += 1;
      existing.items.push(item);
    } else {
      // Re-resolve rarity from items.json / wiki qty so stacks aren't stuck on bad server labels.
      const meta = wearableDisplayMeta(id);
      map.set(id, {
        itemTypeId: id,
        name: item.name || meta.name,
        rarity: meta.rarity,
        rarityScoreModifier: meta.rarityScoreModifier,
        count: 1,
        slotIndex: item.slotIndex,
        items: [item],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeCWearables(raw: unknown): CWearable[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const w = row as Record<string, unknown>;
      const id = String(w.id || '').trim();
      const itemTypeId = Number(w.itemTypeId);
      if (!id || !Number.isFinite(itemTypeId) || itemTypeId <= 0) return null;
      const fallback = wearableDisplayMeta(itemTypeId);
      return {
        id,
        itemTypeId,
        name: String(w.name || fallback.name),
        rarity: String(w.rarity || fallback.rarity).toLowerCase(),
        rarityScoreModifier: Number(w.rarityScoreModifier) || fallback.rarityScoreModifier,
        slotIndex: Number(w.slotIndex) || 0,
        source: w.source ? String(w.source) : undefined,
        sourceTokenId: w.sourceTokenId != null ? String(w.sourceTokenId) : undefined,
        equippedTo: w.equippedTo != null ? String(w.equippedTo) : null,
        refId: w.refId ? String(w.refId) : undefined,
        mintedAt: w.mintedAt ? String(w.mintedAt) : undefined,
      } as CWearable;
    })
    .filter(Boolean) as CWearable[];
}

export function wearablesFromCartridgeSnapshot(snapshot: unknown): CWearable[] {
  if (!snapshot || typeof snapshot !== 'object') return [];
  const doc = snapshot as Record<string, unknown>;
  return normalizeCWearables(doc.wearableInventory);
}
