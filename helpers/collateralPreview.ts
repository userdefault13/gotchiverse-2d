import { defaultGotchi } from 'helpers/aavegotchi/svg';
import { convertInlineSVGToBlobURL, removeBG } from 'helpers/aavegotchi';
import type { CollateralObject } from 'helpers/ethers.helper';
import { isRhH3BrandName } from 'helpers/ethers.helper';
import { ethers } from 'ethers';
import type { NetworkNames, Tuple } from 'types';
import { abis, varsForNetwork } from 'shared_code/web3/shared.const.web3';
import { bakeGotchiSvgClassFills, composeAllViews, traitNumber } from 'helpers/composeGotchi';

type BaseGotchiIdentity = {
  hauntId: number;
  collateral: string;
  traits: number[];
};

const svgCache = new Map<string, string>();
const identityCache = new Map<string, BaseGotchiIdentity>();
const rpcProviders = new Map<string, ethers.providers.JsonRpcProvider>();

/** Soft-mint card thumbs must not hang on public Base RPC forever. */
const PREVIEW_RPC_TIMEOUT_MS = 4000;
/** Offline JSON compose can stall on a hung /data fetch — never block thumbs forever. */
const COMPOSE_TIMEOUT_MS = 8000;

/**
 * Haunt-2-only gallery collaterals (amWBTC, amWMATIC). Soft-mint defaults haunt to 1,
 * which breaks Base previewSideAavegotchi and used to leave cards on GotchiLoading.
 */
const HAUNT2_ONLY_COLLATERAL_NAMES = new Set(['amwbtc', 'amwmatic']);

export function inferCollateralHauntId(
  collateral: CollateralObject | null | undefined,
  hauntIdHint?: number | null,
): number {
  if (Number(hauntIdHint) === 3) return 3;
  if (Number(hauntIdHint) === 2) return 2;
  if (Number(hauntIdHint) === 1) return 1;
  const name = String(collateral?.name || collateral?.maticDisplay || '')
    .trim()
    .toLowerCase();
  if (isRhH3BrandName(name)) return 3;
  if (HAUNT2_ONLY_COLLATERAL_NAMES.has(name) || name.startsWith('am')) return 2;
  return 1;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

const EMPTY_WEARABLES = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as Tuple<number, 16>;

/**
 * Haunt-1 cAavegotchi preview traits:
 * [NRG, AGG, SPK, BRN, Eye Shape, Eye Color] — all base 50.
 */
export const BASE_PREVIEW_TRAITS = [50, 50, 50, 50, 50, 50] as Tuple<number, 6>;

/** Soft-launch identity / preview RPC always targets Base. */
function rpcProviderFor(network: NetworkNames): ethers.providers.JsonRpcProvider {
  if (!rpcProviders.has(network)) {
    const rpc = varsForNetwork(network).jsonRPC || 'https://mainnet.base.org';
    rpcProviders.set(network, new ethers.providers.StaticJsonRpcProvider(rpc));
  }
  return rpcProviders.get(network);
}

function collateralAddress(collateral: CollateralObject): string | null {
  // Classic aToken collateral ids are shared across migrated Base gotchis.
  const raw = collateral.maticAddress || collateral.mainnetAddress;
  if (!raw) return null;
  try {
    return ethers.utils.getAddress(raw.toLowerCase());
  } catch {
    return raw;
  }
}

/**
 * Strip gotchi backgrounds for thumbs / Phaser.
 * Prefer physical node removal — canvas SVG→PNG often ignores CSS `display:none`,
 * so RH checker (`.gotchi-bg-rh`) was baking into in-game sprites.
 */
function stripGotchiBackground(svg: string, opts?: { keepRhBg?: boolean }): string {
  if (!svg || typeof svg !== 'string') return svg;

  // DOM path: reliably drop bg groups before rasterization.
  if (typeof DOMParser !== 'undefined' && typeof XMLSerializer !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const root = doc.documentElement;
      if (root && root.localName?.toLowerCase() === 'svg' && !root.querySelector('parsererror')) {
        const removeSel = opts?.keepRhBg
          ? '.gotchi-bg:not(.gotchi-bg-rh), .wearable-bg'
          : '.gotchi-bg, .gotchi-bg-rh, .wearable-bg';
        root.querySelectorAll(removeSel).forEach((el) => el.parentNode?.removeChild(el));
        const serialized = new XMLSerializer().serializeToString(root);
        const open = svg.match(/<svg\b[^>]*>/i)?.[0];
        return open ? serialized.replace(/<svg\b[^>]*>/i, open) : serialized;
      }
    } catch {
      /* fall through to regex */
    }
  }

  // Regex fallback (SSR / no DOM)
  let out = svg;
  if (opts?.keepRhBg) {
    // Drop classic bg only; keep RH checker group.
    out = out.replace(/<g\b[^>]*class="[^"]*\bgotchi-bg\b(?![^"]*\bgotchi-bg-rh\b)[^"]*"[^>]*>[\s\S]*?<\/g>/gi, '');
  } else {
    out = out.replace(/<g\b[^>]*class="[^"]*\bgotchi-bg(?:-rh)?\b[^"]*"[^>]*>[\s\S]*?<\/g>/gi, '');
  }
  out = out.replace(/<g\b[^>]*class="[^"]*\bwearable-bg\b[^"]*"[^>]*>[\s\S]*?<\/g>/gi, '');
  const hide = opts?.keepRhBg
    ? '.gotchi-bg:not(.gotchi-bg-rh),.wearable-bg{display:none!important}'
    : '.gotchi-bg,.gotchi-bg-rh,.wearable-bg{display:none!important}';
  if (/<style[\s>]/i.test(out)) {
    return out.replace(/<style([^>]*)>/i, `<style$1>${hide}`);
  }
  return out.replace(/<svg([^>]*)>/i, `<svg$1><style>${hide}</style>`);
}

/** Prefer offline JSON compose for cAavegotchis; RPC only as last resort. */
async function composeOfflineSvg(
  hauntId: number,
  collateralKey: string,
  traits: number[],
  equipped: number[],
): Promise<string> {
  const views = await composeAllViews({
    hauntId,
    collateralType: collateralKey,
    numericTraits: traits,
    equippedWearables: equipped,
  });
  const svg = views?.Front || '';
  if (!svg || svg.length < 80) throw new Error('empty composed svg');
  // Keep RH checker only for mint-card thumbs; callers that need bare body strip again.
  return stripGotchiBackground(svg, { keepRhBg: Number(hauntId) === 3 });
}

function padEquip(equippedWearables?: number[] | Tuple<number, 16> | null): number[] {
  const equipped = Array.isArray(equippedWearables)
    ? equippedWearables.map((n) => Number(n) || 0).slice(0, 16)
    : [...EMPTY_WEARABLES];
  while (equipped.length < 16) equipped.push(0);
  return equipped;
}

function padTraits(traits?: number[] | Tuple<number, 6> | null): number[] {
  if (Array.isArray(traits) && traits.length >= 6) {
    // Keep trait 0 (Haunt mythical Single Dot) — `Number(n) || 50` would corrupt it.
    return traits.slice(0, 6).map((n) => traitNumber(n, 50));
  }
  return [...BASE_PREVIEW_TRAITS];
}

/** Recolor a base gotchi SVG (front or side) with collateral palette. */
export function buildCollateralGotchiSvgFromBase(
  baseSvg: string,
  collateral: CollateralObject,
  opts?: { removeBg?: boolean },
): string {
  let svg = baseSvg;
  if (opts?.removeBg !== false) {
    svg = stripGotchiBackground(svg, { keepRhBg: false });
  }
  const isH3 = isRhH3BrandName(collateral?.name) || Number((collateral as { hauntId?: number })?.hauntId) === 3;
  // H3: lime body + black face/logo (never paint collateral primary — it vanishes on lime).
  const primary = isH3 ? '#ccff00' : collateral.primaryColor;
  const secondary = isH3 ? '#e8ff66' : collateral.secondaryColor;
  const cheek = collateral.cheekColor;
  const face = isH3 ? '#000000' : primary;
  const collFill = isH3 ? '#000000' : collateral.primaryColor;
  // No `*` on eyeColor — nested gotchi-primary / fill="#fff" mythical dots must survive.
  const style = `<style>
    .gotchi-primary,.gotchi-primary *{fill:${primary}!important}
    .gotchi-secondary,.gotchi-secondary *{fill:${secondary}!important}
    .gotchi-collateral,.gotchi-collateral *{fill:${collFill}!important}
    .gotchi-cheek,.gotchi-cheek *{fill:${cheek}!important}
    .gotchi-eyeColor{fill:${face}!important}
    .gotchi-primary-mouth,.gotchi-primary-mouth *{fill:${face}!important}
    .gotchi-face,.gotchi-face *{fill:${face}!important}
  </style>`;
  return svg.replace(/<svg([^>]*)>/i, `<svg$1>${style}`);
}

/**
 * Phaser-safe SVG spritesheet: nest each side's markup (after baking class fills).
 * Nested `<image href="data:image/svg+xml…">` sheets decode as Phaser `__MISSING`
 * (magenta bars) — bake fills, then inline like `_aavegotchiSpriteSVG`.
 */
export function svgSidesToSvgSpritesheet(
  svgs: string[],
  opts?: { frameSize?: number; columns?: number },
): string {
  const frameSize = opts?.frameSize ?? 64;
  const columns = opts?.columns ?? 2;
  const rows = Math.ceil(Math.max(svgs.length, 1) / columns);
  const width = frameSize * columns;
  const height = frameSize * rows;

  const frames = svgs
    .map((svg, i) => {
      const baked = bakeGotchiSvgClassFills(String(svg || '').trim());
      if (!baked) return '';
      // Prefer inner markup of a root <svg>; fall back to full fragment.
      const inner = baked.replace(/^[\s\S]*?<svg\b[^>]*>/i, '').replace(/<\/svg>\s*$/i, '') || baked;
      const x = (i % columns) * frameSize;
      const y = Math.floor(i / columns) * frameSize;
      return `<svg x="${x}" y="${y}" width="${frameSize}" height="${frameSize}" viewBox="0 0 64 64">${inner}</svg>`;
    })
    .join('');

  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${frames}</svg>`;
  return URL.createObjectURL(new Blob([sheet], { type: 'image/svg+xml;charset=utf-8' }));
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('svg frame image failed to load'));
    img.src = url;
  });
}

/**
 * Rasterize 4 side SVGs into a PNG spritesheet blob URL.
 * Phaser reliably decodes PNG; nested SVG sheets often register as empty/__MISSING for soft-mint compose art.
 * Throws if the sheet has no opaque pixels (so callers can fall back).
 */
export async function svgSidesToPngSpritesheet(
  svgs: string[],
  opts?: { frameSize?: number; columns?: number },
): Promise<string> {
  const frameSize = opts?.frameSize ?? 64;
  const columns = opts?.columns ?? 2;
  const rows = Math.ceil(Math.max(svgs.length, 1) / columns);
  const width = frameSize * columns;
  const height = frameSize * rows;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('canvas 2d unavailable for png spritesheet');
  }

  let drew = 0;
  for (let i = 0; i < svgs.length; i += 1) {
    const baked = bakeGotchiSvgClassFills(String(svgs[i] || '').trim());
    if (!baked || baked.length < 40) continue;
    // Ensure a root svg with explicit size so the browser rasterizer paints at 64×64.
    const framed = /<svg\b/i.test(baked)
      ? baked.replace(/<svg\b([^>]*)>/i, (_m, attrs) => {
          let next = String(attrs || '');
          if (!/\bwidth=/i.test(next)) next += ` width="${frameSize}"`;
          if (!/\bheight=/i.test(next)) next += ` height="${frameSize}"`;
          if (!/\bviewBox=/i.test(next)) next += ' viewBox="0 0 64 64"';
          if (!/\bxmlns=/i.test(next)) next += ' xmlns="http://www.w3.org/2000/svg"';
          return `<svg${next}>`;
        })
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${frameSize}" height="${frameSize}" viewBox="0 0 64 64">${baked}</svg>`;

    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(framed)}`;
    try {
      const img = await loadHtmlImage(url);
      const x = (i % columns) * frameSize;
      const y = Math.floor(i / columns) * frameSize;
      ctx.clearRect(x, y, frameSize, frameSize);
      ctx.drawImage(img, x, y, frameSize, frameSize);
      drew += 1;
    } catch (err) {
      // Fall back to blob URL if data-URI decode fails for a side.
      const blobUrl = URL.createObjectURL(new Blob([framed], { type: 'image/svg+xml;charset=utf-8' }));
      try {
        const img = await loadHtmlImage(blobUrl);
        const x = (i % columns) * frameSize;
        const y = Math.floor(i / columns) * frameSize;
        ctx.clearRect(x, y, frameSize, frameSize);
        ctx.drawImage(img, x, y, frameSize, frameSize);
        drew += 1;
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    }
  }

  if (drew < 1) {
    throw new Error('png spritesheet drew 0 frames');
  }

  // Reject fully-transparent sheets (Phaser still reports frameTotal >= 4 for blank PNGs).
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let opaque = 0;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] > 8) {
      opaque += 1;
      if (opaque > 200) break;
    }
  }
  if (opaque <= 200) {
    throw new Error('png spritesheet has no opaque pixels');
  }

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('png spritesheet blob failed'));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, 'image/png');
  });
}

/** Guaranteed 4-side SVGs for Phaser — same recolor path as select-card thumbs. */
export function buildCollateralDefaultSideSvgs(collateral: CollateralObject): [string, string, string, string] {
  return [
    buildCollateralGotchiSvgFromBase(defaultGotchi[0], collateral),
    buildCollateralGotchiSvgFromBase(defaultGotchi[1], collateral),
    buildCollateralGotchiSvgFromBase(defaultGotchi[2], collateral),
    buildCollateralGotchiSvgFromBase(defaultGotchi[3], collateral),
  ];
}

/** Local fallback if diamond preview fails — recolor shared default body. */
export function buildCollateralGotchiSvg(collateral: CollateralObject, opts?: { removeBg?: boolean }): string {
  return buildCollateralGotchiSvgFromBase(defaultGotchi[0], collateral, opts);
}

/** Resolve haunt / collateral / traits from Base getAavegotchi. */
export async function fetchBaseGotchiIdentity(tokenId: string): Promise<BaseGotchiIdentity | null> {
  const tid = String(tokenId || '').trim();
  if (!/^\d+$/.test(tid)) return null;
  if (identityCache.has(tid)) return identityCache.get(tid) || null;

  try {
    const provider = rpcProviderFor('base');
    const diamond = varsForNetwork('base').aavegotchiDiamond;
    if (!diamond) throw new Error('No Base aavegotchi diamond');
    const contract = new ethers.Contract(diamond, abis.aavegotchiDiamond, provider);
    const info = await contract.getAavegotchi(tid);
    const hauntRaw = Number(info.hauntId ?? 1);
    const identity: BaseGotchiIdentity = {
      hauntId: Math.min(Math.max(hauntRaw || 1, 1), 2),
      collateral: ethers.utils.getAddress(String(info.collateral || '').toLowerCase()),
      traits: [...(info.numericTraits || [])].slice(0, 6).map((t) => traitNumber(t, 50)),
    };
    if (!identity.collateral || identity.traits.length < 6) return null;
    identityCache.set(tid, identity);
    return identity;
  } catch (err) {
    console.warn('@fetchBaseGotchiIdentity', tid, err);
    return null;
  }
}

async function previewOnBase(
  hauntId: number,
  collateralAddr: string,
  traits: number[],
  equipped: number[],
): Promise<string> {
  const provider = rpcProviderFor('base');
  const diamond = varsForNetwork('base').aavegotchiDiamond;
  if (!diamond) throw new Error('No Base aavegotchi diamond');
  const contract = new ethers.Contract(diamond, abis.aavegotchiDiamond, provider);
  const svg: string = await contract.previewAavegotchi(hauntId, collateralAddr, traits, equipped);
  if (!svg || typeof svg !== 'string' || svg.length < 100) {
    throw new Error('empty preview svg');
  }
  if (!svg.includes('gotchi-body') || !svg.includes('gotchi-collateral')) {
    throw new Error('incomplete preview svg layers');
  }
  return stripGotchiBackground(svg);
}

/** On-chain 4-side preview — accurate eyes/wearables for Phaser sprites. */
async function previewSideOnBase(
  hauntId: number,
  collateralAddr: string,
  traits: number[],
  equipped: number[],
): Promise<[string, string, string, string]> {
  const provider = rpcProviderFor('base');
  const diamond = varsForNetwork('base').aavegotchiDiamond;
  if (!diamond) throw new Error('No Base aavegotchi diamond');
  const contract = new ethers.Contract(diamond, abis.aavegotchiDiamond, provider);
  const res = await contract.previewSideAavegotchi(hauntId, collateralAddr, traits, equipped);
  const arr: string[] = Array.isArray(res) ? res.map(String) : [];
  if (arr.length < 4 || arr[0].length < 100) {
    throw new Error('empty previewSide svg');
  }
  return [
    stripGotchiBackground(arr[0]),
    stripGotchiBackground(arr[1]),
    stripGotchiBackground(arr[2]),
    stripGotchiBackground(arr[3]),
  ];
}

/**
 * cAavegotchi preview: offline JSON library compose first (fast for large rosters).
 * Falls back to Base `previewAavegotchi` only if compose fails.
 * Wallet L1 gotchis still use subgraph/contract SVG paths elsewhere — not this helper.
 * Pass `sourceTokenId` for wallet-bound heroes so haunt/collateral/traits match L1.
 */
export async function fetchCollateralGotchiSvg(
  collateral: CollateralObject,
  _walletProvider?: ethers.providers.Provider,
  _network?: NetworkNames | string,
  equippedWearables?: number[] | Tuple<number, 16> | null,
  traits?: number[] | Tuple<number, 6> | null,
  sourceTokenId?: string | null,
  hauntIdHint?: number | null,
): Promise<string> {
  const equipped = padEquip(equippedWearables);
  const tid = String(sourceTokenId || '').trim();
  const isL1 = Boolean(tid && tid !== '0' && /^\d+$/.test(tid));

  let hauntId = inferCollateralHauntId(collateral, hauntIdHint);
  let addr = collateralAddress(collateral);
  let traitArr = padTraits(traits);
  const brandName = String(collateral?.name || '')
    .trim()
    .toLowerCase();
  const isH3 = hauntId === 3 || isRhH3BrandName(brandName);
  if (isH3) hauntId = 3;

  if (isL1) {
    try {
      const identity = await withTimeout(
        fetchBaseGotchiIdentity(tid),
        PREVIEW_RPC_TIMEOUT_MS,
        'getAavegotchi',
      );
      if (identity) {
        hauntId = identity.hauntId;
        addr = identity.collateral;
        traitArr = identity.traits;
      }
    } catch (err) {
      console.warn('@fetchCollateralGotchiSvg identity', tid, err);
    }
  }

  // H3 brands compose by name (amazon, tesla, …); H1/H2 use on-chain address.
  const composeKey = isH3 ? brandName || addr || '' : addr || brandName || '';
  // v15: in-game sheets strip RH bg; gallery thumbs still use keepRhBg via composeOfflineSvg
  // v21: solid fill-opacity without overwriting black face/primary nested paints
  const cacheKey = `json:v21:${tid || composeKey}:h${hauntId}:t${traitArr.join(',')}:w${equipped.join(',')}`;
  if (svgCache.has(cacheKey)) return svgCache.get(cacheKey);

  if (!composeKey) {
    const fallback = buildCollateralGotchiSvg(collateral);
    svgCache.set(cacheKey, fallback);
    return fallback;
  }

  try {
    const cleaned = await withTimeout(
      composeOfflineSvg(hauntId, composeKey, traitArr, equipped),
      COMPOSE_TIMEOUT_MS,
      'composeOfflineSvg',
    );
    svgCache.set(cacheKey, cleaned);
    return cleaned;
  } catch (composeErr) {
    console.warn('@fetchCollateralGotchiSvg compose', collateral.name, tid || '', composeErr);
    // H3 has no Base diamond preview — local recolor only.
    if (isH3 || !addr) {
      const fallback = buildCollateralGotchiSvg(collateral);
      svgCache.set(cacheKey, fallback);
      return fallback;
    }
    try {
      const cleaned = await withTimeout(
        previewOnBase(hauntId, addr, traitArr, equipped),
        PREVIEW_RPC_TIMEOUT_MS,
        'previewAavegotchi',
      );
      svgCache.set(cacheKey, cleaned);
      return cleaned;
    } catch (err) {
      console.warn('@fetchCollateralGotchiSvg', collateral.name, tid || '', err);
      const fallback = buildCollateralGotchiSvg(collateral);
      svgCache.set(cacheKey, fallback);
      return fallback;
    }
  }
}

/** Blob URL so each card/preview has isolated SVG defs (avoids id collisions). */
export async function fetchCollateralGotchiBlobUrl(
  collateral: CollateralObject,
  network?: NetworkNames | string,
  equippedWearables?: number[] | Tuple<number, 16> | null,
  traits?: number[] | Tuple<number, 6> | null,
  sourceTokenId?: string | null,
  hauntId?: number | null,
): Promise<string> {
  const svg = await fetchCollateralGotchiSvg(
    collateral,
    undefined,
    network,
    equippedWearables,
    traits,
    sourceTokenId,
    hauntId,
  );
  return convertInlineSVGToBlobURL(svg);
}

/**
 * 4-direction sprites for a cartridge cAavegotchi (in-game Phaser).
 * Soft-mint: offline JSON compose first (correct haunt for amWBTC / amWMATIC).
 * L1-bound: prefer on-chain previewSideAavegotchi so eye shapes match the token.
 *
 * Haunt matters: EYS 0/1 are haunt-specific mythical eyes (wiki.aavegotchi.com/en/eye-shape).
 * Haunt 2 mythical ≠ Haunt 1 mythical — wrong haunt shows the wrong eye art.
 */
export async function fetchCartridgeHeroSideSVGs(
  collateral: CollateralObject,
  network?: NetworkNames | string,
  equippedWearables?: number[] | Tuple<number, 16> | null,
  traits?: number[] | Tuple<number, 6> | null,
  sourceTokenId?: string | null,
  hauntIdHint?: number | null,
): Promise<[string, string, string, string]> {
  const equipped = padEquip(equippedWearables);
  const tid = String(sourceTokenId || '').trim();
  const isL1 = Boolean(tid && tid !== '0' && /^\d+$/.test(tid));

  let hauntId = inferCollateralHauntId(collateral, hauntIdHint);
  let addr = collateralAddress(collateral);
  let traitArr = padTraits(traits);
  const brandName = String(collateral?.name || '')
    .trim()
    .toLowerCase();
  const isH3 = hauntId === 3 || isRhH3BrandName(brandName);
  if (isH3) hauntId = 3;

  if (isL1) {
    try {
      const identity = await withTimeout(
        fetchBaseGotchiIdentity(tid),
        PREVIEW_RPC_TIMEOUT_MS,
        'getAavegotchi',
      );
      if (identity) {
        hauntId = identity.hauntId;
        addr = identity.collateral;
        traitArr = identity.traits;
      }
    } catch (err) {
      console.warn('@fetchCartridgeHeroSideSVGs identity', tid, err);
    }
  }

  const tryComposeSides = async (): Promise<[string, string, string, string] | null> => {
    const type = isH3 ? brandName || addr : addr || brandName;
    if (!type) return null;
    try {
      const views = await withTimeout(
        composeAllViews({
          hauntId,
          collateralType: type,
          numericTraits: traitArr,
          equippedWearables: equipped,
        }),
        COMPOSE_TIMEOUT_MS,
        'composeAllViews',
      );
      // Phaser sprites sit on the map — drop RH checker (physical remove, not CSS-only).
      const strip = (s: string) => {
        let out = stripGotchiBackground(s, { keepRhBg: false });
        // Shadow: classic in-game sheets drop it; remove nodes so PNG bake does too.
        if (typeof DOMParser !== 'undefined') {
          try {
            const doc = new DOMParser().parseFromString(out, 'image/svg+xml');
            const root = doc.documentElement;
            root?.querySelectorAll?.('.gotchi-shadow')?.forEach((el) => el.parentNode?.removeChild(el));
            if (root) {
              const open = out.match(/<svg\b[^>]*>/i)?.[0];
              const ser = new XMLSerializer().serializeToString(root);
              out = open ? ser.replace(/<svg\b[^>]*>/i, open) : ser;
            }
          } catch {
            out = out.replace(/<g\b[^>]*class="[^"]*\bgotchi-shadow\b[^"]*"[^>]*>[\s\S]*?<\/g>/gi, '');
          }
        } else {
          out = out.replace(/<g\b[^>]*class="[^"]*\bgotchi-shadow\b[^"]*"[^>]*>[\s\S]*?<\/g>/gi, '');
        }
        return out;
      };
      const sides: [string, string, string, string] = [
        strip(views.Front || ''),
        strip(views.Left || ''),
        strip(views.Right || ''),
        strip(views.Back || ''),
      ];
      // Require all 4 directional views — missing sides break enter / Phaser spritesheets.
      if (sides.every((svg) => svg.length >= 80)) return sides;
    } catch (err) {
      console.warn('@fetchCartridgeHeroSideSVGs compose', collateral.name, err);
    }
    return null;
  };

  // Soft-mint / no L1 token: compose first so haunt-2 collaterals never hit haunt-1 RPC.
  if (!isL1) {
    const composed = await tryComposeSides();
    if (composed) return composed;
  }

  if (addr) {
    try {
      return await withTimeout(
        previewSideOnBase(hauntId, addr, traitArr, equipped),
        PREVIEW_RPC_TIMEOUT_MS,
        'previewSideAavegotchi',
      );
    } catch (err) {
      console.warn('@fetchCartridgeHeroSideSVGs on-chain', collateral.name, err);
    }

    if (isL1) {
      const composed = await tryComposeSides();
      if (composed) return composed;
    }
  } else {
    // Soft-mint already tried compose once; one more pass if addr was missing earlier.
    const composed = await tryComposeSides();
    if (composed) return composed;
  }

  const front = await fetchCollateralGotchiSvg(
    collateral,
    undefined,
    network,
    equippedWearables,
    traits,
    sourceTokenId,
    hauntId,
  );
  return [
    front,
    buildCollateralGotchiSvgFromBase(defaultGotchi[1], collateral),
    buildCollateralGotchiSvgFromBase(defaultGotchi[2], collateral),
    buildCollateralGotchiSvgFromBase(defaultGotchi[3], collateral),
  ];
}
