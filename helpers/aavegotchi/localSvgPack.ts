/**
 * Local Aavegotchi SVG pack (from Paarcel JSONs) for cAavegotchi composition.
 * Served from /public/aavegotchi-svg — avoids Base previewAavegotchi RPC for card art.
 */

const PACK_ROOT = '/aavegotchi-svg';

type Side = 'front' | 'left' | 'right' | 'back';

type BasePack = {
  body: Record<string, string[]>;
  hands: Record<string, string[]>;
  mouth: Record<string, string[]>;
  eyes: Record<string, string[]>;
  shadow?: string[];
};

type WearableRow = {
  id: number;
  name?: string;
  svgs?: string[];
  sleeves?: string[] | null;
};

/** Gallery / sim collateral name → Base JSON slug (collateral-base-{slug}.json). */
const NAME_TO_SLUG: Record<string, string> = {
  adai: 'madai',
  aweth: 'maweth',
  aaave: 'maaave',
  alink: 'malink',
  ausdt: 'mausdt',
  ausdc: 'mausdc',
  atusd: 'matusd',
  auni: 'mauni',
  ayfi: 'mayfi',
  madai: 'madai',
  maweth: 'maweth',
  maaave: 'maaave',
  malink: 'malink',
  mausdt: 'mausdt',
  mausdc: 'mausdc',
  matusd: 'matusd',
  mauni: 'mauni',
  mayfi: 'mayfi',
  amdai: 'amdai',
  amweth: 'amweth',
  amaave: 'amaave',
  amusdt: 'amusdt',
  amusdc: 'amusdc',
  amwbtc: 'amwbtc',
  amwmatic: 'amwmatic',
  // sim ids
  dai: 'madai',
  weth: 'maweth',
  aave: 'maaave',
  link: 'malink',
  usdt: 'mausdt',
  usdc: 'mausdc',
  tusd: 'matusd',
  uni: 'mauni',
  yfi: 'mayfi',
  wbtc: 'amwbtc',
  matic: 'amwmatic',
};

const SIDE_INDEX: Record<Side, number> = { front: 0, left: 1, right: 2, back: 3 };

const basePackCache = new Map<string, BasePack>();
const collateralOverlayCache = new Map<string, string[]>();
let wearablesById: Map<number, WearableRow> | null = null;
let wearablesLoad: Promise<Map<number, WearableRow>> | null = null;
let collateralIndexLoad: Promise<string[]> | null = null;
let collateralFileIndex: string[] | null = null;

function normName(name: string | undefined | null): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/^c/, ''); // camWBTC label on cards is c + maticDisplay
}

export function collateralSlugFromName(name: string | undefined | null): string | null {
  const n = normName(name);
  if (!n) return null;
  if (NAME_TO_SLUG[n]) return NAME_TO_SLUG[n];
  // amWBTC / maDAI style already
  const compact = n.replace(/[^a-z0-9]/g, '');
  return NAME_TO_SLUG[compact] || compact || null;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { cache: 'force-cache' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.warn('@localSvgPack fetch failed', path, e);
    return null;
  }
}

async function loadBasePack(slug: string): Promise<BasePack | null> {
  if (basePackCache.has(slug)) return basePackCache.get(slug) || null;
  const data = await fetchJson<BasePack>(`${PACK_ROOT}/Base/collateral-base-${slug}.json`);
  if (!data?.body) return null;
  basePackCache.set(slug, data);
  return data;
}

async function listCollateralOverlayFiles(): Promise<string[]> {
  if (collateralFileIndex) return collateralFileIndex;
  if (!collateralIndexLoad) {
    // No directory listing in static hosting — probe known slugs via Collaterals filenames we copied.
    collateralIndexLoad = (async () => {
      const slugs = Object.values(NAME_TO_SLUG).filter((v, i, a) => a.indexOf(v) === i);
      const found: string[] = [];
      // Prefer db collaterals fragments; overlays are timestamped — load via db instead when possible.
      void slugs;
      collateralFileIndex = found;
      return found;
    })();
  }
  return collateralIndexLoad;
}

/** Prefer db collaterals.svg[side] fragments (g elements), keyed by collateral name. */
let dbCollaterals:
  | Array<{ name: string; svgs?: string[]; eyeShapeSvgs?: string[] }>
  | null = null;
let dbCollateralsLoad: Promise<typeof dbCollaterals> | null = null;

async function loadDbCollaterals() {
  if (dbCollaterals) return dbCollaterals;
  if (!dbCollateralsLoad) {
    dbCollateralsLoad = (async () => {
      const data = await fetchJson<{ collaterals: typeof dbCollaterals }>(
        `${PACK_ROOT}/aavegotchi_db_collaterals.json`,
      );
      dbCollaterals = data?.collaterals || [];
      return dbCollaterals;
    })();
  }
  return dbCollateralsLoad;
}

async function loadWearablesMap(): Promise<Map<number, WearableRow>> {
  if (wearablesById) return wearablesById;
  if (!wearablesLoad) {
    wearablesLoad = (async () => {
      const data = await fetchJson<{ wearables: WearableRow[] }>(
        `${PACK_ROOT}/aavegotchi_db_wearables.json`,
      );
      const map = new Map<number, WearableRow>();
      for (const row of data?.wearables || []) {
        if (row?.id != null) map.set(Number(row.id), row);
      }
      wearablesById = map;
      return map;
    })();
  }
  return wearablesLoad;
}

/** Strip outer <svg>…</svg>, keep inner markup (+ optional style hoist). */
function svgInner(svg: string): { style: string; body: string } {
  const raw = String(svg || '').trim();
  if (!raw) return { style: '', body: '' };
  const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const style = styleMatch ? styleMatch[1] : '';
  let body = raw
    .replace(/<\?xml[^>]*>/i, '')
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .trim();
  // Wearable fragments sometimes use <svg x=".." y=".."> — convert leftover attrs on nested svg
  body = body.replace(/<svg\b([^>]*)>/gi, (_m, attrs: string) => {
    const x = /(?:^|\s)x="([^"]*)"/.exec(attrs)?.[1];
    const y = /(?:^|\s)y="([^"]*)"/.exec(attrs)?.[1];
    if (x != null || y != null) {
      return `<g transform="translate(${Number(x) || 0},${Number(y) || 0})">`;
    }
    return '<g>';
  });
  body = body.replace(/<\/svg>/gi, '</g>');
  return { style, body };
}

function pickSideSvg(list: string[] | undefined, side: Side): string {
  if (!list?.length) return '';
  const idx = SIDE_INDEX[side] ?? 0;
  return list[Math.min(idx, list.length - 1)] || list[0] || '';
}

function handsKeyForSide(side: Side): string {
  if (side === 'front') return 'frontDownClosed';
  if (side === 'left') return 'left';
  if (side === 'right') return 'right';
  return 'frontDownClosed';
}

function eyeKeyFromTraits(traits?: number[] | null): 'mad' | 'happy' | 'sleepy' {
  const eyeShape = Number(traits?.[4] ?? 50);
  // Rough buckets matching common Aavegotchi ranges
  if (eyeShape < 25) return 'sleepy';
  if (eyeShape > 75) return 'mad';
  return 'happy';
}

/**
 * Compose a full 64×64 SVG for a collateral (+ optional wearables) from the local pack.
 * Returns null if the Base pack for this collateral is missing.
 */
export async function composeLocalCaavegotchiSvg(opts: {
  collateralName: string;
  side?: Side;
  traits?: number[] | null;
  equippedWearables?: number[] | null;
  removeBg?: boolean;
}): Promise<string | null> {
  const slug = collateralSlugFromName(opts.collateralName);
  if (!slug) return null;
  const side: Side = opts.side || 'front';
  const pack = await loadBasePack(slug);
  if (!pack) return null;

  const layers: string[] = [];
  const styles: string[] = [];

  const push = (svg: string) => {
    if (!svg) return;
    const { style, body } = svgInner(svg);
    if (style) styles.push(style);
    if (body) layers.push(body);
  };

  push(pickSideSvg(pack.body?.[side] || pack.body?.front, side));
  push(pickSideSvg(pack.mouth?.neutral, 'front'));
  const eyeKey = eyeKeyFromTraits(opts.traits);
  push(pickSideSvg(pack.eyes?.[eyeKey] || pack.eyes?.happy, 'front'));
  push(pickSideSvg(pack.hands?.[handsKeyForSide(side)], side === 'back' ? 'front' : side));

  // Collateral badge from db (4 sides) — match by slug / name
  const collaterals = await loadDbCollaterals();
  const collRow = (collaterals || []).find((c) => {
    const n = normName(c.name);
    return n === slug || NAME_TO_SLUG[n] === slug || n.replace(/^ma|^am/, '') === slug.replace(/^ma|^am/, '');
  });
  if (collRow?.svgs?.length) {
    const frag = pickSideSvg(collRow.svgs, side);
    if (frag) {
      // fragments are often bare <g> — wrap if needed
      if (frag.includes('<svg')) push(frag);
      else layers.push(frag);
    }
  }
  if (collRow?.eyeShapeSvgs?.length && side === 'front') {
    const eyeFrag = collRow.eyeShapeSvgs[0];
    if (eyeFrag) {
      if (eyeFrag.includes('<svg')) push(eyeFrag);
      else layers.push(eyeFrag);
    }
  }

  // Equipped wearables (front / side index)
  const equipped = (opts.equippedWearables || []).map((n) => Number(n) || 0);
  const hasGear = equipped.some((id) => id > 0);
  if (hasGear) {
    const map = await loadWearablesMap();
    for (const id of equipped) {
      if (!id) continue;
      const row = map.get(id);
      const svg = pickSideSvg(row?.svgs, side);
      if (svg) {
        if (svg.includes('<svg')) push(svg.startsWith('<svg') ? svg : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${svg}</svg>`);
        else layers.push(svg);
      }
    }
  }

  void listCollateralOverlayFiles(); // reserved for future timestamped overlay files

  const styleBlock = styles.length
    ? `<style>${styles.join('\n')}${
        opts.removeBg !== false ? '\n.gotchi-bg,.wearable-bg{display:none}' : ''
      }</style>`
    : opts.removeBg !== false
      ? '<style>.gotchi-bg,.wearable-bg{display:none}</style>'
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${styleBlock}${layers.join(
    '',
  )}</svg>`;
}

/** True when we have a Base pack for this collateral name. */
export async function hasLocalCaavegotchiPack(collateralName: string): Promise<boolean> {
  const slug = collateralSlugFromName(collateralName);
  if (!slug) return false;
  return Boolean(await loadBasePack(slug));
}
