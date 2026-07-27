import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import styles from './styles';
import { Button } from 'components/UI/elements';
import { MintHoverTip, SoftCText, WearableThumbnail, mintTipPosition, type MintHoverTipData } from 'components/UI/widgets';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useUser } from 'contexts/UserContext';
import { mintedSourceTokenIds } from 'helpers/cartridgeHero.helper';
import {
  listMintableWearablesFromBoundGotchis,
  slotLabel,
  wearableRarityCssVars,
  type MintableWearableRow,
} from 'helpers/cartridgeWearable.helper';

type ViewMode = 'list' | 'grid';
const VIEW_STORAGE_KEY = 'cwearablesMintView';

type GridTip = MintHoverTipData & { key: string };

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
  const [gridTip, setGridTip] = useState<GridTip | null>(null);

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
    // Only clear on window resize — capture-phase scroll listeners fire on
    // overflow containers during layout and kill the tip immediately.
    const hide = () => setGridTip(null);
    window.addEventListener('resize', hide);
    return () => window.removeEventListener('resize', hide);
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
    const inCart = cartKeys.has(row.key);
    const status = row.alreadyMinted ? 'Already minted' : inCart ? 'In cart' : 'Available to mint';
    const pos = mintTipPosition(el.getBoundingClientRect());
    setGridTip({
      key: row.key,
      name: row.name,
      lines: [
        `${slotLabel(row.slotIndex)} · ${row.rarity} · ${ownership}`,
        `From ${row.gotchiName} · #${row.sourceTokenId}`,
      ],
      price: status === 'Available to mint' ? priceLabel : `${priceLabel} · ${status}`,
      priceFree: row.alreadyMinted || row.importFeeUsd <= 0 || inCart,
      ...pos,
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

    const rarityStyle = wearableRarityCssVars(row.rarity) as CSSProperties;

    if (viewMode === 'grid') {
      const label = `${row.name} · #${row.sourceTokenId} · ${slotLabel(row.slotIndex)} · ${row.rarity} · ${ownership} · ${priceLabel}`;
      return (
        <button
          key={row.key}
          type="button"
          className={`cwear-grid-tile rarity-${row.rarity} ${inCart ? 'checked' : ''} ${
            row.alreadyMinted ? 'minted' : ''
          }`}
          style={rarityStyle}
          aria-disabled={disabled || undefined}
          onClick={() => {
            if (disabled) return;
            addOne(row);
          }}
          aria-label={label}
          onMouseEnter={(e) => openTip(row, e.currentTarget, priceLabel, ownership)}
          onMouseLeave={() => setGridTip((t) => (t?.key === row.key ? null : t))}
          onFocus={(e) => openTip(row, e.currentTarget, priceLabel, ownership)}
          onBlur={() => setGridTip((t) => (t?.key === row.key ? null : t))}
        >
          <span className={`cwear-grid-check ${inCart ? 'on' : ''}`} aria-hidden />
          <WearableThumbnail itemTypeId={row.itemTypeId} name={row.name} size={72} rarity={row.rarity} />
        </button>
      );
    }

    return (
      <button
        key={row.key}
        type="button"
        className={`wearable-row rarity-${row.rarity} ${inCart ? 'checked' : ''} ${
          row.alreadyMinted ? 'minted' : ''
        }`}
        style={rarityStyle}
        disabled={disabled}
        onClick={() => addOne(row)}
      >
        <WearableThumbnail itemTypeId={row.itemTypeId} name={row.name} size={44} rarity={row.rarity} />
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
        <h2 className="gallery-title">
          <span className="title-lead">Mint</span>{' '}
          <SoftCText>cWearables</SoftCText>
        </h2>
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

        <div
          className={`wearable-items scrollable ${viewMode}`}
          style={
            viewMode === 'grid'
              ? {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  columnGap: '1.6rem',
                  rowGap: '2.8rem',
                  alignContent: 'start',
                }
              : undefined
          }
        >
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

      {gridTip ? <MintHoverTip tip={gridTip} /> : null}

      <style jsx>{styles}</style>
      <style jsx global>{`
        .cwear-grid-tile {
          appearance: none;
          -webkit-appearance: none;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          aspect-ratio: 1 / 1;
          min-height: 10rem;
          margin: 0;
          padding: 1rem;
          border: 0.25rem solid var(--rarity-border, #ff7ae9);
          border-radius: 0.55rem;
          background: linear-gradient(
            160deg,
            color-mix(in srgb, var(--rarity-glow, #ff7ae9) 28%, transparent),
            rgba(20, 8, 40, 0.95)
          );
          box-shadow: inset 0 0 14px 2px color-mix(in srgb, var(--rarity-border, #ff7ae9) 40%, transparent);
          color: #fff;
          cursor: pointer;
          overflow: hidden;
          font: inherit;
          box-sizing: border-box;
        }
        .cwear-grid-tile:hover,
        .cwear-grid-tile.checked {
          box-shadow:
            0 0 10px var(--rarity-glow, #ffe600),
            0 0 6px var(--rarity-border, #ff7ae9),
            inset 0 0 14px 2px color-mix(in srgb, var(--rarity-border, #ff7ae9) 45%, transparent);
          z-index: 2;
        }
        .cwear-grid-tile.checked {
          border-color: var(--rarity-glow, #ffd6f7);
          background: linear-gradient(
            160deg,
            color-mix(in srgb, var(--rarity-border, #ff7ae9) 40%, transparent),
            color-mix(in srgb, var(--rarity-bg, #6b1a62) 55%, #140828)
          );
        }
        .cwear-grid-tile.minted,
        .cwear-grid-tile[aria-disabled='true'] {
          opacity: 0.55;
          cursor: default;
        }
        .cwear-grid-check {
          position: absolute;
          top: 0.45rem;
          left: 0.45rem;
          z-index: 2;
          width: 1.2rem;
          height: 1.2rem;
          border-radius: 0.3rem;
          border: 0.18rem solid color-mix(in srgb, var(--rarity-border, #ffd6f7) 80%, #fff);
          background: rgba(0, 0, 0, 0.45);
        }
        .cwear-grid-check.on {
          background: var(--rarity-border, #ff7ae9);
          border-color: var(--rarity-glow, #ffd6f7);
          box-shadow: 0 0 6px var(--rarity-glow, #ff7ae9);
        }
`}</style>
    </>
  );
};
