import { useEffect, useMemo, useState } from 'react';
import styles from './styles';
import { Button } from 'components/UI/elements';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import type { GotchiverseAavegotchi } from 'types';
import {
  listEquippedWearableSlots,
  slotLabel,
  type EquippedWearableSlot,
} from 'helpers/cartridgeWearable.helper';

interface Props {
  sourceGotchi: GotchiverseAavegotchi;
  bindKind: 'owned' | 'rental';
  onImport: (items: { itemTypeId: number; slotIndex: number }[]) => void | Promise<void>;
  onSkip?: () => void;
  importing?: boolean;
  importError?: string | null;
}

export const WearableImportPanel = ({
  sourceGotchi,
  bindKind,
  onImport,
  onSkip,
  importing = false,
  importError = null,
}: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const slots = useMemo(
    () => listEquippedWearableSlots(sourceGotchi, bindKind),
    [sourceGotchi, bindKind],
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const slot of slots) {
      next[`${slot.slotIndex}:${slot.itemTypeId}`] = true;
    }
    setSelected(next);
  }, [slots]);

  const selectedSlots = slots.filter((s) => selected[`${s.slotIndex}:${s.itemTypeId}`]);
  const totalUsd = selectedSlots.reduce((sum, s) => sum + (s.importFeeUsd || 0), 0);
  const allSelected = slots.length > 0 && selectedSlots.length === slots.length;

  const toggle = (slot: EquippedWearableSlot) => {
    if (importing) return;
    click();
    const key = `${slot.slotIndex}:${slot.itemTypeId}`;
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    if (importing || slots.length === 0) return;
    click();
    const next: Record<string, boolean> = {};
    for (const slot of slots) {
      next[`${slot.slotIndex}:${slot.itemTypeId}`] = !allSelected;
    }
    setSelected(next);
  };

  const handleImport = () => {
    if (importing || selectedSlots.length === 0) return;
    click();
    void onImport(selectedSlots.map((s) => ({ itemTypeId: s.itemTypeId, slotIndex: s.slotIndex })));
  };

  return (
    <>
      <div className="wearable-import-panel">
        <h2 className="panel-title">Mint cWearables</h2>
        <p className="panel-caption">
          From #{sourceGotchi.id}
          {bindKind === 'owned' ? (
            <>
              {' '}
              — owned imports are <span className="price-tag free">FREE</span>
            </>
          ) : (
            <>
              {' '}
              — borrowed uses reduced rarity fees <span className="price-note">(sim)</span>
            </>
          )}
        </p>

        <div className="toolbar">
          <button type="button" className="linkish" onClick={toggleAll} disabled={slots.length === 0 || importing}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <span className="count">
            {selectedSlots.length}/{slots.length} selected
          </span>
        </div>

        <div className="wearable-list scrollable">
          {slots.length === 0 ? (
            <p className="empty">No equipped wearables on this gotchi.</p>
          ) : (
            slots.map((slot) => {
              const key = `${slot.slotIndex}:${slot.itemTypeId}`;
              const checked = Boolean(selected[key]);
              return (
                <label key={key} className={`wearable-row ${checked ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={importing}
                    onChange={() => toggle(slot)}
                  />
                  <div className="wearable-meta">
                    <span className="wearable-name">{slot.name}</span>
                    <span className="wearable-sub">
                      {slotLabel(slot.slotIndex)} · {slot.rarity}
                    </span>
                  </div>
                  <span className={`wearable-price ${slot.importFeeUsd <= 0 ? 'free' : ''}`}>
                    {slot.importFeeUsd <= 0 ? 'FREE' : `$${slot.importFeeUsd}`}
                  </span>
                </label>
              );
            })
          )}
        </div>

        <div className="mint-cta">
          <Button size={2.4} fullWidth onClick={handleImport} disabled={selectedSlots.length === 0 || importing}>
            {importing
              ? 'Minting cWearables…'
              : bindKind === 'owned' || totalUsd <= 0
                ? `Mint ${selectedSlots.length} cWearable${selectedSlots.length === 1 ? '' : 's'} · FREE`
                : `Mint ${selectedSlots.length} · $${totalUsd} (sim)`}
          </Button>
          {onSkip ? (
            <button type="button" className="skip-btn" onClick={onSkip} disabled={importing}>
              Skip for now
            </button>
          ) : null}
          <p className="mint-hint">
            cWearables land in cartridge inventory. Equip and manage on Aarcade.
          </p>
          {importError ? <p className="mint-error">{importError}</p> : null}
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
