import { useWeb3 } from 'contexts/Web3Context';
import { useEffect, useState } from 'react';
import { convertInlineSVGToBlobURL, customiseSvg, CustomiseOptions } from 'helpers/aavegotchi';
import { fetchAavegotchiSideSVGs, getObservorSides, isTrueSpectator } from 'helpers/gotchi.helper';
import Image from 'next/image';
import { GotchiLoading } from 'assets';
import { NetworkNames } from 'types';

interface Props {
  tokenId: string;
  options?: CustomiseOptions;
  side?: 0 | 1 | 2 | 3;
  height?: number;
  isSpectator?: boolean;
  radius?: number;
  /** Carry selected gotchi compose opts so the card matches select → play. */
  equippedWearables?: number[];
  traits?: number[];
  cartridgeCollateral?: string;
  hauntId?: number;
  sourceTokenId?: string;
  network?: NetworkNames;
}

export const GotchiSVG = ({
  tokenId,
  options,
  side = 0,
  height = 12,
  isSpectator = false,
  radius = 0,
  equippedWearables,
  traits,
  cartridgeCollateral,
  hauntId,
  sourceTokenId,
  network,
}: Props): JSX.Element => {
  const [{ currentNetwork, globalProvider }] = useWeb3();
  const [svg, setSvg] = useState<string>();
  const [blob, setBlob] = useState<any>();
  const [sideviews, setSideviews] = useState<string[]>();
  const [loading, setLoading] = useState(true);

  const fetchGotchiSvg = async (id: string) => {
    setLoading(true);
    setSvg(undefined);
    setSideviews(undefined);
    try {
      const sideviewArray = await fetchAavegotchiSideSVGs(id, {
        equippedWearables,
        traits,
        cartridgeCollateral,
        hauntId,
        sourceTokenId,
        network: network || currentNetwork,
      });
      setSideviews(sideviewArray);
      if (!isTrueSpectator(isSpectator) && sideviewArray?.[side]) {
        setSvg(options ? customiseSvg(sideviewArray[side], options) : sideviewArray[side]);
      }
    } catch (error) {
      console.warn('@GotchiSVG fetch failed', id, error);
      setSvg(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentNetwork && globalProvider && !isTrueSpectator(isSpectator)) void fetchGotchiSvg(tokenId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when identity / equip changes
  }, [
    tokenId,
    currentNetwork,
    globalProvider,
    isSpectator,
    cartridgeCollateral,
    hauntId,
    sourceTokenId,
    equippedWearables?.join?.(','),
    traits?.join?.(','),
  ]);

  const removeBg = Boolean(options?.removeBg);
  const animate = Boolean(options?.animate);

  // Apply side (0 front, 1 left, 2 right, 3 back) once SVGs are loaded — including enter-portal flip.
  useEffect(() => {
    if (isTrueSpectator(isSpectator)) return;
    if (!sideviews?.[side]) return;
    const opts = options ? { ...options, removeBg, animate } : undefined;
    setSvg(opts ? customiseSvg(sideviews[side], opts) : sideviews[side]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-style when side or flags change
  }, [side, sideviews, isSpectator, removeBg, animate]);

  useEffect(() => {
    if (!svg) {
      setBlob(undefined);
      return;
    }
    const next = convertInlineSVGToBlobURL(svg);
    setBlob(next);
    return () => {
      try {
        URL.revokeObjectURL(next);
      } catch {
        /* ignore */
      }
    };
  }, [svg]);

  const src = isTrueSpectator(isSpectator)
    ? getObservorSides()[side]
    : blob && !loading
      ? blob
      : GotchiLoading;

  return (
    <div style={{ height: `${height}rem`, width: `${height}rem`, position: 'relative', borderRadius: `${radius}px` }}>
      <Image
        key={`${tokenId}-${side}-${src === GotchiLoading ? 'loading' : 'ready'}`}
        alt=""
        src={src}
        layout="fill"
        objectFit="contain"
        unoptimized={typeof src === 'string' && src.startsWith('blob:')}
      />
    </div>
  );
};
