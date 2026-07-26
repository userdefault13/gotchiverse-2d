import styles from './styles';
import { CollateralGotchiCard, GotchiSelectCard } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { WearableThumbnail } from 'components/UI/widgets';
import { getMintableCollaterals, type CollateralObject } from 'helpers/ethers.helper';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useEffect, useMemo, useState } from 'react';
import { useUser } from 'contexts/UserContext';
import type { GotchiverseAavegotchi } from 'types';
import LazyLoad from 'react-lazyload';
import { mintedSourceTokenIds } from 'helpers/cartridgeHero.helper';
import { listEquippedWearableSlots, slotLabel } from 'helpers/cartridgeWearable.helper';

type MintTab = 'caavegotchi' | 'wallet';

interface Props {
  selectedCollateral?: CollateralObject | null;
  onSelect: (collateral: CollateralObject) => void;
  onMint: () => void | Promise<void>;
  minting?: boolean;
  mintError?: string | null;
  selectedWalletGotchiId?: string | null;
  onSelectWalletGotchi?: (gotchi: GotchiverseAavegotchi) => void;
  onMintWalletGotchi?: (opts: { withWearables: boolean }) => void | Promise<void>;
  onMintAllOwnedWalletGotchis?: (opts: { withWearables: boolean }) => void | Promise<void>;
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
  const [mintWithWearables, setMintWithWearables] = useState(true);

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
    void onMintWalletGotchi?.({ withWearables: mintWithWearables });
  };

  const handleMintAllOwned = () => {
    if (minting || unmintedOwned.length === 0) return;
    click();
    void onMintAllOwnedWalletGotchis?.({ withWearables: mintWithWearables });
  };

  const label = selectedCollateral
    ? selectedCollateral.maticDisplay || selectedCollateral.name
    : null;

  const selectedWallet = walletGotchis.find((g) => g.id === selectedWalletGotchiId) || null;
  const selectedAlreadyMinted = selectedWallet ? mintedIds.has(String(selectedWallet.id)) : false;
  const walletEligible = Boolean(selectedWallet) && !selectedAlreadyMinted;

  const selectedGear = useMemo(() => {
    if (!selectedWallet) return [];
    const bindKind = selectedWallet.isLent ? 'rental' : 'owned';
    return listEquippedWearableSlots(selectedWallet, bindKind);
  }, [selectedWallet]);

  const selectedGearUsd = selectedGear.reduce((sum, s) => sum + (s.importFeeUsd || 0), 0);
  const hasSelectedGear = selectedGear.length > 0;

  const mintAllGear = useMemo(() => {
    if (!mintWithWearables) return { count: 0, usd: 0 };
    let count = 0;
    let usd = 0;
    for (const g of unmintedOwned) {
      const slots = listEquippedWearableSlots(g, 'owned');
      count += slots.length;
      usd += slots.reduce((sum, s) => sum + (s.importFeeUsd || 0), 0);
    }
    return { count, usd };
  }, [unmintedOwned, mintWithWearables]);

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
              Gotchi mint is <span className="price-tag free">FREE</span>. Optional wearables mint as individual
              cWearables (owned free · borrowed rarity fees) then equip automatically.
            </p>

            {hasSelectedGear || unmintedOwned.some((g) => listEquippedWearableSlots(g, 'owned').length > 0) ? (
              <label className="wearables-toggle">
                <input
                  type="checkbox"
                  checked={mintWithWearables}
                  disabled={minting}
                  onChange={() => {
                    click();
                    setMintWithWearables((v) => !v);
                  }}
                />
                <span>
                  Mint with wearables
                  {hasSelectedGear ? (
                    <>
                      {' '}
                      · {selectedGear.length} on #{selectedWallet?.id}
                      {selectedGearUsd > 0 ? (
                        <>
                          {' '}
                          · <span className="price-tag">${selectedGearUsd}</span>{' '}
                          <span className="price-note">(sim)</span>
                        </>
                      ) : (
                        <>
                          {' '}
                          · <span className="price-tag free">FREE</span>
                        </>
                      )}
                    </>
                  ) : null}
                </span>
              </label>
            ) : null}

            {mintWithWearables && hasSelectedGear ? (
              <div className="gear-preview scrollable">
                {selectedGear.map((slot) => (
                  <div key={`${slot.slotIndex}:${slot.itemTypeId}`} className="gear-row">
                    <WearableThumbnail itemTypeId={slot.itemTypeId} name={slot.name} size={36} />
                    <div className="gear-meta">
                      <span className="gear-name">{slot.name}</span>
                      <span className="gear-sub">
                        {slotLabel(slot.slotIndex)} · {slot.rarity}
                      </span>
                    </div>
                    <span className={`gear-price ${slot.importFeeUsd <= 0 ? 'free' : ''}`}>
                      {slot.importFeeUsd <= 0 ? 'FREE' : `$${slot.importFeeUsd}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mint-cta mint-cta-stack mint-cta-top">
              <Button
                size={2.4}
                fullWidth
                onClick={handleMintAllOwned}
                disabled={unmintedOwned.length === 0 || minting}
              >
                {minting
                  ? 'Minting…'
                  : unmintedOwned.length === 0
                    ? 'All Owned Minted'
                    : mintWithWearables && mintAllGear.count > 0
                      ? mintAllGear.usd > 0
                        ? `Mint All Owned + ${mintAllGear.count} Wearables · $${mintAllGear.usd}`
                        : `Mint All Owned + ${mintAllGear.count} Wearables · FREE`
                      : `Mint All Owned Unminted (${unmintedOwned.length})`}
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
                    : !selectedWallet
                      ? 'Select a Wallet Gotchi'
                      : mintWithWearables && hasSelectedGear
                        ? selectedGearUsd > 0
                          ? `Mint #${selectedWallet.id} + ${selectedGear.length} Wearables · $${selectedGearUsd}`
                          : `Mint #${selectedWallet.id} + ${selectedGear.length} Wearables · FREE`
                        : `Mint Free · #${selectedWallet.id}`}
              </Button>
              <p className="mint-hint">
                {mintWithWearables
                  ? 'Each wearable mints as its own cWearable, then equips onto the new hero.'
                  : 'Mint without wearables — naked cAavegotchi. Import gear later under cWearables.'}
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
