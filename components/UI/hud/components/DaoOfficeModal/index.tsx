import { useCallback, useEffect, useState } from 'react';
import { Button } from 'components/UI/elements';
import { useUI } from 'contexts/UIContexts';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import {
  enterDaoOfficeMap,
  leaveDaoOfficeMap,
  applyDaoOfficeSceneLayout,
  setDaoOfficeSceneCallbacks,
} from 'helpers/daoOffice.scene.helper';
import {
  loadDaoOfficeLayout,
  saveDaoOfficeLayout,
  serializeDaoOfficeLayout,
  parseDaoOfficeLayoutJson,
  ensureDaoOfficeFloor,
} from 'helpers/daoOffice.layout.helper';
import { seedDaoOfficeLayout, subscribeDaoOfficeLayout } from 'helpers/colyseus.daoOffice';
import css from 'styled-jsx/css';

const styles = css`
  .dao-office-hud {
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
  .dao-office-hud-top,
  .dao-office-hud-bottom {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    align-items: center;
    background: rgba(26, 18, 8, 0.9);
    border: 2px solid #4a90d9;
    padding: 0.8rem 1.2rem;
    max-width: 36rem;
  }
  .dao-office-hud-bottom {
    align-self: flex-start;
  }
  .title {
    font-family: Pixelar, monospace;
    font-size: 1.6rem;
    color: #7ec8ff;
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

export const DaoOfficeModal = (): JSX.Element => {
  const [{ daoOfficeState }, uiDispatch] = useUI();
  const { back, click } = useAavegotchiSound();
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const open = Boolean(daoOfficeState?.open);
  const installationId = daoOfficeState?.installationId;

  const handleClose = useCallback(async () => {
    back();
    await leaveDaoOfficeMap();
    uiDispatch({
      type: 'UPDATE_DAO_OFFICE_MODAL',
      daoOfficeState: { open: false, installationId: undefined, isOwner: false },
    });
  }, [back, uiDispatch]);

  useEffect(() => {
    if (!open || !installationId) return;
    let cancelled = false;
    setJoining(true);
    setJoinError(null);

    const local = ensureDaoOfficeFloor(loadDaoOfficeLayout(installationId));
    saveDaoOfficeLayout(local);

    const callbacks = {
      onLeaveDoor: () => {
        void handleClose();
      },
    };

    void (async () => {
      const result = await enterDaoOfficeMap({
        daoOfficeId: installationId,
        ownerAddress: daoOfficeState?.ownerAddress,
        cartridgeId: daoOfficeState?.cartridgeId,
        layout: local,
        callbacks,
      });
      if (cancelled) return;
      setJoining(false);
      if (!result.ok) {
        setJoinError(result.error || 'Could not enter DAO office.');
        return;
      }
      setDaoOfficeSceneCallbacks(callbacks);
      seedDaoOfficeLayout(serializeDaoOfficeLayout(local));
    })();

    const unsubLayout = subscribeDaoOfficeLayout((json) => {
      if (!json || !installationId) return;
      const parsed = ensureDaoOfficeFloor(parseDaoOfficeLayoutJson(json, installationId));
      applyDaoOfficeSceneLayout(parsed);
    });

    return () => {
      cancelled = true;
      unsubLayout();
      void leaveDaoOfficeMap();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enter once per open/install
  }, [open, installationId]);

  if (!open) return null;

  return (
    <>
      <div className="dao-office-hud">
        <div className="dao-office-hud-top hud-panel">
          <span className="title">DAO Satellite Office</span>
          {joining ? <span className="hint">Entering…</span> : null}
          {joinError ? <span className="err">{joinError}</span> : null}
          {!joining && !joinError ? (
            <span className="hint">Walk south through the door to leave. Art coming soon.</span>
          ) : null}
        </div>
        <div className="dao-office-hud-bottom hud-panel">
          <Button
            onClick={() => {
              click();
              void handleClose();
            }}
          >
            Leave Office
          </Button>
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
