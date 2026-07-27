import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './styles';
import { Button } from 'components/UI/elements';
import { InstallationThumbnail, PaarcelThumbnail, SoftCText } from 'components/UI/widgets';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useUser } from 'contexts/UserContext';
import {
  listMintableInstallationsOnParcels,
  listMintablePaarcelsFromOwned,
  listMintableWalletInstallations,
  type MintableInstallationRow,
  type MintablePaarcelRow,
} from 'helpers/cartridgePaarcel.helper';

type ViewMode = 'list' | 'grid';
type CatalogTab = 'parcels' | 'installations';
const VIEW_STORAGE_KEY = 'cpaarcelsMintView';
const TAB_STORAGE_KEY = 'cpaarcelsMintTab';
const TIP_WIDTH = 240;
const TIP_EST_HEIGHT = 130;

type ParcelTip = {
  key: string;
  parcelId: string;
  realmTokenId: string;
  size: string;
  district?: number;
  installs: number;
  status: string;
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
  const [selectedParcelKey, setSelectedParcelKey] = useState<string | null>(null);
  const [parcelTip, setParcelTip] = useState<ParcelTip | null>(null);
  const [portalReady, setPortalReady] = useState(false);

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

  useEffect(() => {
    setPortalReady(true);
  }, []);

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
    if (catalogTab !== 'parcels') setParcelTip(null);
  }, [catalogTab]);

  useEffect(() => {
    if (!parcelTip) return;
    const hide = () => setParcelTip(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [parcelTip]);

  useEffect(() => {
    if (unmintedParcels.length === 0) {
      setSelectedParcelKey(null);
      return;
    }
    if (!selectedParcelKey || !unmintedParcels.some((r) => r.key === selectedParcelKey)) {
      setSelectedParcelKey(unmintedParcels[0].key);
    }
  }, [unmintedParcels, selectedParcelKey]);

  const setView = (mode: ViewMode) => {
    if (mode === viewMode) return;
    click();
    setViewMode(mode);
    setParcelTip(null);
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
    setParcelTip(null);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      /* ignore */
    }
  };

  const openParcelTip = (row: MintablePaarcelRow, el: HTMLElement) => {
    const inCart = cartParcelKeys.has(row.key);
    const pos = tipPosition(el.getBoundingClientRect());
    setSelectedParcelKey(row.key);
    setParcelTip({
      key: row.key,
      parcelId: row.parcelId,
      realmTokenId: row.realmTokenId,
      size: row.size,
      district: row.district,
      installs: row.installations.length,
      status: inCart ? 'In cart' : 'Available to mint',
      priceFree: true,
      ...pos,
    });
  };

  const addParcel = (row: MintablePaarcelRow) => {
    if (minting || row.alreadyMinted || cartParcelKeys.has(row.key)) return;
    click();
    setSelectedParcelKey(row.key);
    onAddParcel(row);
  };

  const addInstall = (row: MintableInstallationRow) => {
    if (minting || row.alreadyMinted || cartInstallKeys.has(row.key)) return;
    click();
    onAddInstallation(row);
  };

  const renderParcel = (row: MintablePaarcelRow) => {
    const inCart = cartParcelKeys.has(row.key);
    const selected = selectedParcelKey === row.key;
    const disabled = minting || inCart;
    const thumbSize = viewMode === 'grid' ? 88 : 64;
    return (
      <button
        key={row.key}
        type="button"
        className={`parcel-card ${viewMode}${inCart ? ' in-cart' : ''}${selected ? ' selected' : ''}`}
        disabled={disabled}
        onClick={() => addParcel(row)}
        onMouseEnter={(e) => openParcelTip(row, e.currentTarget)}
        onMouseLeave={() => setParcelTip((t) => (t?.key === row.key ? null : t))}
        onFocus={(e) => openParcelTip(row, e.currentTarget)}
        onBlur={() => setParcelTip((t) => (t?.key === row.key ? null : t))}
        aria-label={`${row.parcelId} · #${row.realmTokenId} · ${row.installations.length} installs`}
      >
        <PaarcelThumbnail realmTokenId={row.realmTokenId} name={row.parcelId} size={thumbSize} />
        {inCart ? <span className="card-check" aria-hidden /> : null}
      </button>
    );
  };

  const renderInstall = (row: MintableInstallationRow) => {
    const inCart = cartInstallKeys.has(row.key);
    const disabled = minting || inCart || row.alreadyMinted;
    const status = row.alreadyMinted ? 'Minted' : inCart ? 'In cart' : 'FREE';
    if (viewMode === 'grid') {
      return (
        <button
          key={row.key}
          type="button"
          className={`install-tile${inCart || row.alreadyMinted ? ' in-cart' : ''}`}
          disabled={disabled}
          onClick={() => addInstall(row)}
          aria-label={`${row.name} · ${status}`}
          title={`${row.name} · ${status}`}
        >
          <InstallationThumbnail itemTypeId={row.itemTypeId} kind={row.kind} name={row.name} size={64} />
          <span className="tile-name">{row.name}</span>
          <span className="price-tag free">{status}</span>
        </button>
      );
    }
    return (
      <button
        key={row.key}
        type="button"
        className={`install-row${inCart || row.alreadyMinted ? ' in-cart' : ''}`}
        disabled={disabled}
        onClick={() => addInstall(row)}
      >
        <InstallationThumbnail itemTypeId={row.itemTypeId} kind={row.kind} name={row.name} size={44} />
        <span className="install-name">{row.name}</span>
        <span className="price-tag free">{status}</span>
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
            <div className={`parcel-list scrollable ${viewMode}`}>
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
            <div className={`install-list scrollable ${viewMode}`}>
              {walletInstallRows.length === 0 ? (
                <p className="empty">No wallet installations to mint.</p>
              ) : (
                walletInstallRows.map(renderInstall)
              )}
            </div>
            {unmintedParcelInstalls.length > 0 ? (
              <>
                <div className="section-label">On parcels</div>
                <div className={`install-list scrollable ${viewMode}`}>
                  {unmintedParcelInstalls.map(renderInstall)}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>

      {portalReady &&
        parcelTip &&
        createPortal(
          <div
            className={`cpaarcel-tip place-${parcelTip.place}`}
            role="tooltip"
            style={{ top: parcelTip.top, left: parcelTip.left, width: TIP_WIDTH }}
          >
            <span className="tip-name">{parcelTip.parcelId}</span>
            <span className="tip-sub">
              #{parcelTip.realmTokenId} · {parcelTip.size}
              {parcelTip.district != null ? ` · District ${parcelTip.district}` : ''}
            </span>
            <span className="tip-sub">
              {parcelTip.installs} nested installation{parcelTip.installs === 1 ? '' : 's'}
            </span>
            <span className={`tip-price ${parcelTip.priceFree ? 'free' : ''}`}>
              FREE
              {parcelTip.status !== 'Available to mint' ? ` · ${parcelTip.status}` : ''}
            </span>
          </div>,
          document.body,
        )}

      <style jsx>{styles}</style>
      <style jsx global>{`
        .cpaarcel-tip {
          position: fixed;
          z-index: 10050;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.15rem;
          padding: 0.75rem 1rem 0.85rem;
          border-radius: 1.4rem;
          border: 0.28rem solid #2f8f82;
          background: repeating-linear-gradient(
            180deg,
            #d7fff6 0,
            #d7fff6 0.2rem,
            #c4f5ea 0.2rem,
            #c4f5ea 0.4rem
          );
          box-shadow: 0.35rem 0.35rem 0 rgba(20, 40, 70, 0.28);
          color: #2f3640;
          font-family: Pixelar, 'Courier New', monospace;
          text-align: center;
        }
        .cpaarcel-tip::after {
          content: '';
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 0.85rem solid transparent;
          border-right: 0.85rem solid transparent;
        }
        .cpaarcel-tip::before {
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
        .cpaarcel-tip.place-above::after {
          bottom: -1.05rem;
          border-top: 1.05rem solid #2f8f82;
        }
        .cpaarcel-tip.place-above::before {
          bottom: -0.7rem;
          border-top: 0.75rem solid #d7fff6;
        }
        .cpaarcel-tip.place-below::after {
          top: -1.05rem;
          border-bottom: 1.05rem solid #2f8f82;
        }
        .cpaarcel-tip.place-below::before {
          top: -0.7rem;
          border-bottom: 0.75rem solid #d7fff6;
        }
        .cpaarcel-tip .tip-name {
          font-size: 1.7rem;
          line-height: 1.15;
          color: #2a313a;
        }
        .cpaarcel-tip .tip-sub {
          font-size: 1.25rem;
          line-height: 1.25;
          color: #3d4a57;
          text-transform: capitalize;
        }
        .cpaarcel-tip .tip-price {
          font-size: 1.35rem;
          line-height: 1.2;
          color: #1f6f8c;
          margin-top: 0.1rem;
        }
        .cpaarcel-tip .tip-price.free {
          color: #1a7a4a;
        }
      `}</style>
    </>
  );
};
