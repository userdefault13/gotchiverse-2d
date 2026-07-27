import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import styles from './styles';
import { Button } from 'components/UI/elements';
import { InstallationThumbnail, PaarcelThumbnail, SoftCText } from 'components/UI/widgets';
import { Portal } from 'components/utility/Portal';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useUser } from 'contexts/UserContext';
import {
  installationCommonCssVars,
  listMintableInstallationsOnParcels,
  listMintablePaarcelsFromOwned,
  listMintableWalletInstallations,
  paarcelSizeCssVars,
  type MintableInstallationRow,
  type MintablePaarcelRow,
} from 'helpers/cartridgePaarcel.helper';

type ViewMode = 'list' | 'grid';
type CatalogTab = 'parcels' | 'installations';
const VIEW_STORAGE_KEY = 'cpaarcelsMintView';
const TAB_STORAGE_KEY = 'cpaarcelsMintTab';
const TIP_WIDTH = 240;
const TIP_EST_HEIGHT = 130;

type HoverTip = {
  key: string;
  name: string;
  sub: string;
  extra?: string;
  price: string;
  priceFree: boolean;
  top: number;
  left: number;
  place: 'above' | 'below';
};

interface Props {
  cartParcelKeys: Set<string>;
  cartInstallKeys: Set<string>;
  onAddParcel: (row: MintablePaarcelRow) => void;
  onAddInstallation: (row: MintableInstallationRow) => void;
  onAddAllParcelInstalls: (rows: MintableInstallationRow[]) => void;
  onAddAllWalletInstalls: (rows: MintableInstallationRow[]) => void;
  minting?: boolean;
}

function tipPosition(rect: DOMRect): { top: number; left: number; place: 'above' | 'below' } {
  const gap = 14;
  let place: 'above' | 'below' = 'above';
  let top = rect.top - gap - TIP_EST_HEIGHT;
  if (top < 10) {
    place = 'below';
    top = rect.bottom + gap;
  }
  let left = rect.left + rect.width / 2 - TIP_WIDTH / 2;
  if (rect.right > window.innerWidth * 0.62) {
    left = rect.right - TIP_WIDTH;
  }
  left = Math.min(window.innerWidth - TIP_WIDTH - 12, Math.max(12, left));
  return { top, left, place };
}

export const PaarcelMintGallery = ({
  cartParcelKeys,
  cartInstallKeys,
  onAddParcel,
  onAddInstallation,
  onAddAllParcelInstalls,
  onAddAllWalletInstalls,
  minting = false,
}: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const [{ ownedParcels, inventory, parcelInventory, installationInventory }] = useUser();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('parcels');
  const [hoverTip, setHoverTip] = useState<HoverTip | null>(null);

  const parcelRows = useMemo(
    () => listMintablePaarcelsFromOwned(ownedParcels, parcelInventory),
    [ownedParcels, parcelInventory],
  );
  const unmintedParcels = useMemo(() => parcelRows.filter((r) => !r.alreadyMinted), [parcelRows]);
  const parcelInstallRows = useMemo(
    () => listMintableInstallationsOnParcels(parcelRows, parcelInventory, installationInventory),
    [parcelRows, parcelInventory, installationInventory],
  );
  const walletInstallRows = useMemo(
    () => listMintableWalletInstallations(inventory, parcelInventory, installationInventory),
    [inventory, parcelInventory, installationInventory],
  );
  const unmintedParcelInstalls = useMemo(
    () => parcelInstallRows.filter((r) => !r.alreadyMinted && !cartInstallKeys.has(r.key)),
    [parcelInstallRows, cartInstallKeys],
  );
  const unmintedWalletInstalls = useMemo(
    () => walletInstallRows.filter((r) => !r.alreadyMinted && !cartInstallKeys.has(r.key)),
    [walletInstallRows, cartInstallKeys],
  );

  const installTone = useMemo(() => installationCommonCssVars() as CSSProperties, []);

  useEffect(() => {
    try {
      const savedView = localStorage.getItem(VIEW_STORAGE_KEY);
      if (savedView === 'list' || savedView === 'grid') setViewMode(savedView);
      const savedTab = localStorage.getItem(TAB_STORAGE_KEY);
      if (savedTab === 'parcels' || savedTab === 'installations') setCatalogTab(savedTab);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setHoverTip(null);
  }, [catalogTab, viewMode]);

  useEffect(() => {
    if (!hoverTip) return;
    // Only clear on window resize — capture-phase scroll listeners fire on
    // overflow containers during layout and kill the tip immediately.
    const hide = () => setHoverTip(null);
    window.addEventListener('resize', hide);
    return () => window.removeEventListener('resize', hide);
  }, [hoverTip]);

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

  const setTab = (tab: CatalogTab) => {
    if (tab === catalogTab) return;
    click();
    setCatalogTab(tab);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      /* ignore */
    }
  };

  const openParcelTip = (row: MintablePaarcelRow, el: HTMLElement, status: string) => {
    const pos = tipPosition(el.getBoundingClientRect());
    setHoverTip({
      key: row.key,
      name: row.parcelId,
      sub: `#${row.realmTokenId} · ${row.size}${row.district != null ? ` · District ${row.district}` : ''}`,
      extra: `${row.installations.length} nested installation${row.installations.length === 1 ? '' : 's'}`,
      price: status === 'Available to mint' ? 'FREE' : `FREE · ${status}`,
      priceFree: true,
      ...pos,
    });
  };

  const openInstallTip = (row: MintableInstallationRow, el: HTMLElement, status: string) => {
    const pos = tipPosition(el.getBoundingClientRect());
    const source =
      row.source === 'parcel-equip' && row.sourceRealmTokenId
        ? `On parcel #${row.sourceRealmTokenId}`
        : 'Wallet inventory';
    setHoverTip({
      key: row.key,
      name: row.name,
      sub: `#${row.itemTypeId} · ${row.kind} · ${source}`,
      price: status,
      priceFree: status === 'FREE' || status.startsWith('FREE'),
      ...pos,
    });
  };

  const addParcel = (row: MintablePaarcelRow) => {
    if (minting || row.alreadyMinted || cartParcelKeys.has(row.key)) return;
    click();
    onAddParcel(row);
  };

  const addInstall = (row: MintableInstallationRow) => {
    if (minting || row.alreadyMinted || cartInstallKeys.has(row.key)) return;
    click();
    onAddInstallation(row);
  };

  const renderParcel = (row: MintablePaarcelRow) => {
    const inCart = cartParcelKeys.has(row.key);
    const disabled = minting || inCart;
    const status = inCart ? 'In cart' : 'Available to mint';
    const toneStyle = paarcelSizeCssVars(row.size) as CSSProperties;
    const thumbSize = viewMode === 'grid' ? 72 : 56;
    const sizeClass = String(row.size || 'humble').toLowerCase().replace(/\s+/g, '-');
    return (
      <button
        key={row.key}
        type="button"
        className={`cpaarcel-grid-tile size-${sizeClass}${inCart ? ' checked' : ''}`}
        style={toneStyle}
        aria-disabled={disabled || undefined}
        onClick={() => {
          if (disabled) return;
          addParcel(row);
        }}
        onPointerEnter={(e) => openParcelTip(row, e.currentTarget, status)}
        onPointerLeave={() => setHoverTip((t) => (t?.key === row.key ? null : t))}
        onFocus={(e) => openParcelTip(row, e.currentTarget, status)}
        onBlur={() => setHoverTip((t) => (t?.key === row.key ? null : t))}
        aria-label={`${row.parcelId} · #${row.realmTokenId} · ${row.size} · ${row.installations.length} installs · ${status}`}
        title=""
      >
        <span className={`cpaarcel-grid-check${inCart ? ' on' : ''}`} aria-hidden />
        <PaarcelThumbnail
          realmTokenId={row.realmTokenId}
          name={row.parcelId}
          size={thumbSize}
          parcelSize={row.size}
        />
      </button>
    );
  };

  const renderInstall = (row: MintableInstallationRow) => {
    const inCart = cartInstallKeys.has(row.key);
    const disabled = minting || inCart || row.alreadyMinted;
    const status = row.alreadyMinted ? 'Minted' : inCart ? 'In cart' : 'FREE';
    const thumbSize = viewMode === 'grid' ? 72 : 56;
    return (
      <button
        key={row.key}
        type="button"
        className={`cpaarcel-grid-tile install${inCart ? ' checked' : ''}${
          row.alreadyMinted ? ' minted' : ''
        }`}
        style={installTone}
        aria-disabled={disabled || undefined}
        onClick={() => {
          if (disabled) return;
          addInstall(row);
        }}
        onPointerEnter={(e) => openInstallTip(row, e.currentTarget, status)}
        onPointerLeave={() => setHoverTip((t) => (t?.key === row.key ? null : t))}
        onFocus={(e) => openInstallTip(row, e.currentTarget, status)}
        onBlur={() => setHoverTip((t) => (t?.key === row.key ? null : t))}
        aria-label={`${row.name} · #${row.itemTypeId} · ${status}`}
        title=""
      >
        <span className={`cpaarcel-grid-check${inCart ? ' on' : ''}`} aria-hidden />
        <InstallationThumbnail
          itemTypeId={row.itemTypeId}
          kind={row.kind}
          name={row.name}
          size={thumbSize}
          tinted
        />
      </button>
    );
  };

  return (
    <>
      <div className="paarcel-mint-gallery">
        <h2 className="gallery-title">
          <span className="title-lead">Mint</span> <SoftCText>cPaarcels</SoftCText>
        </h2>
        <p className="gallery-caption">
          Owned Base parcels only · nested installs snapshot ·{' '}
          <span className="price-tag free">FREE</span>{' '}
          <span className="price-note">(sim)</span>
        </p>

        <div className="toolbar catalog-tabs" role="tablist" aria-label="Catalog">
          <button
            type="button"
            role="tab"
            className={`tab-btn ${catalogTab === 'parcels' ? 'active' : ''}`}
            aria-selected={catalogTab === 'parcels'}
            onClick={() => setTab('parcels')}
          >
            Parcels ({unmintedParcels.length})
          </button>
          <button
            type="button"
            role="tab"
            className={`tab-btn ${catalogTab === 'installations' ? 'active' : ''}`}
            aria-selected={catalogTab === 'installations'}
            onClick={() => setTab('installations')}
          >
            Installations ({unmintedWalletInstalls.length + unmintedParcelInstalls.length})
          </button>
        </div>

        <div className="toolbar">
          <span className="count">
            {cartParcelKeys.size + cartInstallKeys.size} in cart
            {catalogTab === 'parcels'
              ? ` · ${unmintedParcels.length} parcels`
              : ` · ${unmintedWalletInstalls.length} wallet · ${unmintedParcelInstalls.length} on parcels`}
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

        {catalogTab === 'parcels' ? (
          <>
            <div className="mint-cta">
              <Button
                size={2}
                fullWidth
                disabled={minting || unmintedParcels.filter((r) => !cartParcelKeys.has(r.key)).length === 0}
                onClick={() => {
                  const toAdd = unmintedParcels.filter((r) => !cartParcelKeys.has(r.key));
                  if (minting || toAdd.length === 0) return;
                  click();
                  for (const row of toAdd) onAddParcel(row);
                }}
              >
                Add all parcels to cart (
                {unmintedParcels.filter((r) => !cartParcelKeys.has(r.key)).length})
              </Button>
            </div>
            <div className="section-label">Owned parcels</div>
            <div className={`tile-list scrollable ${viewMode}`}>
              {unmintedParcels.length === 0 ? (
                <p className="empty">No owned Base parcels left to mint.</p>
              ) : (
                unmintedParcels.map(renderParcel)
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mint-cta">
              <Button
                size={2}
                fullWidth
                disabled={minting || unmintedParcelInstalls.length === 0}
                onClick={() => {
                  if (minting || unmintedParcelInstalls.length === 0) return;
                  click();
                  onAddAllParcelInstalls(unmintedParcelInstalls);
                }}
              >
                Mint all installations on parcels ({unmintedParcelInstalls.length})
              </Button>
              <Button
                size={2}
                fullWidth
                secondary
                disabled={minting || unmintedWalletInstalls.length === 0}
                onClick={() => {
                  if (minting || unmintedWalletInstalls.length === 0) return;
                  click();
                  onAddAllWalletInstalls(unmintedWalletInstalls);
                }}
              >
                Mint wallet installations ({unmintedWalletInstalls.length})
              </Button>
            </div>
            <div className="section-label">Wallet installations</div>
            <div className={`tile-list scrollable ${viewMode}`}>
              {walletInstallRows.length === 0 ? (
                <p className="empty">No wallet installations to mint.</p>
              ) : (
                walletInstallRows.map(renderInstall)
              )}
            </div>
            {unmintedParcelInstalls.length > 0 ? (
              <>
                <div className="section-label">On parcels</div>
                <div className={`tile-list scrollable ${viewMode}`}>
                  {unmintedParcelInstalls.map(renderInstall)}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>

      {hoverTip ? (
        <Portal target="#portal-tooltip">
          <div
            className={`cpaarcel-tip place-${hoverTip.place}`}
            role="tooltip"
            style={{
              position: 'fixed',
              top: hoverTip.top,
              left: hoverTip.left,
              width: TIP_WIDTH,
              zIndex: 50000,
              pointerEvents: 'none',
            }}
          >
            <span className="tip-name">{hoverTip.name}</span>
            <span className="tip-sub">{hoverTip.sub}</span>
            {hoverTip.extra ? <span className="tip-sub">{hoverTip.extra}</span> : null}
            <span className={`tip-price ${hoverTip.priceFree ? 'free' : ''}`}>{hoverTip.price}</span>
          </div>
        </Portal>
      ) : null}

      <style jsx>{styles}</style>
      <style jsx global>{`
        .cpaarcel-grid-tile {
          appearance: none;
          -webkit-appearance: none;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          aspect-ratio: 1 / 1;
          min-height: 9.5rem;
          margin: 0;
          padding: 1rem;
          border: 0.25rem solid var(--rarity-border, #3b9eff);
          border-radius: 0.55rem;
          background: linear-gradient(
            160deg,
            color-mix(in srgb, var(--rarity-glow, #3b9eff) 28%, transparent),
            rgba(20, 8, 40, 0.95)
          );
          box-shadow: inset 0 0 14px 2px color-mix(in srgb, var(--rarity-border, #3b9eff) 40%, transparent);
          color: #fff;
          cursor: pointer;
          overflow: hidden;
          font: inherit;
          box-sizing: border-box;
        }
        .cpaarcel-grid-tile:hover,
        .cpaarcel-grid-tile.checked {
          box-shadow:
            0 0 10px var(--rarity-glow, #ffe600),
            0 0 6px var(--rarity-border, #3b9eff),
            inset 0 0 14px 2px color-mix(in srgb, var(--rarity-border, #3b9eff) 45%, transparent);
          z-index: 2;
        }
        .cpaarcel-grid-tile.checked {
          border-color: var(--rarity-glow, #ffd6f7);
          background: linear-gradient(
            160deg,
            color-mix(in srgb, var(--rarity-border, #3b9eff) 40%, transparent),
            color-mix(in srgb, var(--rarity-bg, #1a4a80) 55%, #140828)
          );
        }
        .cpaarcel-grid-tile.minted,
        .cpaarcel-grid-tile[aria-disabled='true'] {
          opacity: 0.55;
          cursor: default;
        }
        .cpaarcel-grid-check {
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
        .cpaarcel-grid-check.on {
          background: var(--rarity-border, #5c25bf);
          border-color: var(--rarity-glow, #ffd6f7);
          box-shadow: 0 0 6px var(--rarity-glow, #5c25bf);
        }
        #portal-tooltip .cpaarcel-tip {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.15rem;
          padding: 0.75rem 1rem 0.85rem;
          border-radius: 1.4rem;
          border: 0.28rem solid #3b7ea3;
          background: repeating-linear-gradient(
            180deg,
            #d7fbff 0,
            #d7fbff 0.2rem,
            #c6f3f8 0.2rem,
            #c6f3f8 0.4rem
          );
          box-shadow: 0.35rem 0.35rem 0 rgba(20, 40, 70, 0.28);
          color: #2f3640;
          font-family: Pixelar, 'Courier New', monospace;
          text-align: center;
        }
        #portal-tooltip .cpaarcel-tip::after {
          content: '';
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 0.85rem solid transparent;
          border-right: 0.85rem solid transparent;
        }
        #portal-tooltip .cpaarcel-tip::before {
          content: '';
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 0.6rem solid transparent;
          border-right: 0.6rem solid transparent;
          z-index: 1;
        }
        #portal-tooltip .cpaarcel-tip.place-above::after {
          bottom: -1.05rem;
          border-top: 1.05rem solid #3b7ea3;
        }
        #portal-tooltip .cpaarcel-tip.place-above::before {
          bottom: -0.7rem;
          border-top: 0.75rem solid #d7fbff;
        }
        #portal-tooltip .cpaarcel-tip.place-below::after {
          top: -1.05rem;
          border-bottom: 1.05rem solid #3b7ea3;
        }
        #portal-tooltip .cpaarcel-tip.place-below::before {
          top: -0.7rem;
          border-bottom: 0.75rem solid #d7fbff;
        }
        #portal-tooltip .cpaarcel-tip .tip-name {
          font-size: 1.7rem;
          line-height: 1.15;
          color: #2a313a;
        }
        #portal-tooltip .cpaarcel-tip .tip-sub {
          font-size: 1.25rem;
          line-height: 1.25;
          color: #3d4a57;
          text-transform: capitalize;
        }
        #portal-tooltip .cpaarcel-tip .tip-price {
          font-size: 1.35rem;
          line-height: 1.2;
          color: #1f6f8c;
          margin-top: 0.1rem;
        }
        #portal-tooltip .cpaarcel-tip .tip-price.free {
          color: #1a7a4a;
        }
      `}</style>
    </>
  );
};
