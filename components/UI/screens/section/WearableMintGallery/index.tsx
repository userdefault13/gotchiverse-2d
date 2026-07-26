import { useEffect, useMemo, useState } from 'react';
import styles from './styles';
import { Button } from 'components/UI/elements';
import { WearableThumbnail } from 'components/UI/widgets';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useUser } from 'contexts/UserContext';
import { mintedSourceTokenIds } from 'helpers/cartridgeHero.helper';
import {
  listMintableWearablesFromBoundGotchis,
  slotLabel,
  type MintableWearableRow,
} from 'helpers/cartridgeWearable.helper';

type ViewMode = 'list' | 'grid';
const VIEW_STORAGE_KEY = 'cwearablesMintView';

interface Props {
  cartKeys: Set<string>;
  onAddToCart: (row: MintableWearableRow) => void;
  onAddAllToCart: (rows: MintableWearableRow[]) => void;
  minting?: boolean;
}

export const WearableMintGallery = ({
  cartKeys,
  onAddToCart,
  onAddAllToCart,
  minting = false,
}: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const [{ userAavegotchis, cartridgeHeroes, wearableInventory }] = useUser();

  const boundIds = useMemo(() => mintedSourceTokenIds(cartridgeHeroes), [cartridgeHeroes]);
  const rows = useMemo(
    () => listMintableWearablesFromBoundGotchis(userAavegotchis, boundIds, wearableInventory),
    [userAavegotchis, boundIds, wearableInventory],
  );
  const unminted = useMemo(() => rows.filter((r) => !r.alreadyMinted), [rows]);
  const notInCart = useMemo(() => unminted.filter((r) => !cartKeys.has(r.key)), [unminted, cartKeys]);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === 'list' || saved === 'grid') setViewMode(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setView = (mode: ViewMode) => {
    if (mode === viewMode) return;
    click();
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const addOne = (row: MintableWearableRow) => {
    if (minting || row.alreadyMinted || cartKeys.has(row.key)) return;
    click();
    onAddToCart(row);
  };

  const addAll = () => {
    if (minting || notInCart.length === 0) return;
    click();
    onAddAllToCart(notInCart);
  };

  const renderRow = (row: MintableWearableRow) => {
    const inCart = cartKeys.has(row.key);
    const ownership = row.bindKind === 'rental' ? 'borrowed' : 'owned';
    const priceLabel = row.alreadyMinted
      ? 'Minted'
      : inCart
        ? 'In cart'
        : row.importFeeUsd <= 0
          ? 'FREE'
          : `$${row.importFeeUsd}`;
    const priceClass = row.alreadyMinted || row.importFeeUsd <= 0 || inCart ? 'free' : '';
    const disabled = minting || row.alreadyMinted || inCart;

    if (viewMode === 'grid') {
      const tip = `${row.name} · #${row.sourceTokenId} · ${slotLabel(row.slotIndex)} · ${row.rarity} · ${ownership} · ${priceLabel}`;
      return (
        <button
          key={row.key}
          type="button"
          className={`wearable-card icon-only ${inCart ? 'checked' : ''} ${row.alreadyMinted ? 'minted' : ''}`}
          disabled={disabled}
          onClick={() => addOne(row)}
          aria-label={tip}
        >
          <span className={`check-dot ${inCart ? 'on' : ''}`} aria-hidden />
          <div className="card-art">
            <WearableThumbnail itemTypeId={row.itemTypeId} name={row.name} size={64} />
          </div>
          {/* In-card tip so it never clips into the right-rail cart. */}
          <span className="card-tip" role="tooltip">
            <span className="wearable-name">{row.name}</span>
            <span className="wearable-sub">
              #{row.sourceTokenId} · {slotLabel(row.slotIndex)} · {row.rarity} · {ownership}
            </span>
            <span className={`wearable-price ${priceClass}`}>{priceLabel}</span>
          </span>
        </button>
      );
    }

    return (
      <button
        key={row.key}
        type="button"
        className={`wearable-row ${inCart ? 'checked' : ''} ${row.alreadyMinted ? 'minted' : ''}`}
        disabled={disabled}
        onClick={() => addOne(row)}
      >
        <WearableThumbnail itemTypeId={row.itemTypeId} name={row.name} size={44} />
        <div className="wearable-meta">
          <span className="wearable-name">{row.name}</span>
          <span className="wearable-sub">
            #{row.sourceTokenId} · {slotLabel(row.slotIndex)} · {row.rarity} · {ownership}
          </span>
        </div>
        <span className={`wearable-price ${priceClass}`}>{priceLabel}</span>
      </button>
    );
  };

  return (
    <>
      <div className="wearable-mint-gallery">
        <h2 className="gallery-title">Mint cWearables</h2>
        <p className="gallery-caption">
          Tap to add to cart. Owned = <span className="price-tag free">FREE</span>
          {' · '}
          borrowed = rarity fees <span className="price-note">(sim)</span>. Checkout on the right.
        </p>

        <div className="mint-cta mint-cta-top">
          <Button size={2.4} fullWidth onClick={addAll} disabled={notInCart.length === 0 || minting}>
            {notInCart.length === 0
              ? unminted.length === 0
                ? 'All Available Minted'
                : 'All In Cart'
              : `Add All to Cart (${notInCart.length})`}
          </Button>
          <p className="mint-hint">Bind wallet gotchis under Manage first — only their equipped gear can mint.</p>
        </div>

        <div className="toolbar">
          <span className="count">
            {cartKeys.size} in cart · {unminted.length} unminted · {rows.length} total
          </span>
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              aria-pressed={viewMode === 'list'}
            >
              List
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setView('grid')}
              aria-pressed={viewMode === 'grid'}
            >
              Grid
            </button>
          </div>
        </div>

        <div className={`wearable-items scrollable ${viewMode}`}>
          {rows.length === 0 ? (
            <p className="empty">
              No equipped wearables on bound gotchis yet. Mint cAavegotchis from Wallet Gotchis, then return
              here.
            </p>
          ) : (
            rows.map(renderRow)
          )}
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
