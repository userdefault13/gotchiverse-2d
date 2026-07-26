import { defaultGotchi } from 'helpers/aavegotchi/svg';
import { convertInlineSVGToBlobURL, removeBG } from 'helpers/aavegotchi';
import type { CollateralObject } from 'helpers/ethers.helper';
import { ethers } from 'ethers';
import type { NetworkNames, Tuple } from 'types';
import { abis, varsForNetwork } from 'shared_code/web3/shared.const.web3';

const svgCache = new Map<string, string>();
const rpcProviders = new Map<string, ethers.providers.JsonRpcProvider>();

const EMPTY_WEARABLES = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as Tuple<number, 16>;

/**
 * Haunt-1 cAavegotchi preview traits:
 * [NRG, AGG, SPK, BRN, Eye Shape, Eye Color] — all base 50.
 */
export const BASE_PREVIEW_TRAITS = [50, 50, 50, 50, 50, 50] as Tuple<number, 6>;

/**
 * Classic aToken collaterals + previewAavegotchi live on the Polygon diamond.
 * Base diamond does not expose previewAavegotchi for these addresses.
 */
function previewNetwork(_network?: NetworkNames | string): NetworkNames {
  return 'matic';
}

function rpcProviderFor(network: NetworkNames): ethers.providers.JsonRpcProvider {
  if (!rpcProviders.has(network)) {
    const rpc = varsForNetwork(network).jsonRPC || 'https://mainnet.base.org';
    rpcProviders.set(network, new ethers.providers.StaticJsonRpcProvider(rpc));
  }
  return rpcProviders.get(network);
}

function collateralAddress(collateral: CollateralObject): string | null {
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

/**
 * 4-direction sprites for a cartridge cAavegotchi:
 * front = diamond previewAavegotchi; left/right/back = recolored default sides.
 */
export async function fetchCartridgeHeroSideSVGs(
  collateral: CollateralObject,
  network?: NetworkNames | string,
): Promise<[string, string, string, string]> {
  const front = await fetchCollateralGotchiSvg(collateral, undefined, network);
  return [
    front,
    buildCollateralGotchiSvgFromBase(defaultGotchi[1], collateral),
    buildCollateralGotchiSvgFromBase(defaultGotchi[2], collateral),
    buildCollateralGotchiSvgFromBase(defaultGotchi[3], collateral),
  ];
}

/** On-chain full cAavegotchi preview (body + eyes + collateral) with base 50 traits. */
export async function fetchCollateralGotchiSvg(
  collateral: CollateralObject,
  _walletProvider?: ethers.providers.Provider,
  network?: NetworkNames | string,
): Promise<string> {
  const addr = collateralAddress(collateral);
  const net = previewNetwork(network);
  const cacheKey = `${net}:${addr || collateral.name}:t50`;
  if (svgCache.has(cacheKey)) return svgCache.get(cacheKey);

  if (!addr) {
    const fallback = buildCollateralGotchiSvg(collateral);
    svgCache.set(cacheKey, fallback);
    return fallback;
  }

  try {
    const provider = rpcProviderFor(net);
    const diamond = varsForNetwork(net).aavegotchiDiamond;
    if (!diamond) throw new Error(`No aavegotchi diamond for ${net}`);
    const contract = new ethers.Contract(diamond, abis.aavegotchiDiamond, provider);
    const svg: string = await contract.previewAavegotchi(1, addr, BASE_PREVIEW_TRAITS, EMPTY_WEARABLES);
    if (!svg || typeof svg !== 'string' || svg.length < 100) {
      throw new Error('empty preview svg');
    }
    if (!svg.includes('gotchi-body') || !svg.includes('gotchi-collateral')) {
      throw new Error('incomplete preview svg layers');
    }
    const cleaned = stripGotchiBackground(svg);
    svgCache.set(cacheKey, cleaned);
    return cleaned;
  } catch (err) {
    console.warn('@fetchCollateralGotchiSvg', collateral.name, err);
    const fallback = buildCollateralGotchiSvg(collateral);
    svgCache.set(cacheKey, fallback);
    return fallback;
  }
}

/** Blob URL so each card/preview has isolated SVG defs (avoids id collisions). */
export async function fetchCollateralGotchiBlobUrl(
  collateral: CollateralObject,
  network?: NetworkNames | string,
): Promise<string> {
  const svg = await fetchCollateralGotchiSvg(collateral, undefined, network);
  return convertInlineSVGToBlobURL(svg);
}
