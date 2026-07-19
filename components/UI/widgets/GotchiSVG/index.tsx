import { useWeb3 } from 'contexts/Web3Context';
import { useEffect, useState } from 'react';
import { convertInlineSVGToBlobURL, customiseSvg, CustomiseOptions } from 'helpers/aavegotchi';
import { fetchAavegotchiSideSVGs, getObservorSides, isTrueSpectator } from 'helpers/gotchi.helper';
import Image from 'next/image';
import { GotchiLoading } from 'assets';

interface Props {
  tokenId: string;
  options?: CustomiseOptions;
  side?: 0 | 1 | 2 | 3;
  height?: number;
  isSpectator?: boolean;
  radius?: number;
}

export const GotchiSVG = ({ tokenId, options, side = 0, height = 12, isSpectator = false, radius = 0 }: Props): JSX.Element => {
  const [{ currentNetwork, globalProvider }] = useWeb3();
  const [svg, setSvg] = useState<string>();
  const [blob, setBlob] = useState<any>();
  const [sideviews, setSideviews] = useState<string[]>();
  const [loading, setLoading] = useState(true);

  const fetchGotchiSvg = async (id: string) => {
    setLoading(true);
    try {
      const sideviewArray = await fetchAavegotchiSideSVGs(id);
      setSideviews(sideviewArray);
      if (!isTrueSpectator(isSpectator) && sideviewArray?.[side]) {
        setSvg(options ? customiseSvg(sideviewArray[side], options) : sideviewArray[side]);
      }
    } catch (error) {
      console.warn('@GotchiSVG fetch failed', id, error);
    } finally {
      setLoading(false);
    }
  };

  const setSide = (selectSide: number) => {
    if (sideviews) {
      setSvg(options ? customiseSvg(sideviews[selectSide], options) : sideviews[selectSide]);
    }
  };

  useEffect(() => {
    if (svg) setSvg(options ? customiseSvg(svg, options) : svg);
  }, [options]);

  useEffect(() => {
    if (currentNetwork && globalProvider && !isTrueSpectator(isSpectator)) void fetchGotchiSvg(tokenId);
  }, [tokenId, currentNetwork, globalProvider, isSpectator]);

  useEffect(() => {
    setSide(side);
  }, [side]);

  useEffect(() => {
    if (svg) {
      const blob = convertInlineSVGToBlobURL(svg);
      setBlob(blob);
    }
  }, [svg]);

  return (
    <div style={{ height: `${height}rem`, width: `${height}rem`, position: 'relative', borderRadius: `${radius}px` }}>
      <Image alt=""
        src={isTrueSpectator(isSpectator) ? getObservorSides()[side] : blob && !loading ? blob : GotchiLoading}
        layout="fill"
        objectFit="contain"
      />
    </div>
  );
};
