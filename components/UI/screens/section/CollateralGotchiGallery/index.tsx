import styles from './styles';
import { CollateralGotchiCard, GotchiSelectCard } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { getMintableCollaterals, type CollateralObject } from 'helpers/ethers.helper';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useEffect, useMemo, useState } from 'react';
import { useUser } from 'contexts/UserContext';
import type { GotchiverseAavegotchi } from 'types';
import LazyLoad from 'react-lazyload';
import { mintedSourceTokenIds } from 'helpers/cartridgeHero.helper';

type MintTab = 'caavegotchi' | 'wallet';

interface Props {
  selectedCollateral?: CollateralObject | null;
  onSelect: (collateral: CollateralObject) => void;
  onMint: () => void | Promise<void>;
  minting?: boolean;
  mintError?: string | null;
  selectedWalletGotchiId?: string | null;
  onSelectWalletGotchi?: (gotchi: GotchiverseAavegotchi) => void;
  onMintWalletGotchi?: () => void | Promise<void>;
  onMintAllOwnedWalletGotchis?: () => void | Promise<void>;
}

export const CollateralGotchiGallery = ({
  selectedCollateral,
  onSelect,
  onMint,
  minting = false,
  mintError = null,
  selectedWalletGotchiId = null,
  onSelectWalletGotchi,
  onMintWalletGotchi,
  onMintAllOwnedWalletGotchis,
}: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const [{ userAavegotchis, cartridgeHeroes }] = useUser();
  const items = useMemo(() => getMintableCollaterals(), []);
  const walletGotchis = userAavegotchis || [];

  const mintedIds = useMemo(() => mintedSourceTokenIds(cartridgeHeroes), [cartridgeHeroes]);
  const unmintedOwned = useMemo(
    () => walletGotchis.filter((g) => !g.isLent && !mintedIds.has(String(g.id))),
    [walletGotchis, mintedIds],
  );

  // Prefer Wallet Gotchis when the player has any — Mint All lives on that tab.
  const [tab, setTab] = useState<MintTab>(() => (walletGotchis.length > 0 ? 'wallet' : 'caavegotchi'));
  useEffect(() => {
    if (walletGotchis.length > 0 && tab === 'caavegotchi' && unmintedOwned.length > 0) {
      setTab('wallet');
    }
    // Only auto-switch when roster first becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletGotchis.length]);

  const handleMintCollateral = () => {
    if (minting || !selectedCollateral) return;
    click();
    void onMint();
  };

  const handleMintWallet = () => {
    if (minting || !selectedWalletGotchiId) return;
    click();
    void onMintWalletGotchi?.();
  };

  const handleMintAllOwned = () => {
    if (minting || unmintedOwned.length === 0) return;
    click();
    void onMintAllOwnedWalletGotchis?.();
  };

  const label = selectedCollateral
    ? selectedCollateral.maticDisplay || selectedCollateral.name
    : null;

  const selectedWallet = walletGotchis.find((g) => g.id === selectedWalletGotchiId) || null;
  const selectedAlreadyMinted = selectedWallet ? mintedIds.has(String(selectedWallet.id)) : false;
  const walletEligible = Boolean(selectedWallet) && !selectedAlreadyMinted;

  return (
    <>
      <div className="collateral-gallery">
        <h2 className="gallery-title">Mint cAavegotchi</h2>
        <div className="mint-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'caavegotchi'}
            className={`mint-tab ${tab === 'caavegotchi' ? 'active' : ''}`}
            onClick={() => {
              click();
              setTab('caavegotchi');
            }}
          >
            Collateral
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'wallet'}
            className={`mint-tab ${tab === 'wallet' ? 'active' : ''}`}
            onClick={() => {
              click();
              setTab('wallet');
            }}
          >
            Wallet Gotchis{unmintedOwned.length > 0 ? ` (${unmintedOwned.length})` : ''}
          </button>
        </div>

        {tab === 'caavegotchi' ? (
          <>
            <p className="gallery-caption">
              Base-level cAavegotchi — pick a collateral spirit. <span className="price-tag">$5 USDC</span>{' '}
              <span className="price-note">(sim — not live)</span>
            </p>
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
              <Button size={2.4} fullWidth onClick={handleMintCollateral} disabled={!selectedCollateral || minting}>
                {minting ? 'Binding…' : label ? `Bind ${label} · $5 USDC` : 'Select a Collateral'}
              </Button>
              <p className="mint-hint">Payment sim not live — bind proceeds without charge for now.</p>
              {mintError ? <p className="mint-error">{mintError}</p> : null}
            </div>
          </>
        ) : (
          <>
            <p className="gallery-caption">
              Owners and borrowers can mint for <span className="price-tag free">FREE</span>.
            </p>
            <div className="mint-cta mint-cta-stack mint-cta-top">
              <Button
                size={2.4}
                fullWidth
                onClick={handleMintAllOwned}
                disabled={unmintedOwned.length === 0 || minting}
              >
                {minting
                  ? 'Minting…'
                  : unmintedOwned.length > 0
                    ? `Mint All Owned Unminted (${unmintedOwned.length})`
                    : 'All Owned Minted'}
              </Button>
              <Button
                size={2.4}
                fullWidth
                onClick={handleMintWallet}
                disabled={!walletEligible || minting}
              >
                {minting
                  ? 'Minting…'
                  : selectedAlreadyMinted
                    ? `Already Minted · #${selectedWallet?.id}`
                    : selectedWallet
                      ? `Mint Free · #${selectedWallet.id}`
                      : 'Select a Wallet Gotchi'}
              </Button>
              <p className="mint-hint">
                Mint all binds every owned gotchi not already on your cartridge.
              </p>
              {mintError ? <p className="mint-error">{mintError}</p> : null}
            </div>
            <div className="gotchi-list-container">
              <div className="gotchi-list-inner scrollable wallet-grid">
                {walletGotchis.length === 0 ? (
                  <p className="empty-wallet">No wallet gotchis on this network yet.</p>
                ) : (
                  walletGotchis.map((gotchi) => {
                    const alreadyMinted = mintedIds.has(String(gotchi.id));
                    return (
                      <div
                        key={gotchi.id}
                        className={`gotchi-card ${alreadyMinted ? 'already-minted' : ''}`}
                      >
                        <LazyLoad once overflow={true} height={160}>
                          <GotchiSelectCard
                            gotchi={gotchi}
                            isSelected={gotchi.id === selectedWalletGotchiId}
                            handleSelect={(g) => {
                              if (alreadyMinted) return;
                              onSelectWalletGotchi?.(g);
                            }}
                          />
                        </LazyLoad>
                        {alreadyMinted ? <span className="minted-badge">Minted</span> : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
