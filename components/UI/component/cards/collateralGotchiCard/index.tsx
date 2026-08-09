import styles from './styles';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { fetchCollateralGotchiBlobUrl } from 'helpers/collateralPreview';
import { collateralDisplayName, isRhH3BrandName, type CollateralObject } from 'helpers/ethers.helper';
import { useEffect, useState } from 'react';
import { useWeb3 } from 'contexts/Web3Context';
import { GotchiLoading } from 'assets';
import Image from 'next/image';

interface Props {
  collateral: CollateralObject;
  isSelected?: boolean;
  onSelect: (collateral: CollateralObject) => void;
}

export const CollateralGotchiCard = ({ collateral, isSelected, onSelect }: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const [{ currentNetwork }] = useWeb3();
  const [blobUrl, setBlobUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    let createdUrl = '';
    void fetchCollateralGotchiBlobUrl(collateral, currentNetwork).then((url) => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      createdUrl = url;
      setBlobUrl(url);
    });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [collateral, currentNetwork]);

  return (
    <>
      <div
        className={`gotchi-panel clickable ${isSelected ? 'selected' : ''}`}
        style={{
          // @ts-expect-error CSS custom properties
          '--border-color': collateral.primaryColor,
          '--label-bg-color': collateral.primaryColor,
          // Lime RH H3 brand bars need black type (white on #ccff00 is unreadable)
          '--label-text-color': isRhH3BrandName(collateral.name) ? '#000000' : 'white',
        }}
        onClick={() => {
          click();
          onSelect(collateral);
        }}
      >
        <div className="gotchi-img">
          <div className="gotchi-img-wrapper">
            <div className="gotchi-avatar">
              <Image alt="" src={blobUrl || GotchiLoading} layout="fill" objectFit="contain" unoptimized={!!blobUrl} />
            </div>
          </div>
        </div>
        <p className="gotchi-name">{collateralDisplayName(collateral)}</p>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
