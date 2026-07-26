import { useMemo } from 'react';
import styles from './styles';
import { Button } from 'components/UI/elements';
import { WearableThumbnail } from 'components/UI/widgets';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { slotLabel, type MintableWearableRow } from 'helpers/cartridgeWearable.helper';

export type WearableCartLine = {
  itemTypeId: number;
  name: string;
  rarity: string;
  slotIndex: number;
  /** Distinct source instances in the cart for this item type. */
  rows: MintableWearableRow[];
  unitFeeUsd: number;
  lineTotalUsd: number;
  maxQty: number;
};

interface Props {
  cartRows: MintableWearableRow[];
  /** All unminted catalog rows — used for max qty per itemTypeId. */
  availableRows: MintableWearableRow[];
  onSetQuantity: (itemTypeId: number, qty: number) => void;
  onRemoveLine: (itemTypeId: number) => void;
  onClear: () => void;
  onCheckout: () => void | Promise<void>;
  minting?: boolean;
  mintError?: string | null;
}

export const WearableCart = ({
  cartRows,
  availableRows,
  onSetQuantity,
  onRemoveLine,
  onClear,
  onCheckout,
  minting = false,
  mintError = null,
}: Props): JSX.Element => {
  const { click } = useAavegotchiSound();

  const lines = useMemo(() => {
    const byType = new Map<number, WearableCartLine>();
    for (const row of cartRows) {
      const existing = byType.get(row.itemTypeId);
      if (existing) {
        existing.rows.push(row);
        existing.lineTotalUsd += row.importFeeUsd || 0;
      } else {
        byType.set(row.itemTypeId, {
          itemTypeId: row.itemTypeId,
          name: row.name,
          rarity: row.rarity,
          slotIndex: row.slotIndex,
          rows: [row],
          unitFeeUsd: row.importFeeUsd || 0,
          lineTotalUsd: row.importFeeUsd || 0,
          maxQty: 0,
        });
      }
    }
    const lines = Array.from(byType.values());
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      line.maxQty = availableRows.filter((r) => r.itemTypeId === line.itemTypeId && !r.alreadyMinted).length;
      // Prefer most common unit fee among rows (owned = 0).
      line.unitFeeUsd = line.rows[0]?.importFeeUsd || 0;
    }
    return lines.sort((a, b) => a.name.localeCompare(b.name));
  }, [cartRows, availableRows]);

  const totalUsd = lines.reduce((sum, l) => sum + l.lineTotalUsd, 0);
  const totalQty = cartRows.length;
  const hasBorrowed = cartRows.some((r) => r.bindKind === 'rental');

  const bump = (line: WearableCartLine, delta: number) => {
    if (minting) return;
    const next = Math.max(0, Math.min(line.maxQty, line.rows.length + delta));
    if (next === line.rows.length) return;
    click();
    if (next === 0) onRemoveLine(line.itemTypeId);
    else onSetQuantity(line.itemTypeId, next);
  };

  const remove = (itemTypeId: number) => {
    if (minting) return;
    click();
    onRemoveLine(itemTypeId);
  };

  const clear = () => {
    if (minting || lines.length === 0) return;
    click();
    onClear();
  };

  const checkout = () => {
    if (minting || cartRows.length === 0) return;
    click();
    void onCheckout();
  };

  return (
    <>
      <div className="wearable-cart">
        <h2 className="cart-title">Wearable Cart</h2>
        <p className="cart-caption">
          Itemized mint · equip after checkout <span className="price-note">(sim)</span>
        </p>

        <div className="cart-toolbar">
          <span className="cart-count">
            {totalQty} item{totalQty === 1 ? '' : 's'}
          </span>
          <button type="button" className="linkish" onClick={clear} disabled={minting || lines.length === 0}>
            Clear
          </button>
        </div>

        <div className="cart-lines scrollable">
          {lines.length === 0 ? (
            <p className="empty">Add wearables from the right to build your mint cart.</p>
          ) : (
            lines.map((line) => {
              const ownership = line.rows.some((r) => r.bindKind === 'rental') ? 'borrowed' : 'owned';
              return (
                <div key={line.itemTypeId} className="cart-line">
                  <div className="line-main">
                    <WearableThumbnail itemTypeId={line.itemTypeId} name={line.name} size={48} />
                    <div className="line-meta">
                      <span className="line-name">{line.name}</span>
                      <span className="line-sub">
                        {slotLabel(line.slotIndex)} · {line.rarity} · {ownership}
                      </span>
                      <span className={`line-unit ${line.unitFeeUsd <= 0 ? 'free' : ''}`}>
                        {line.unitFeeUsd <= 0 ? 'FREE' : `$${line.unitFeeUsd}`} each
                      </span>
                    </div>
                  </div>
                  <div className="line-controls">
                    <div className="qty">
                      <button
                        type="button"
                        className="qty-btn"
                        disabled={minting || line.rows.length < 1}
                        onClick={() => bump(line, -1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="qty-value">{line.rows.length}</span>
                      <button
                        type="button"
                        className="qty-btn"
                        disabled={minting || line.rows.length >= line.maxQty}
                        onClick={() => bump(line, 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <span className={`line-total ${line.lineTotalUsd <= 0 ? 'free' : ''}`}>
                      {line.lineTotalUsd <= 0 ? 'FREE' : `$${line.lineTotalUsd}`}
                    </span>
                    <button
                      type="button"
                      className="trash-btn"
                      disabled={minting}
                      onClick={() => remove(line.itemTypeId)}
                      aria-label={`Remove ${line.name}`}
                      title="Remove"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                        <path
                          fill="currentColor"
                          d="M6 1h4l.5 1H14v1.5H2V2h3.5L6 1zm1 4v7H5.5V5H7zm3.5 0v7H9V5h1.5zM3.5 3.5h9L12 14H4L3.5 3.5z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="cart-footer">
          <div className="totals">
            <span className="totals-label">Total</span>
            <span className={`totals-value ${totalUsd <= 0 ? 'free' : ''}`}>
              {totalUsd <= 0 ? 'FREE' : `$${totalUsd}`}
              {hasBorrowed && totalUsd > 0 ? <span className="price-note"> (sim)</span> : null}
            </span>
          </div>
          <Button size={2.4} fullWidth onClick={checkout} disabled={cartRows.length === 0 || minting}>
            {minting
              ? 'Minting…'
              : cartRows.length === 0
                ? 'Cart empty'
                : totalUsd > 0
                  ? `Mint ${totalQty} · $${totalUsd} (sim)`
                  : `Mint ${totalQty} · FREE`}
          </Button>
          {mintError ? <p className="mint-error">{mintError}</p> : null}
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
