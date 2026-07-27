import { useMemo } from 'react';
import styles from './styles';
import { Button } from 'components/UI/elements';
import { InstallationThumbnail, PaarcelThumbnail } from 'components/UI/widgets';
import { formatParcelDisplayName } from 'components/UI/widgets/MintHoverTip';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import type { MintableInstallationRow, MintablePaarcelRow } from 'helpers/cartridgePaarcel.helper';

interface Props {
  cartParcels: MintablePaarcelRow[];
  cartInstallations: MintableInstallationRow[];
  onRemoveParcel: (key: string) => void;
  onRemoveInstallation: (key: string) => void;
  onClear: () => void;
  onCheckout: () => void | Promise<void>;
  minting?: boolean;
  mintError?: string | null;
}

export const PaarcelCart = ({
  cartParcels,
  cartInstallations,
  onRemoveParcel,
  onRemoveInstallation,
  onClear,
  onCheckout,
  minting = false,
  mintError = null,
}: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const totalQty = cartParcels.length + cartInstallations.length;

  const nestSummary = useMemo(() => {
    let n = 0;
    for (const p of cartParcels) n += p.installations?.length || 0;
    return n;
  }, [cartParcels]);

  const clear = () => {
    if (minting || totalQty === 0) return;
    click();
    onClear();
  };

  const checkout = () => {
    if (minting || totalQty === 0) return;
    click();
    void onCheckout();
  };

  return (
    <>
      <div className="paarcel-cart">
        <h2 className="cart-title">Paarcel Cart</h2>
        <p className="cart-caption">
          Owned parcels only · checkout nests on-chain equips{' '}
          <span className="price-note">(sim)</span>
        </p>

        <div className="cart-toolbar">
          <span className="cart-count">
            {totalQty} item{totalQty === 1 ? '' : 's'}
            {nestSummary ? ` · ${nestSummary} nested` : ''}
          </span>
          <button type="button" className="linkish" onClick={clear} disabled={minting || totalQty === 0}>
            Clear
          </button>
        </div>

        <div className="cart-list scrollable">
          {cartParcels.map((row) => {
            const displayName = formatParcelDisplayName(row.name || row.parcelId);
            const districtLine =
              row.district != null
                ? `District ${row.district} ID: ${row.realmTokenId}`
                : `ID: ${row.realmTokenId}`;
            return (
              <div key={row.key} className="cart-line parcel-block">
                <div className="cart-line-row">
                  <PaarcelThumbnail realmTokenId={row.realmTokenId} name={displayName} size={40} />
                  <div className="line-main">
                    <span className="line-name">{displayName}</span>
                    <span className="line-meta">{districtLine}</span>
                    <span className="line-meta soft">
                      {row.installations.length} equip{row.installations.length === 1 ? '' : 's'}
                      {row.parcelId && row.parcelId !== displayName ? ` · ${row.parcelId}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="remove"
                    disabled={minting}
                    onClick={() => {
                      click();
                      onRemoveParcel(row.key);
                    }}
                  >
                    ×
                  </button>
                </div>
                {row.installations.length > 0 ? (
                  <div className="nested-equips">
                    {row.installations.slice(0, 12).map((inst, i) => (
                      <span
                        key={`${row.key}-${inst.itemTypeId}-${inst.x}-${inst.y}-${i}`}
                        className="nested-chip"
                        title={`${inst.name} @ ${inst.x},${inst.y}`}
                      >
                        <InstallationThumbnail
                          itemTypeId={inst.itemTypeId}
                          kind={inst.kind}
                          name={inst.name}
                          size={22}
                        />
                      </span>
                    ))}
                    {row.installations.length > 12 ? (
                      <span className="nested-more">+{row.installations.length - 12}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
          {cartInstallations.map((row) => (
            <div key={row.key} className="cart-line install">
              <InstallationThumbnail itemTypeId={row.itemTypeId} kind={row.kind} name={row.name} size={40} />
              <div className="line-main">
                <span className="line-name">{row.name}</span>
                <span className="line-meta">
                  {row.source === 'parcel-equip'
                    ? `On parcel #${row.sourceRealmTokenId}`
                    : 'Wallet install'}
                </span>
              </div>
              <button
                type="button"
                className="remove"
                disabled={minting}
                onClick={() => {
                  click();
                  onRemoveInstallation(row.key);
                }}
              >
                ×
              </button>
            </div>
          ))}
          {totalQty === 0 ? <p className="empty">Cart is empty</p> : null}
        </div>

        {mintError ? <p className="mint-error">{mintError}</p> : null}

        <div className="cart-footer">
          <p className="total">
            Total <span className="free">FREE</span>
          </p>
          <Button size={2} fullWidth disabled={minting || totalQty === 0} onClick={checkout}>
            {minting ? 'Minting…' : 'Checkout mint'}
          </Button>
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
