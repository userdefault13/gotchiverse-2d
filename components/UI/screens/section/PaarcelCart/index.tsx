import { useMemo } from 'react';
import styles from './styles';
import { Button } from 'components/UI/elements';
import { InstallationThumbnail, PaarcelThumbnail } from 'components/UI/widgets';
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
          Parcels nest equipped installs · wallet installs separate{' '}
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
          {cartParcels.map((row) => (
            <div key={row.key} className="cart-line">
              <PaarcelThumbnail realmTokenId={row.realmTokenId} name={row.parcelId} size={40} />
              <div className="line-main">
                <span className="line-name">{row.parcelId}</span>
                <span className="line-meta">
                  Parcel #{row.realmTokenId} · {row.installations.length} installs
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
          ))}
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
