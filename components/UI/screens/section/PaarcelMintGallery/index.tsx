import { useEffect, useMemo, useState } from 'react';
import styles from './styles';
import { Button } from 'components/UI/elements';
import { SoftCText } from 'components/UI/widgets';
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
const VIEW_STORAGE_KEY = 'cpaarcelsMintView';

interface Props {
  cartParcelKeys: Set<string>;
  cartInstallKeys: Set<string>;
  onAddParcel: (row: MintablePaarcelRow) => void;
  onAddInstallation: (row: MintableInstallationRow) => void;
  onAddAllParcelInstalls: (rows: MintableInstallationRow[]) => void;
  onAddAllWalletInstalls: (rows: MintableInstallationRow[]) => void;
  minting?: boolean;
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
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedParcel, setSelectedParcel] = useState<MintablePaarcelRow | null>(null);

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
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === 'list' || saved === 'grid') setViewMode(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // Keep selection in sync with mintable list (drop if already minted / gone).
  useEffect(() => {
    if (unmintedParcels.length === 0) {
      if (selectedParcel) setSelectedParcel(null);
      return;
    }
    const key = selectedParcel?.key;
    const still = key ? unmintedParcels.find((r) => r.key === key) : null;
    if (!still) setSelectedParcel(unmintedParcels[0]);
  }, [unmintedParcels, selectedParcel?.key]);

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

  const addParcel = (row: MintablePaarcelRow) => {
    if (minting || row.alreadyMinted || cartParcelKeys.has(row.key)) return;
    click();
    setSelectedParcel(row);
    onAddParcel(row);
  };

  const addInstall = (row: MintableInstallationRow) => {
    if (minting || row.alreadyMinted || cartInstallKeys.has(row.key)) return;
    click();
    onAddInstallation(row);
  };

  const renderParcel = (row: MintablePaarcelRow) => {
    const inCart = cartParcelKeys.has(row.key);
    const selected = selectedParcel?.key === row.key;
    const disabled = minting || inCart;
    if (viewMode === 'grid') {
      return (
        <button
          key={row.key}
          type="button"
          className={`parcel-tile${inCart ? ' in-cart' : ''}${selected ? ' selected' : ''}`}
          disabled={disabled}
          onClick={() => addParcel(row)}
          onMouseEnter={() => setSelectedParcel(row)}
          aria-label={`${row.parcelId} · #${row.realmTokenId}`}
        >
          <span className="tile-icon" aria-hidden>
            ▣
          </span>
          <span className="tile-name">{row.parcelId}</span>
          <span className="tile-meta">
            {row.size}
            {row.district != null ? ` · D${row.district}` : ''}
          </span>
          <span className="tile-count">{row.installations.length} installs</span>
          <span className="price-tag free">{inCart ? 'In cart' : 'FREE'}</span>
        </button>
      );
    }
    return (
      <button
        key={row.key}
        type="button"
        className={`parcel-row${inCart ? ' in-cart' : ''}${selected ? ' selected' : ''}`}
        disabled={disabled}
        onClick={() => addParcel(row)}
        onMouseEnter={() => setSelectedParcel(row)}
      >
        <div className="parcel-main">
          <span className="parcel-name">{row.parcelId}</span>
          <span className="parcel-meta">
            #{row.realmTokenId} · {row.size}
            {row.district != null ? ` · D${row.district}` : ''}
          </span>
        </div>
        <div className="parcel-side">
          <span className="install-count">{row.installations.length} installs</span>
          <span className="price-tag free">{inCart ? 'In cart' : 'FREE'}</span>
        </div>
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
          aria-label={row.name}
        >
          <span className="tile-icon install" aria-hidden>
            ◇
          </span>
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

        <div className="toolbar">
          <span className="count">
            {cartParcelKeys.size + cartInstallKeys.size} in cart · {unmintedParcels.length} parcels ·{' '}
            {unmintedWalletInstalls.length} wallet installs
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

        <div className="section-label">Owned parcels</div>
        {selectedParcel ? (
          <div className="parcel-detail">
            <span className="parcel-detail-icon" aria-hidden>
              ▣
            </span>
            <div className="parcel-detail-main">
              <span className="parcel-detail-name">{selectedParcel.parcelId}</span>
              <span className="parcel-detail-meta">
                #{selectedParcel.realmTokenId} · {selectedParcel.size}
                {selectedParcel.district != null ? ` · District ${selectedParcel.district}` : ''}
                {' · '}
                {selectedParcel.installations.length} nested installation
                {selectedParcel.installations.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        ) : null}
        <div className={`parcel-list scrollable ${viewMode}`}>
          {unmintedParcels.length === 0 ? (
            <p className="empty">No owned Base parcels left to mint.</p>
          ) : (
            unmintedParcels.map(renderParcel)
          )}
        </div>

        {walletInstallRows.length > 0 ? (
          <>
            <div className="section-label">Wallet installations</div>
            <div className={`install-list scrollable ${viewMode}`}>
              {walletInstallRows.slice(0, 40).map(renderInstall)}
            </div>
          </>
        ) : null}
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
