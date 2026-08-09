import { useCallback, useEffect, useState } from 'react';
import { Button } from 'components/UI/elements';
import { useUI } from 'contexts/UIContexts';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import {
  enterBazaarMap,
  leaveBazaarMap,
  applyBazaarSceneLayout,
  setBazaarSceneCallbacks,
} from 'helpers/bazaar.scene.helper';
import {
  loadBazaarLayout,
  saveBazaarLayout,
  serializeBazaarLayout,
  parseBazaarLayoutJson,
  ensureBazaarFloor,
} from 'helpers/bazaar.layout.helper';
import { seedBazaarLayout, subscribeBazaarLayout } from 'helpers/colyseus.bazaar';
import css from 'styled-jsx/css';

const styles = css`
  .bazaar-hud {
    position: fixed;
    inset: 5rem 0 0 0;
    z-index: 40;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1.2rem 1.6rem 1.6rem;
  }
  .hud-panel {
    pointer-events: auto;
  }
  .bazaar-hud-top,
  .bazaar-hud-bottom {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    align-items: center;
    background: rgba(26, 18, 8, 0.9);
    border: 2px solid #c4a574;
    padding: 0.8rem 1.2rem;
    max-width: 36rem;
  }
  .bazaar-hud-bottom {
    align-self: flex-start;
  }
  .title {
    font-family: Pixelar, monospace;
    font-size: 1.6rem;
    color: #ffc857;
    letter-spacing: 0.04em;
  }
  .hint {
    font-family: Pixelar, monospace;
    font-size: 1.2rem;
    color: #e8dcc8;
  }
  .err {
    color: #ff7a7a;
    font-family: Pixelar, monospace;
    font-size: 1.2rem;
  }
`;

export const BazaarModal = (): JSX.Element => {
  const [{ bazaarState }, uiDispatch] = useUI();
  const { back, click } = useAavegotchiSound();
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const open = Boolean(bazaarState?.open);
  const installationId = bazaarState?.installationId;

  const handleClose = useCallback(async () => {
    back();
    await leaveBazaarMap();
    uiDispatch({
      type: 'UPDATE_BAZAAR_MODAL',
      bazaarState: { open: false, installationId: undefined, isOwner: false },
    });
  }, [back, uiDispatch]);

  useEffect(() => {
    if (!open || !installationId) return;
    let cancelled = false;
    setJoining(true);
    setJoinError(null);

    const local = ensureBazaarFloor(loadBazaarLayout(installationId));
    saveBazaarLayout(local);

    const callbacks = {
      onLeaveDoor: () => {
        void handleClose();
      },
    };

    void (async () => {
      const result = await enterBazaarMap({
        bazaarId: installationId,
        ownerAddress: bazaarState?.ownerAddress,
        cartridgeId: bazaarState?.cartridgeId,
        layout: local,
        callbacks,
      });
      if (cancelled) return;
      setJoining(false);
      if (!result.ok) {
        setJoinError(result.error || 'Could not enter bazaar.');
        return;
      }
      setBazaarSceneCallbacks(callbacks);
      seedBazaarLayout(serializeBazaarLayout(local));
    })();

    const unsubLayout = subscribeBazaarLayout((json) => {
      if (!json || !installationId) return;
      const parsed = ensureBazaarFloor(parseBazaarLayoutJson(json, installationId));
      applyBazaarSceneLayout(parsed);
    });

    return () => {
      cancelled = true;
      unsubLayout();
      void leaveBazaarMap();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enter once per open/install
  }, [open, installationId]);

  if (!open) return null;

  return (
    <>
      <div className="bazaar-hud">
        <div className="bazaar-hud-top hud-panel">
          <span className="title">Bazaar</span>
          {joining ? <span className="hint">Entering…</span> : null}
          {joinError ? <span className="err">{joinError}</span> : null}
          {!joining && !joinError ? (
            <span className="hint">Walk south through the door to leave. Art coming soon.</span>
          ) : null}
        </div>
        <div className="bazaar-hud-bottom hud-panel">
          <Button
            onClick={() => {
              click();
              void handleClose();
            }}
          >
            Leave Bazaar
          </Button>
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
