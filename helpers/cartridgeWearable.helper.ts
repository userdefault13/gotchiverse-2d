import type { GotchiverseAavegotchi } from 'types';
import Items from 'data/items.json';

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
};

function itemByTypeId(itemTypeId: number): ItemRow | undefined {
  const list = Items as ItemRow[];
  return list.find((row) => Number(row?.svgId) === itemTypeId);
}

function rarityFromModifier(mod: number): string {
  return RARITY_BY_MODIFIER[mod] || 'common';
}

function modifierFromMaxQuantity(maxQuantity: number): number {
  // Rough fallback when rarityScoreModifier missing from items.json
  if (maxQuantity >= 1000) return 1;
  if (maxQuantity >= 500) return 2;
  if (maxQuantity >= 250) return 5;
  if (maxQuantity >= 100) return 10;
  if (maxQuantity >= 10) return 20;
  return 50;
}

export function slotLabel(slotIndex: number): string {
  return SLOT_LABELS[slotIndex] || `Slot ${slotIndex}`;
}

const GOTCHI_CARD_RARITIES = new Set(['common', 'uncommon', 'rare', 'legendary']);

/** CSS custom props for rarity-colored wearable tiles (border / glow / fill). */
export function wearableRarityCssVars(rarity: string | undefined): Record<string, string> {
  const r = String(rarity || 'common').toLowerCase();
  if (GOTCHI_CARD_RARITIES.has(r)) {
    return {
      '--rarity-border': `var(--col-gotchi-${r}-card-border)`,
      '--rarity-bg': `var(--col-gotchi-${r}-card-bg)`,
      '--rarity-label': `var(--col-gotchi-${r}-card-label-bg)`,
      '--rarity-glow': `var(--col-gotchi-${r}-card-border)`,
    };
  }
  // mythical / godlike (and fallbacks) use the shared rarity scale
  const tone = ['mythical', 'godlike'].includes(r) ? r : 'common';
  return {
    '--rarity-border': `var(--col-${tone}-400)`,
    '--rarity-bg': `var(--col-${tone}-500)`,
    '--rarity-label': `var(--col-${tone}-500)`,
    '--rarity-glow': `var(--col-${tone}-300)`,
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
  const item = itemByTypeId(itemTypeId);
  const modRaw = Number(item?.rarityScoreModifier);
  const mod = Number.isFinite(modRaw) && modRaw > 0
    ? modRaw
    : modifierFromMaxQuantity(Number(item?.maxQuantity) || 0);
  return {
    name: String(item?.name || `Wearable #${itemTypeId}`),
    rarity: rarityFromModifier(mod),
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
      map.set(id, {
        itemTypeId: id,
        name: item.name,
        rarity: item.rarity,
        rarityScoreModifier: item.rarityScoreModifier,
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
