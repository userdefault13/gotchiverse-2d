import type { GotchiverseAavegotchi, Tuple } from 'types';
import { collateralByAddress, collaterals, type CollateralObject } from 'helpers/ethers.helper';
import {
  padEquippedWearables,
  resolveHeroEquippedWearables,
  type CWearable,
} from 'helpers/cartridgeWearable.helper';
import { traitNumber } from 'helpers/composeGotchi';

export type CartridgeHero = {
  id: string;
  bindType?: string;
  collateral: string;
  templateId?: string;
  sourceTokenId?: string;
  /** Haunt 1|2 from L1 — needed for mythical eye shapes. */
  hauntId?: number;
  traits?: number[];
  equippedWearables?: number[];
  level?: number;
  kinship?: number;
  experience?: number;
};

const SIM_TO_GALLERY_NAME: Record<string, string> = {
  dai: 'aDAI',
  weth: 'aWETH',
  aave: 'aAAVE',
  link: 'aLINK',
  usdt: 'aUSDT',
  usdc: 'aUSDC',
  tusd: 'aTUSD',
  uni: 'aUNI',
  yfi: 'aYFI',
  wbtc: 'amWBTC',
  matic: 'amWMATIC',
};

/** Parse soft-launch hero ids like `starter-uni-1` → `uni`. */
export function parseCartridgeHeroCollateral(id: string | undefined | null): string | null {
  const m = String(id || '')
    .trim()
    .match(/^starter-([a-z0-9]+)-\d+$/i);
  return m ? m[1].toLowerCase() : null;
}

/** Gallery / sim collateral name for a wallet gotchi (defaults to aDAI). */
export function collateralNameForWalletGotchi(
  network: string | null | undefined,
  collateralAddress: string | undefined | null,
): string {
  const coll = collateralByAddress(String(network || 'base'), String(collateralAddress || ''));
  return coll?.name || coll?.maticDisplay || 'aDAI';
}

/** Token ids already bound on this cartridge (excludes starter placeholder `0`). */
export function mintedSourceTokenIds(heroes: CartridgeHero[] | undefined | null): Set<string> {
  const ids = new Set<string>();
  for (const hero of heroes || []) {
    const tid = String(hero?.sourceTokenId || '').trim();
    if (tid && tid !== '0') ids.add(tid);
  }
  return ids;
}

export function collateralFromSimId(simId: string | undefined | null): CollateralObject | null {
  const id = String(simId || '')
    .trim()
    .toLowerCase();
  if (!id) return null;
  // Full collateral list (not mint gallery): aTUSD shares svgId with aUSDC and is
  // filtered out of getMintableCollaterals(), but bound heroes still need preview data.
  const pool = collaterals.filter((c) => c.name && c.name !== 'testGHST');
  const galleryName = SIM_TO_GALLERY_NAME[id];
  if (galleryName) {
    return pool.find((c) => c.name === galleryName) || null;
  }
  return (
    pool.find((c) => c.name.toLowerCase() === id || (c.maticDisplay || '').toLowerCase() === id) || null
  );
}

export function normalizeCartridgeHeroes(raw: unknown): CartridgeHero[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((h) => {
      if (!h || typeof h !== 'object') return null;
      const row = h as Record<string, unknown>;
      const id = String(row.id || '').trim();
      // Owned/rental binds may omit collateral until sim persists it — default dai.
      const collateral =
        String(row.collateral || '')
          .trim()
          .toLowerCase() || 'dai';
      if (!id) return null;
      const traits = Array.isArray(row.traits)
        ? row.traits.map((n) => traitNumber(n, 50)).slice(0, 6)
        : Array.isArray(row.modifiedTraits)
        ? (row.modifiedTraits as unknown[]).map((n) => traitNumber(n, 50)).slice(0, 6)
        : [50, 50, 50, 50, 50, 50];
      while (traits.length < 6) traits.push(50);
      return {
        id,
        bindType: row.bindType ? String(row.bindType) : undefined,
        collateral,
        templateId: row.templateId ? String(row.templateId) : undefined,
        sourceTokenId: row.sourceTokenId != null ? String(row.sourceTokenId) : undefined,
        hauntId: (() => {
          const h = Number(row.hauntId);
          return h === 1 || h === 2 ? h : undefined;
        })(),
        traits,
        equippedWearables: padEquippedWearables(row.equippedWearables),
        level: Number(row.level) || 1,
        kinship: Number(row.kinship) || 0,
        experience: Number(row.experience) || 0,
      } as CartridgeHero;
    })
    .filter(Boolean) as CartridgeHero[];
}

export function heroesFromCartridgeSnapshot(snapshot: unknown): CartridgeHero[] {
  if (!snapshot || typeof snapshot !== 'object') return [];
  const doc = snapshot as Record<string, unknown>;
  if (Array.isArray(doc.cAavegotchis) && doc.cAavegotchis.length > 0) {
    return normalizeCartridgeHeroes(doc.cAavegotchis);
  }
  if (doc.cAavegotchi) return normalizeCartridgeHeroes([doc.cAavegotchi]);
  return [];
}

export function mapCartridgeHeroToGotchi(
  hero: CartridgeHero,
  owner: string,
  wearableInventory?: CWearable[] | null,
): GotchiverseAavegotchi {
  const wallet = String(owner || '').toLowerCase();
  const traits = (hero.traits?.length === 6 ? hero.traits : [50, 50, 50, 50, 50, 50]) as Tuple<number, 6>;
  const brs = String(traits.reduce((sum, n) => sum + Number(n || 0), 0));
  const coll = collateralFromSimId(hero.collateral);
  const label = coll ? coll.maticDisplay || coll.name : hero.collateral.toUpperCase();
  const equipped = resolveHeroEquippedWearables(
    hero.id,
    wearableInventory,
    hero.equippedWearables,
  ) as Tuple<number, 16>;
  const hauntId =
    hero.hauntId === 1 || hero.hauntId === 2
      ? hero.hauntId
      : // Haunt-2-only starters (amWBTC) must not default to haunt 1.
        (() => {
          const name = String(coll?.name || coll?.maticDisplay || hero.collateral || '')
            .trim()
            .toLowerCase();
          if (name === 'amwbtc' || name === 'amwmatic' || name.startsWith('am') || name === 'wbtc' || name === 'matic') {
            return 2 as const;
          }
          return undefined;
        })();

  return {
    id: hero.id,
    isCartridgeHero: true,
    cartridgeCollateral: hero.collateral,
    cartridgeSourceTokenId:
      hero.sourceTokenId && hero.sourceTokenId !== '0' ? String(hero.sourceTokenId) : undefined,
    hauntId,
    escrow: '',
    withSetsNumericTraits: traits,
    numericTraits: traits,
    withSetsRarityScore: brs,
    baseRarityScore: brs,
    owner: { id: wallet },
    originalOwner: { id: wallet },
    name: `c${label}`,
    borrowed: false,
    equippedWearables: equipped,
    level: String(hero.level || 1),
    experience: String(hero.experience || 0),
    stakedAmount: '0',
    collateral: coll?.maticAddress || coll?.mainnetAddress || hero.collateral,
    kinship: String(hero.kinship || 0),
    readyToChannel: false,
    isSpectator: false,
  };
}
