import type { GotchiverseParcel, Installation, NetworkNames } from 'types';
import installationsDb from 'shared_code/data/installations.json';
import { getInstallationDisplays, getTileDisplays } from 'assets/images/installations';
import { PARCELS_BY_TOKEN_ID } from 'shared_code/models/model.realm';

/** S3 citaadel art keyed by numeric Realm tokenId. */
export function paarcelImageUrl(realmTokenId: string | number): string {
  return `https://gotchiverse.s3.ap-northeast-1.amazonaws.com/${String(realmTokenId).trim()}.png`;
}

function staticAssetSrc(img: unknown): string {
  if (!img) return '';
  if (typeof img === 'string') return img;
  if (typeof img === 'object' && img !== null && 'src' in img) {
    const src = (img as { src?: unknown }).src;
    return typeof src === 'string' ? src : '';
  }
  return '';
}

/**
 * Candidate URLs for installation/tile thumbs (first that loads wins).
 * Prefer public paths — webpack `require()` returns StaticImageData, not a string.
 */
export function installationImageCandidates(
  itemTypeId: number,
  kind: 'installation' | 'tile' = 'installation',
): string[] {
  const id = Number(itemTypeId);
  if (!Number.isFinite(id) || id <= 0) return [];
  if (kind === 'tile') {
    const fromRequire = staticAssetSrc(getTileDisplays(id).img);
    return [`/images/tiles/Tile_LE_${id}.png`, fromRequire].filter(Boolean);
  }
  let fromRequire = '';
  try {
    fromRequire = staticAssetSrc(getInstallationDisplays(id).img);
  } catch {
    /* ignore */
  }
  return [
    `/images/installations/png/${id}.png`,
    `/images/installations/png/${id}.gif`,
    fromRequire,
    `https://app.aavegotchi.com/images/installations/${id}.gif`,
    `https://app.aavegotchi.com/images/installations/${id}.png`,
  ].filter((u, i, arr) => Boolean(u) && arr.indexOf(u) === i);
}

/** Primary installation / tile thumb URL. */
export function installationImageSrc(
  itemTypeId: number,
  kind: 'installation' | 'tile' = 'installation',
): string {
  return installationImageCandidates(itemTypeId, kind)[0] || '';
}

export type CInstallation = {
  id: string;
  itemTypeId: number;
  kind: 'installation' | 'tile';
  name: string;
  x?: number;
  y?: number;
  installationType?: number;
  source?: string;
  sourceRealmTokenId?: string;
  refId?: string;
  equippedToParcelId?: string | null;
  mintedAt?: string;
};

export type CPaarcel = {
  id: string;
  realmTokenId: string;
  parcelId: string;
  size: string;
  district?: number;
  source?: string;
  refId?: string;
  installations: CInstallation[];
  mintedAt?: string;
};

export type MintablePaarcelRow = {
  key: string;
  realmTokenId: string;
  parcelId: string;
  size: string;
  district?: number;
  name: string;
  installations: Array<{
    itemTypeId: number;
    kind: 'installation' | 'tile';
    name: string;
    x?: number;
    y?: number;
    installationType?: number;
  }>;
  alreadyMinted: boolean;
  importFeeUsd: number;
};

export type MintableInstallationRow = {
  key: string;
  itemTypeId: number;
  kind: 'installation' | 'tile';
  name: string;
  balanceIndex: number;
  sourceRealmTokenId?: string;
  x?: number;
  y?: number;
  installationType?: number;
  alreadyMinted: boolean;
  importFeeUsd: number;
  /** wallet-import | parcel-equip */
  source: 'wallet-import' | 'parcel-equip';
};

export type PaarcelStack = {
  size: string;
  count: number;
  items: CPaarcel[];
};

type InstallationDbRow = {
  itemId?: number;
  name?: string;
  installationType?: number;
  type?: string;
};

const INSTALLATIONS_BY_ID = installationsDb as Record<string, InstallationDbRow>;

const SIZE_BY_CODE: Record<number, string> = {
  0: 'humble',
  1: 'reasonable',
  2: 'spacious',
  3: 'partner',
  4: 'partner',
  5: 'partner',
};

export function paarcelImportRefId(realmTokenId: string): string {
  return `import-parcel-${String(realmTokenId).trim()}`;
}

export function installationWalletRefId(itemTypeId: number, balanceIndex: number): string {
  return `import-install-${itemTypeId}-${balanceIndex}`;
}

export function installationParcelEquipRefId(
  realmTokenId: string,
  itemTypeId: number,
  x: number,
  y: number,
  kind: 'installation' | 'tile' = 'installation',
): string {
  return `import-parcel-${realmTokenId}-${itemTypeId}-${x}-${y}-${kind}`;
}

export function installationDisplayMeta(itemTypeId: number): {
  name: string;
  installationType: number;
  kind: 'installation' | 'tile';
} {
  const row = INSTALLATIONS_BY_ID[String(itemTypeId)];
  const kind = String(row?.type || '').toUpperCase() === 'TILE' ? 'tile' : 'installation';
  return {
    name: String(row?.name || (kind === 'tile' ? `Tile ${itemTypeId}` : `Installation ${itemTypeId}`)),
    installationType: Number(row?.installationType) || 0,
    kind,
  };
}

export function sizeLabelFromParcel(parcel: GotchiverseParcel | { size?: string | number }): string {
  const raw = (parcel as { size?: string | number })?.size;
  const n = Number(raw);
  if (Number.isFinite(n) && SIZE_BY_CODE[n] != null) return SIZE_BY_CODE[n];
  const s = String(raw || '').trim().toLowerCase();
  return s || 'humble';
}

function shadeHex(hex: string, factor: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  if (!Number.isFinite(n)) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * factor);
  const g = clamp(((n >> 8) & 255) * factor);
  const b = clamp((n & 255) * factor);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Parcel size → neon tile colors (humble blue, reasonable green, spacious pink). */
const PARCEL_SIZE_BORDER: Record<string, string> = {
  humble: '#3b9eff',
  reasonable: '#3dd68c',
  spacious: '#ff7ae9',
  partner: '#f0c040',
};

/** Common purple — same band as wearable common (#5c25bf). */
const INSTALL_COMMON_BORDER = '#5c25bf';

function toneCssVars(border: string): Record<string, string> {
  return {
    '--rarity-border': border,
    '--rarity-bg': shadeHex(border, 0.72),
    '--rarity-label': shadeHex(border, 0.55),
    '--rarity-glow': shadeHex(border, 1.12),
  };
}

/** CSS custom props for size-colored parcel mint tiles. */
export function paarcelSizeCssVars(size: string | undefined): Record<string, string> {
  const key = String(size || 'humble').trim().toLowerCase();
  return toneCssVars(PARCEL_SIZE_BORDER[key] || PARCEL_SIZE_BORDER.humble);
}

/** CSS custom props for installation mint tiles (common purple). */
export function installationCommonCssVars(): Record<string, string> {
  return toneCssVars(INSTALL_COMMON_BORDER);
}

function allInstallationRefIds(parcels: CPaarcel[], installs: CInstallation[]): Set<string> {
  const set = new Set<string>();
  for (const p of parcels || []) {
    if (p?.refId) set.add(String(p.refId));
    for (const i of p?.installations || []) {
      if (i?.refId) set.add(String(i.refId));
    }
  }
  for (const i of installs || []) {
    if (i?.refId) set.add(String(i.refId));
  }
  return set;
}

/** Owned Base parcels not yet in parcelInventory. Excludes lent/rented. */
export function listMintablePaarcelsFromOwned(
  ownedParcels: GotchiverseParcel[] | null | undefined,
  parcelInventory: CPaarcel[] | null | undefined,
  opts?: { owner?: string | null },
): MintablePaarcelRow[] {
  const mintedRefs = new Set((parcelInventory || []).map((p) => String(p.refId || '')));
  const ownerWanted = String(opts?.owner || '')
    .trim()
    .toLowerCase();
  const rows: MintablePaarcelRow[] = [];
  for (const parcel of ownedParcels || []) {
    if (!parcel) continue;
    if (parcel.isLent) continue;
    const parcelOwner = String(parcel.owner || '')
      .trim()
      .toLowerCase();
    // Proactive: never list rented / access-only rows for mint.
    if (ownerWanted && parcelOwner && parcelOwner !== ownerWanted) continue;
    const realmTokenId = String(parcel.tokenId || parcel.id || '').trim();
    if (!/^\d+$/.test(realmTokenId)) continue;
    const refId = paarcelImportRefId(realmTokenId);
    const equipped = Array.isArray(parcel.equippedInstallations) ? parcel.equippedInstallations : [];
    const installations = equipped
      .map((eq, idx) => {
        const itemTypeId = Number(eq?.id);
        if (!Number.isFinite(itemTypeId) || itemTypeId <= 0) return null;
        const meta = installationDisplayMeta(itemTypeId);
        return {
          itemTypeId,
          kind: meta.kind,
          name: meta.name,
          x: idx,
          y: 0,
          installationType: meta.installationType,
        };
      })
      .filter(Boolean) as MintablePaarcelRow['installations'];

    const meta =
      PARCELS_BY_TOKEN_ID[realmTokenId] || PARCELS_BY_TOKEN_ID[Number(realmTokenId)] || undefined;
    const parcelId = String(parcel.parcelId || meta?.parcelId || realmTokenId);
    // parcelHash is the human name (e.g. "world-if-so"); parcelId is C-x-y-H.
    const displayName = String(parcel.parcelHash || meta?.parcelHash || parcelId);
    rows.push({
      key: refId,
      realmTokenId,
      parcelId,
      size: sizeLabelFromParcel(parcel),
      district: Number(parcel.district) || Number(meta?.district) || undefined,
      name: displayName,
      installations,
      alreadyMinted: mintedRefs.has(refId),
      importFeeUsd: 0,
    });
  }
  return rows.sort((a, b) => Number(a.realmTokenId) - Number(b.realmTokenId));
}

/**
 * Pull equipped installs + tiles from on-chain realm grids (same source as play mode).
 * Returns [] when grids are empty; null when the fetch fails.
 */
export async function fetchOnChainEquippedInstallations(opts: {
  parcelId: string;
  realmTokenId: string;
  network: NetworkNames;
  provider: unknown;
}): Promise<MintablePaarcelRow['installations'] | null> {
  const parcelId = String(opts.parcelId || '').trim();
  const realmTokenId = String(opts.realmTokenId || '').trim();
  if (!parcelId || !/^\d+$/.test(realmTokenId) || !opts.network || !opts.provider) return null;

  const meta =
    PARCELS_BY_TOKEN_ID[realmTokenId] || PARCELS_BY_TOKEN_ID[Number(realmTokenId)] || undefined;
  let type = String((meta as { type?: string } | undefined)?.type || '').trim();
  if (!type && parcelId.charAt(0) === 'C') {
    const parts = parcelId.split('-');
    type = String(parts[3] || '').trim();
  }
  if (!type) return null;

  try {
    const { getContract } = await import('web3/contract');
    const { fetchContractGrid, getInstallationIdsbyGrid } = await import(
      'shared_code/utils/shared.utils.installations'
    );
    const realmDiamond = await getContract(opts.network, opts.provider as never);
    if (!realmDiamond) return null;

    const [installGrid, tileGrid] = await Promise.all([
      fetchContractGrid(realmDiamond, { type, tokenId: realmTokenId }, 0),
      fetchContractGrid(realmDiamond, { type, tokenId: realmTokenId }, 1),
    ]);

    const installIds = installGrid
      ? (getInstallationIdsbyGrid(parcelId, installGrid, 0) as string[]) || []
      : [];
    const tileIds = tileGrid ? (getInstallationIdsbyGrid(parcelId, tileGrid, 1) as string[]) || [] : [];
    const ids = [...installIds, ...tileIds];
    const out: MintablePaarcelRow['installations'] = [];
    for (const id of ids) {
      const parts = String(id || '').split('_');
      if (parts.length < 5) continue;
      const itemTypeId = Number(parts[1]);
      const x = Number(parts[2]);
      const y = Number(parts[3]);
      const isTile = Number(parts[4]) === 1;
      if (!Number.isFinite(itemTypeId) || itemTypeId <= 0) continue;
      const kind = isTile ? 'tile' : 'installation';
      const display = installationDisplayMeta(itemTypeId);
      out.push({
        itemTypeId,
        kind,
        name: display.name,
        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0,
        installationType: display.installationType,
      });
    }
    return out;
  } catch (e) {
    console.warn('@fetchOnChainEquippedInstallations', realmTokenId, e);
    return null;
  }
}

/** Prefer on-chain grid equips; fall back to subgraph/list snapshot already on the row. */
export async function enrichMintablePaarcelWithOnChainEquips(
  row: MintablePaarcelRow,
  opts: { network: NetworkNames; provider: unknown },
): Promise<MintablePaarcelRow> {
  const onChain = await fetchOnChainEquippedInstallations({
    parcelId: row.parcelId,
    realmTokenId: row.realmTokenId,
    network: opts.network,
    provider: opts.provider,
  });
  if (!onChain) return row;
  return { ...row, installations: onChain };
}

export async function enrichMintablePaarcelsWithOnChainEquips(
  rows: MintablePaarcelRow[],
  opts: { network: NetworkNames; provider: unknown; concurrency?: number },
): Promise<MintablePaarcelRow[]> {
  const concurrency = Math.max(1, Math.min(opts.concurrency || 4, 8));
  const out: MintablePaarcelRow[] = new Array(rows.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (cursor < rows.length) {
      const i = cursor++;
      out[i] = await enrichMintablePaarcelWithOnChainEquips(rows[i], opts);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Confirm realmTokenId is owned by wallet via Base Realm ownerOf (FE provider). */
export async function assertParcelOwnedByWallet(opts: {
  realmTokenId: string;
  wallet: string;
  network: NetworkNames;
  provider: unknown;
}): Promise<boolean> {
  const tid = String(opts.realmTokenId || '').trim();
  const wallet = String(opts.wallet || '')
    .trim()
    .toLowerCase();
  if (!/^\d+$/.test(tid) || !/^0x[a-f0-9]{40}$/.test(wallet) || !opts.network || !opts.provider) {
    return false;
  }
  try {
    const { getContract } = await import('web3/contract');
    const realm = await getContract(opts.network, opts.provider as never);
    if (!realm?.ownerOf) return false;
    const owner = String(await realm.ownerOf(tid)).toLowerCase();
    return owner === wallet;
  } catch (e) {
    console.warn('@assertParcelOwnedByWallet', tid, e);
    return false;
  }
}

/** Filter mint rows to parcels the wallet currently owns on-chain. */
export async function filterMintablePaarcelsOwnedByWallet(
  rows: MintablePaarcelRow[],
  opts: { wallet: string; network: NetworkNames; provider: unknown },
): Promise<{ owned: MintablePaarcelRow[]; skipped: MintablePaarcelRow[] }> {
  const owned: MintablePaarcelRow[] = [];
  const skipped: MintablePaarcelRow[] = [];
  for (const row of rows) {
    const ok = await assertParcelOwnedByWallet({
      realmTokenId: row.realmTokenId,
      wallet: opts.wallet,
      network: opts.network,
      provider: opts.provider,
    });
    if (ok) owned.push(row);
    else skipped.push(row);
  }
  return { owned, skipped };
}

/** Wallet installation balances not yet in installationInventory (or nested on parcels). */
export function listMintableWalletInstallations(
  inventory: Installation[] | null | undefined,
  parcelInventory: CPaarcel[] | null | undefined,
  installationInventory: CInstallation[] | null | undefined,
): MintableInstallationRow[] {
  const taken = allInstallationRefIds(parcelInventory || [], installationInventory || []);
  const rows: MintableInstallationRow[] = [];
  for (const item of inventory || []) {
    const itemTypeId = Number(item?.id ?? item?.itemId);
    if (!Number.isFinite(itemTypeId) || itemTypeId <= 0) continue;
    const bal = Math.max(0, Math.floor(Number(item?.quantity) || 0));
    if (bal <= 0) continue;
    const meta = installationDisplayMeta(itemTypeId);
    for (let i = 0; i < bal; i++) {
      const refId = installationWalletRefId(itemTypeId, i);
      rows.push({
        key: refId,
        itemTypeId,
        kind: meta.kind,
        name: meta.name,
        balanceIndex: i,
        installationType: meta.installationType,
        alreadyMinted: taken.has(refId),
        importFeeUsd: 0,
        source: 'wallet-import',
      });
    }
  }
  return rows.filter((r) => !r.alreadyMinted || true).sort((a, b) => a.itemTypeId - b.itemTypeId || a.balanceIndex - b.balanceIndex);
}

/** Flatten equipped installs on mintable parcels as optional installationInventory lines. */
export function listMintableInstallationsOnParcels(
  mintableParcels: MintablePaarcelRow[],
  parcelInventory: CPaarcel[] | null | undefined,
  installationInventory: CInstallation[] | null | undefined,
): MintableInstallationRow[] {
  const taken = allInstallationRefIds(parcelInventory || [], installationInventory || []);
  const rows: MintableInstallationRow[] = [];
  for (const parcel of mintableParcels || []) {
    for (const inst of parcel.installations || []) {
      const x = Number.isFinite(Number(inst.x)) ? Number(inst.x) : 0;
      const y = Number.isFinite(Number(inst.y)) ? Number(inst.y) : 0;
      const kind = inst.kind === 'tile' ? 'tile' : 'installation';
      const refId = installationParcelEquipRefId(parcel.realmTokenId, inst.itemTypeId, x, y, kind);
      rows.push({
        key: refId,
        itemTypeId: inst.itemTypeId,
        kind,
        name: inst.name,
        balanceIndex: 0,
        sourceRealmTokenId: parcel.realmTokenId,
        x,
        y,
        installationType: inst.installationType,
        alreadyMinted: taken.has(refId),
        importFeeUsd: 0,
        source: 'parcel-equip',
      });
    }
  }
  return rows;
}

export function stackPaarcelInventory(inventory: CPaarcel[] | null | undefined): PaarcelStack[] {
  const bySize = new Map<string, CPaarcel[]>();
  for (const p of inventory || []) {
    if (!p) continue;
    const size = String(p.size || 'humble');
    const list = bySize.get(size) || [];
    list.push(p);
    bySize.set(size, list);
  }
  return Array.from(bySize.entries())
    .map(([size, items]) => ({ size, count: items.length, items }))
    .sort((a, b) => a.size.localeCompare(b.size));
}

export function normalizeCInstallations(raw: unknown): CInstallation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const itemTypeId = Number(r.itemTypeId);
      if (!Number.isFinite(itemTypeId) || itemTypeId <= 0) return null;
      const kind = String(r.kind || 'installation') === 'tile' ? 'tile' : 'installation';
      return {
        id: String(r.id || ''),
        itemTypeId,
        kind,
        name: String(r.name || installationDisplayMeta(itemTypeId).name),
        x: r.x != null ? Number(r.x) : undefined,
        y: r.y != null ? Number(r.y) : undefined,
        installationType: r.installationType != null ? Number(r.installationType) : undefined,
        source: r.source != null ? String(r.source) : undefined,
        sourceRealmTokenId: r.sourceRealmTokenId != null ? String(r.sourceRealmTokenId) : undefined,
        refId: r.refId != null ? String(r.refId) : undefined,
        equippedToParcelId: r.equippedToParcelId != null ? String(r.equippedToParcelId) : null,
        mintedAt: r.mintedAt != null ? String(r.mintedAt) : undefined,
      } as CInstallation;
    })
    .filter(Boolean) as CInstallation[];
}

export function normalizeCPaarcels(raw: unknown): CPaarcel[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const realmTokenId = String(r.realmTokenId || '').trim();
      if (!/^\d+$/.test(realmTokenId)) return null;
      return {
        id: String(r.id || ''),
        realmTokenId,
        parcelId: String(r.parcelId || realmTokenId),
        size: String(r.size || 'humble'),
        district: r.district != null ? Number(r.district) : undefined,
        source: r.source != null ? String(r.source) : undefined,
        refId: r.refId != null ? String(r.refId) : paarcelImportRefId(realmTokenId),
        installations: normalizeCInstallations(r.installations),
        mintedAt: r.mintedAt != null ? String(r.mintedAt) : undefined,
      } as CPaarcel;
    })
    .filter(Boolean) as CPaarcel[];
}

/** Map soft-launch cPaarcels into the spawn-list / ParcelCard shape. */
export function cPaarcelToGotchiverseParcel(c: CPaarcel, owner?: string): GotchiverseParcel | null {
  const realmTokenId = String(c?.realmTokenId || '').trim();
  if (!/^\d+$/.test(realmTokenId)) return null;
  const meta =
    PARCELS_BY_TOKEN_ID[realmTokenId] || PARCELS_BY_TOKEN_ID[Number(realmTokenId)] || undefined;
  const rawParcelId = String(c.parcelId || meta?.parcelId || '').trim();
  const parcelId =
    rawParcelId.charAt(0) === 'C' ? rawParcelId : String(meta?.parcelId || rawParcelId || realmTokenId);
  const parcelHash = String(meta?.parcelHash || c.parcelId || parcelId || realmTokenId);
  return {
    id: realmTokenId,
    tokenId: realmTokenId,
    parcelId,
    parcelHash,
    district: Number(c.district ?? meta?.district) || 0,
    owner: owner || undefined,
    isLent: false,
    equippedInstallations: (c.installations || [])
      .map((inst) => {
        const id = Number(inst?.itemTypeId);
        if (!Number.isFinite(id) || id <= 0) return null;
        return { id: String(id) };
      })
      .filter(Boolean) as Array<{ id: string }>,
  };
}

export function cPaarcelsToGotchiverseParcels(
  inventory: CPaarcel[] | null | undefined,
  owner?: string,
): GotchiverseParcel[] {
  return (inventory || [])
    .map((c) => cPaarcelToGotchiverseParcel(c, owner))
    .filter(Boolean) as GotchiverseParcel[];
}

export function paarcelsFromCartridgeSnapshot(snapshot: unknown): {
  parcelInventory: CPaarcel[];
  installationInventory: CInstallation[];
} {
  if (!snapshot || typeof snapshot !== 'object') {
    return { parcelInventory: [], installationInventory: [] };
  }
  const doc = snapshot as Record<string, unknown>;
  return {
    parcelInventory: normalizeCPaarcels(doc.parcelInventory),
    installationInventory: normalizeCInstallations(doc.installationInventory),
  };
}
