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
  onMintSelected: (rows: MintableWearableRow[]) => void | Promise<void>;
  onMintAll: (rows: MintableWearableRow[]) => void | Promise<void>;
  minting?: boolean;
  mintError?: string | null;
}

export const WearableMintGallery = ({
  onMintSelected,
  onMintAll,
  minting = false,
  mintError = null,
}: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const [{ userAavegotchis, cartridgeHeroes, wearableInventory }] = useUser();

  const boundIds = useMemo(() => mintedSourceTokenIds(cartridgeHeroes), [cartridgeHeroes]);
  const rows = useMemo(
    () => listMintableWearablesFromBoundGotchis(userAavegotchis, boundIds, wearableInventory),
    [userAavegotchis, boundIds, wearableInventory],
  );
  const unminted = useMemo(() => rows.filter((r) => !r.alreadyMinted), [rows]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === 'list' || saved === 'grid') setViewMode(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const row of unminted) {
      next[row.key] = true;
    }
    setSelected(next);
  }, [unminted]);

  const selectedRows = unminted.filter((r) => selected[r.key]);
  const totalUsd = selectedRows.reduce((sum, r) => sum + (r.importFeeUsd || 0), 0);
  const rentalSelected = selectedRows.filter((r) => r.bindKind === 'rental').length;
  const allSelected = unminted.length > 0 && selectedRows.length === unminted.length;

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

  const toggle = (row: MintableWearableRow) => {
    if (minting || row.alreadyMinted) return;
    click();
    setSelected((prev) => ({ ...prev, [row.key]: !prev[row.key] }));
  };

  const toggleAll = () => {
    if (minting || unminted.length === 0) return;
    click();
    const next: Record<string, boolean> = {};
    for (const row of unminted) {
      next[row.key] = !allSelected;
    }
    setSelected(next);
  };

  const handleMintSelected = () => {
    if (minting || selectedRows.length === 0) return;
    click();
    void onMintSelected(selectedRows);
  };

  const handleMintAll = () => {
    if (minting || unminted.length === 0) return;
    click();
    void onMintAll(unminted);
  };

  const mintAllUsd = unminted.reduce((sum, r) => sum + (r.importFeeUsd || 0), 0);

  const renderRow = (row: MintableWearableRow) => {
    const checked = row.alreadyMinted ? true : Boolean(selected[row.key]);
    if (viewMode === 'grid') {
      return (
        <button
          key={row.key}
          type="button"
          className={`wearable-card ${checked ? 'checked' : ''} ${row.alreadyMinted ? 'minted' : ''}`}
          disabled={minting || row.alreadyMinted}
          onClick={() => toggle(row)}
        >
          <span className={`check-dot ${checked ? 'on' : ''}`} aria-hidden />
          <WearableThumbnail itemTypeId={row.itemTypeId} name={row.name} size={64} />
          <span className="wearable-name">{row.name}</span>
          <span className="wearable-sub">
            #{row.sourceTokenId} · {slotLabel(row.slotIndex)}
          </span>
          <span className="wearable-sub">
            {row.rarity}
            {row.bindKind === 'rental' ? ' · borrowed' : ' · owned'}
          </span>
          <span
            className={`wearable-price ${row.alreadyMinted || row.importFeeUsd <= 0 ? 'free' : ''}`}
          >
            {row.alreadyMinted ? 'Minted' : row.importFeeUsd <= 0 ? 'FREE' : `$${row.importFeeUsd}`}
          </span>
        </button>
      );
    }

    return (
      <label
        key={row.key}
        className={`wearable-row ${checked ? 'checked' : ''} ${row.alreadyMinted ? 'minted' : ''}`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={minting || row.alreadyMinted}
          onChange={() => toggle(row)}
        />
        <WearableThumbnail itemTypeId={row.itemTypeId} name={row.name} size={44} />
        <div className="wearable-meta">
          <span className="wearable-name">{row.name}</span>
          <span className="wearable-sub">
            #{row.sourceTokenId} · {slotLabel(row.slotIndex)} · {row.rarity}
            {row.bindKind === 'rental' ? ' · borrowed' : ' · owned'}
          </span>
        </div>
        <span className={`wearable-price ${row.alreadyMinted || row.importFeeUsd <= 0 ? 'free' : ''}`}>
          {row.alreadyMinted ? 'Minted' : row.importFeeUsd <= 0 ? 'FREE' : `$${row.importFeeUsd}`}
        </span>
      </label>
    );
  };

  return (
    <>
      <div className="wearable-mint-gallery">
        <h2 className="gallery-title">Mint cWearables</h2>
        <p className="gallery-caption">
          From bound wallet gotchis. Owned = <span className="price-tag free">FREE</span>
          {' · '}
          borrowed = reduced rarity fees <span className="price-note">(sim)</span>. Same wearable from
          different gotchis stacks (x2). Equip on Aarcade.
        </p>

        <div className="mint-cta mint-cta-top">
          <Button size={2.4} fullWidth onClick={handleMintAll} disabled={unminted.length === 0 || minting}>
            {minting
              ? 'Minting…'
              : unminted.length === 0
                ? 'All Available Minted'
                : mintAllUsd > 0
                  ? `Mint All (${unminted.length}) · $${mintAllUsd} (sim)`
                  : `Mint All (${unminted.length}) · FREE`}
          </Button>
          <Button
            size={2.4}
            fullWidth
            onClick={handleMintSelected}
            disabled={selectedRows.length === 0 || minting}
          >
            {minting
              ? 'Minting…'
              : selectedRows.length === 0
                ? 'Select wearables to mint'
                : totalUsd > 0
                  ? `Mint Selected (${selectedRows.length}) · $${totalUsd} (sim)`
                  : `Mint Selected (${selectedRows.length}) · FREE`}
          </Button>
          {rentalSelected > 0 && totalUsd > 0 ? (
            <p className="cost-line">
              Borrowed/rental in selection: {rentalSelected} · total{' '}
              <span className="price-tag">${totalUsd}</span> <span className="price-note">(sim)</span>
            </p>
          ) : null}
          <p className="mint-hint">Bind wallet gotchis under Manage first — only their equipped gear can mint.</p>
          {mintError ? <p className="mint-error">{mintError}</p> : null}
        </div>

        <div className="toolbar">
          <button type="button" className="linkish" onClick={toggleAll} disabled={unminted.length === 0 || minting}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <div className="toolbar-right">
            <span className="count">
              {selectedRows.length}/{unminted.length} unminted · {rows.length} total
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
