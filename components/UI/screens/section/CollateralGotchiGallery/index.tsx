import styles from './styles';
import { CollateralGotchiCard } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { getMintableCollaterals, type CollateralObject } from 'helpers/ethers.helper';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useMemo } from 'react';

interface Props {
  selectedCollateral?: CollateralObject | null;
  onSelect: (collateral: CollateralObject) => void;
  onMint: () => void | Promise<void>;
  minting?: boolean;
  mintError?: string | null;
}

export const CollateralGotchiGallery = ({
  selectedCollateral,
  onSelect,
  onMint,
  minting = false,
  mintError = null,
}: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const items = useMemo(() => getMintableCollaterals(), []);

  const handleMint = () => {
    if (minting || !selectedCollateral) return;
    click();
    void onMint();
  };

  const label = selectedCollateral
    ? selectedCollateral.maticDisplay || selectedCollateral.name
    : null;

  return (
    <>
      <div className="collateral-gallery">
        <h2 className="gallery-title">cAavegotchis</h2>
        <p className="gallery-caption">Pick a collateral spirit for your cartridge mint.</p>
        <div className="gotchi-list-container">
          <div className="gotchi-list-inner scrollable">
            {items.map((collateral) => (
              <div key={collateral.svgId} className="gotchi-card">
                <CollateralGotchiCard
                  collateral={collateral}
                  isSelected={selectedCollateral?.svgId === collateral.svgId}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="mint-cta">
          <Button size={2.4} fullWidth onClick={handleMint} disabled={!selectedCollateral || minting}>
            {minting ? 'Binding…' : label ? `Bind ${label}` : 'Select a Collateral'}
          </Button>
          {mintError ? <p className="mint-error">{mintError}</p> : null}
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
