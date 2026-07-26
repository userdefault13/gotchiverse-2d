import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
const TIP_WIDTH = 240;

type GridTip = {
  key: string;
  name: string;
  sub: string;
  price: string;
  priceFree: boolean;
  top: number;
  left: number;
};

interface Props {
  cartKeys: Set<string>;
  onAddToCart: (row: MintableWearableRow) => void;
  onAddAllToCart: (rows: MintableWearableRow[]) => void;
  minting?: boolean;
}

function tipPosition(rect: DOMRect): { top: number; left: number } {
  const gap = 8;
  // Prefer anchoring under the tile; flip above if near the bottom.
  let top = rect.bottom + gap;
  if (top + 96 > window.innerHeight - 12) {
    top = Math.max(12, rect.top - gap - 88);
  }

  // Keep tip out of the right-rail cart: if tile is on the right half, grow left.
  const preferLeft = rect.right > window.innerWidth * 0.58;
  let left = preferLeft ? rect.right - TIP_WIDTH : rect.left;
  const minLeft = 12;
  const maxLeft = window.innerWidth - TIP_WIDTH - 12;
  left = Math.min(maxLeft, Math.max(minLeft, left));

  return { top, left };
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
  const [gridTip, setGridTip] = useState<GridTip | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === 'list' || saved === 'grid') setViewMode(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (viewMode !== 'grid') setGridTip(null);
  }, [viewMode]);

  useEffect(() => {
    if (!gridTip) return;
    const hide = () => setGridTip(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [gridTip]);

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

  const openTip = (row: MintableWearableRow, el: HTMLElement, priceLabel: string, ownership: string) => {
    const rect = el.getBoundingClientRect();
    const pos = tipPosition(rect);
    setGridTip({
      key: row.key,
      name: row.name,
      sub: `#${row.sourceTokenId} · ${slotLabel(row.slotIndex)} · ${row.rarity} · ${ownership}`,
      price: priceLabel,
      priceFree: row.alreadyMinted || row.importFeeUsd <= 0 || cartKeys.has(row.key),
      top: pos.top,
      left: pos.left,
    });
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
      const label = `${row.name} · #${row.sourceTokenId} · ${slotLabel(row.slotIndex)} · ${row.rarity} · ${ownership} · ${priceLabel}`;
      return (
        <button
          key={row.key}
          type="button"
          className={`wearable-card icon-only ${inCart ? 'checked' : ''} ${row.alreadyMinted ? 'minted' : ''}`}
          disabled={disabled}
          onClick={() => addOne(row)}
          aria-label={label}
          onMouseEnter={(e) => openTip(row, e.currentTarget, priceLabel, ownership)}
          onMouseLeave={() => setGridTip((t) => (t?.key === row.key ? null : t))}
          onFocus={(e) => openTip(row, e.currentTarget, priceLabel, ownership)}
          onBlur={() => setGridTip((t) => (t?.key === row.key ? null : t))}
        >
          <span className={`check-dot ${inCart ? 'on' : ''}`} aria-hidden />
          <div className="card-art">
            <WearableThumbnail itemTypeId={row.itemTypeId} name={row.name} size={64} />
          </div>
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

      {portalReady &&
        gridTip &&
        createPortal(
          <div
            className="cwearable-grid-tip"
            role="tooltip"
            style={{ top: gridTip.top, left: gridTip.left, width: TIP_WIDTH }}
          >
            <span className="tip-name">{gridTip.name}</span>
            <span className="tip-sub">{gridTip.sub}</span>
            <span className={`tip-price ${gridTip.priceFree ? 'free' : ''}`}>{gridTip.price}</span>
            <style jsx global>{`
              .cwearable-grid-tip {
                position: fixed;
                z-index: 10050;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                gap: 0.2rem;
                padding: 0.7rem 0.8rem;
                border-radius: 0.45rem;
                border: 0.18rem solid rgba(255, 122, 233, 0.75);
                background: rgba(18, 4, 32, 0.96);
                box-shadow: 0 0 16px rgba(0, 0, 0, 0.55), 0 0 10px rgba(255, 122, 233, 0.35);
                color: #fff;
                font-family: Pixelar, sans-serif;
              }
              .cwearable-grid-tip .tip-name {
                font-family: 'Kimberley Rg', sans-serif;
                font-size: 1.35rem;
                line-height: 1.2;
              }
              .cwearable-grid-tip .tip-sub {
                font-size: 1.15rem;
                line-height: 1.3;
                color: rgba(255, 214, 247, 0.85);
                text-transform: capitalize;
              }
              .cwearable-grid-tip .tip-price {
                font-family: 'Kimberley Rg', sans-serif;
                font-size: 1.3rem;
                color: #ff7ae9;
              }
              .cwearable-grid-tip .tip-price.free {
                color: #6dffb0;
              }
            `}</style>
          </div>,
          document.body,
        )}

      <style jsx>{styles}</style>
    </>
  );
};
