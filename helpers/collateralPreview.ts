import { defaultGotchi } from 'helpers/aavegotchi/svg';
import { convertInlineSVGToBlobURL, removeBG } from 'helpers/aavegotchi';
import type { CollateralObject } from 'helpers/ethers.helper';
import { ethers } from 'ethers';
import type { NetworkNames, Tuple } from 'types';
import { abis, varsForNetwork } from 'shared_code/web3/shared.const.web3';
import { composeAllViews } from 'helpers/composeGotchi';

type BaseGotchiIdentity = {
  hauntId: number;
  collateral: string;
  traits: number[];
};

const svgCache = new Map<string, string>();
const identityCache = new Map<string, BaseGotchiIdentity>();
const rpcProviders = new Map<string, ethers.providers.JsonRpcProvider>();

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

function stripGotchiBackground(svg: string): string {
  if (svg.includes('<style>')) {
    return removeBG(svg);
  }
  return svg.replace(/<svg([^>]*)>/, '<svg$1><style>.gotchi-bg,.wearable-bg{display:none}</style>');
}

/** Prefer offline JSON compose for cAavegotchis; RPC only as last resort. */
async function composeOfflineSvg(
  hauntId: number,
  collateralAddr: string,
  traits: number[],
  equipped: number[],
): Promise<string> {
  const views = await composeAllViews({
    hauntId,
    collateralType: collateralAddr,
    numericTraits: traits,
    equippedWearables: equipped,
  });
  const svg = views?.Front || '';
  if (!svg || svg.length < 80) throw new Error('empty composed svg');
  return stripGotchiBackground(svg);
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
    return traits.slice(0, 6).map((n) => Number(n) || 50);
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
    svg = stripGotchiBackground(svg);
  }
  const style = `<style>
    .gotchi-primary,.gotchi-primary *{fill:${collateral.primaryColor}!important}
    .gotchi-secondary,.gotchi-secondary *{fill:${collateral.secondaryColor}!important}
    .gotchi-collateral,.gotchi-collateral *{fill:${collateral.primaryColor}!important}
    .gotchi-cheek,.gotchi-cheek *{fill:${collateral.cheekColor}!important}
    .gotchi-eyeColor,.gotchi-eyeColor *{fill:${collateral.secondaryColor}!important}
    .gotchi-primary-mouth,.gotchi-primary-mouth *{fill:${collateral.primaryColor}!important}
  </style>`;
  return svg.replace(/<svg([^>]*)>/, `<svg$1>${style}`);
}

/**
 * SVG spritesheet that embeds each side as a self-contained data-URI <image>.
 * Nesting frame markup (like `_aavegotchiSpriteSVG`) shares one CSS scope and drops
 * class-based body fills; per-frame data URIs keep each side's <style> intact.
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
      let src = String(svg || '').trim();
      if (!src) return '';
      if (!src.includes('xmlns=')) {
        src = src.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!/viewBox=/i.test(src)) {
        src = src.replace(/<svg\b([^>]*)>/i, '<svg$1 viewBox="0 0 64 64">');
      }
      if (!/\swidth=/i.test(src)) {
        src = src.replace(/<svg\b([^>]*)>/i, `<svg$1 width="${frameSize}" height="${frameSize}">`);
      }
      const href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
      const x = (i % columns) * frameSize;
      const y = Math.floor(i / columns) * frameSize;
      return `<image x="${x}" y="${y}" width="${frameSize}" height="${frameSize}" href="${href}" />`;
    })
    .join('');

  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${frames}</svg>`;
  return URL.createObjectURL(new Blob([sheet], { type: 'image/svg+xml;charset=utf-8' }));
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
      traits: [...(info.numericTraits || [])].slice(0, 6).map((t) => Number(t) || 50),
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
): Promise<string> {
  const equipped = padEquip(equippedWearables);
  const tid = String(sourceTokenId || '').trim();
  const isL1 = Boolean(tid && tid !== '0' && /^\d+$/.test(tid));

  let hauntId = 1;
  let addr = collateralAddress(collateral);
  let traitArr = padTraits(traits);

  if (isL1) {
    const identity = await fetchBaseGotchiIdentity(tid);
    if (identity) {
      hauntId = identity.hauntId;
      addr = identity.collateral;
      traitArr = identity.traits;
    }
  }

  const cacheKey = `json:v1:${tid || addr || collateral.name}:h${hauntId}:t${traitArr.join(',')}:w${equipped.join(',')}`;
  if (svgCache.has(cacheKey)) return svgCache.get(cacheKey);

  if (!addr) {
    const fallback = buildCollateralGotchiSvg(collateral);
    svgCache.set(cacheKey, fallback);
    return fallback;
  }

  try {
    const cleaned = await composeOfflineSvg(hauntId, addr, traitArr, equipped);
    svgCache.set(cacheKey, cleaned);
    return cleaned;
  } catch (composeErr) {
    console.warn('@fetchCollateralGotchiSvg compose', collateral.name, tid || '', composeErr);
    try {
      const cleaned = await previewOnBase(hauntId, addr, traitArr, equipped);
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
): Promise<string> {
  const svg = await fetchCollateralGotchiSvg(
    collateral,
    undefined,
    network,
    equippedWearables,
    traits,
    sourceTokenId,
  );
  return convertInlineSVGToBlobURL(svg);
}

/**
 * 4-direction sprites for a cartridge cAavegotchi.
 * Prefer offline JSON compose for all sides; fall back to front compose + recolored defaults.
 */
export async function fetchCartridgeHeroSideSVGs(
  collateral: CollateralObject,
  network?: NetworkNames | string,
  equippedWearables?: number[] | Tuple<number, 16> | null,
  traits?: number[] | Tuple<number, 6> | null,
  sourceTokenId?: string | null,
): Promise<[string, string, string, string]> {
  const equipped = padEquip(equippedWearables);
  const tid = String(sourceTokenId || '').trim();
  const isL1 = Boolean(tid && tid !== '0' && /^\d+$/.test(tid));

  let hauntId = 1;
  let addr = collateralAddress(collateral);
  let traitArr = padTraits(traits);

  if (isL1) {
    const identity = await fetchBaseGotchiIdentity(tid);
    if (identity) {
      hauntId = identity.hauntId;
      addr = identity.collateral;
      traitArr = identity.traits;
    }
  }

  if (addr) {
    try {
      const views = await composeAllViews({
        hauntId,
        collateralType: addr,
        numericTraits: traitArr,
        equippedWearables: equipped,
      });
      const sides: [string, string, string, string] = [
        stripGotchiBackground(views.Front || ''),
        stripGotchiBackground(views.Left || ''),
        stripGotchiBackground(views.Right || ''),
        stripGotchiBackground(views.Back || ''),
      ];
      if (sides[0].length >= 80) return sides;
    } catch (err) {
      console.warn('@fetchCartridgeHeroSideSVGs compose', collateral.name, err);
    }
  }

  const front = await fetchCollateralGotchiSvg(
    collateral,
    undefined,
    network,
    equippedWearables,
    traits,
    sourceTokenId,
  );
  return [
    front,
    buildCollateralGotchiSvgFromBase(defaultGotchi[1], collateral),
    buildCollateralGotchiSvgFromBase(defaultGotchi[2], collateral),
    buildCollateralGotchiSvgFromBase(defaultGotchi[3], collateral),
  ];
}
