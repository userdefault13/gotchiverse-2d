import FoundryNodes from 'components/phaser/FoundryNodes';
import { useGame } from 'contexts/GameContext';
import { FoundryNet, FoundryStore } from 'helpers/foundry';
import { FoundryState } from 'helpers/foundry/types';
import { useEffect, useState } from 'react';
import styles from './styles';

export const FoundryPanel = (): JSX.Element | null => {
  const [{ gameConfig }] = useGame();
  const enabled =
    Boolean((gameConfig as { enableParcelFoundryPoC?: boolean })?.enableParcelFoundryPoC) ||
    process.env.NEXT_PUBLIC_ENABLE_FOUNDRY_POC === 'true';

  const [state, setState] = useState<FoundryState | null>(null);
  const [placeMode, setPlaceMode] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!enabled) return;
    FoundryStore.setFoundryEnabled(true);
    setState(FoundryStore.getState());
    return FoundryStore.subscribe(setState);
  }, [enabled]);

  if (!enabled || !state?.enabled) return null;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  const statusColor =
    state.netherlink === 'green' ? '#50dce6' : state.netherlink === 'amber' ? '#f08c32' : '#dc4650';

  return (
    <>
      <style jsx>{styles}</style>
      <div className="foundry-panel">
        <div className="foundry-title">Parcel Foundry PoC</div>
        <div className="row">
          <span>Netherlink</span>
          <strong style={{ color: statusColor }}>{state.netherlink.toUpperCase()}</strong>
        </div>
        <div className="row">
          <span>Tithe</span>
          <strong>{state.titheAccrued}</strong>
        </div>
        <div className="row">
          <span>Pollution</span>
          <strong>{state.pollution}</strong>
        </div>
        <div className="row">
          <span>Cargo</span>
          <strong>
            {state.cargo.fud}/{state.cargo.fomo}/{state.cargo.alpha}/{state.cargo.kek}
          </strong>
        </div>
        <div className="row">
          <span>Salvage</span>
          <strong>
            A{state.salvage.antenna} D{state.salvage.dish} S{state.salvage.slag}
          </strong>
        </div>
        <div className="hint">{state.walkLedgerHint}</div>
        <div className="actions">
          <button
            type="button"
            onClick={() => {
              FoundryNodes.setPlaceMode(!placeMode);
              setPlaceMode(!placeMode);
            }}
          >
            {placeMode ? 'Cancel Place' : 'Place Antenna'}
          </button>
          <button
            type="button"
            onClick={() => {
              const r = FoundryNet.meshTransfer();
              flash(r.message);
            }}
          >
            Mesh Transfer
          </button>
          <button
            type="button"
            onClick={() => {
              const r = FoundryNet.bounceFreight();
              flash(r.message);
            }}
          >
            Bounce Freight
          </button>
          <button
            type="button"
            onClick={() => {
              const r = FoundryNet.factionPulse();
              flash(r.message);
            }}
          >
            Link-breaker Raid
          </button>
          <button
            type="button"
            onClick={() => {
              flash(FoundryNodes.tryInteractNearby());
            }}
          >
            Interact Nearby
          </button>
        </div>
        {toast ? <div className="toast">{toast}</div> : null}
      </div>
    </>
  );
};
