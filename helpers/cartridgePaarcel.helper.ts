import type { GotchiverseParcel, Installation } from 'types';
import installationsDb from 'shared_code/data/installations.json';
import { getInstallationDisplays, getTileDisplays } from 'assets/images/installations';

/** S3 citaadel art keyed by numeric Realm tokenId. */
export function paarcelImageUrl(realmTokenId: string | number): string {
  return `https://gotchiverse.s3.ap-northeast-1.amazonaws.com/${String(realmTokenId).trim()}.png`;
}

/** Local static PNG for installation / tile mint gallery thumbs. */
export function installationImageSrc(
  itemTypeId: number,
  kind: 'installation' | 'tile' = 'installation',
): string {
  const id = Number(itemTypeId);
  if (!Number.isFinite(id) || id <= 0) return '';
  try {
    if (kind === 'tile') return String(getTileDisplays(id).img || '');
    return String(getInstallationDisplays(id).img || '');
  } catch {
    return '';
  }
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
): MintablePaarcelRow[] {
  const mintedRefs = new Set((parcelInventory || []).map((p) => String(p.refId || '')));
  const rows: MintablePaarcelRow[] = [];
  for (const parcel of ownedParcels || []) {
    if (!parcel) continue;
    if (parcel.isLent) continue;
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

    const parcelId = String(parcel.parcelId || parcel.parcelHash || realmTokenId);
    rows.push({
      key: refId,
      realmTokenId,
      parcelId,
      size: sizeLabelFromParcel(parcel),
      district: Number(parcel.district) || undefined,
      name: parcelId,
      installations,
      alreadyMinted: mintedRefs.has(refId),
      importFeeUsd: 0,
    });
  }
  return rows.sort((a, b) => Number(a.realmTokenId) - Number(b.realmTokenId));
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
