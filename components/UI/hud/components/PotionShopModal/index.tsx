import { useCallback, useEffect, useState } from 'react';
import { Button } from 'components/UI/elements';
import { useUI } from 'contexts/UIContexts';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import {
  enterPotionShopMap,
  leavePotionShopMap,
  applyPotionShopSceneLayout,
  setPotionShopSceneCallbacks,
} from 'helpers/potionShop.scene.helper';
import {
  loadPotionShopLayout,
  savePotionShopLayout,
  serializePotionShopLayout,
  parsePotionShopLayoutJson,
  ensurePotionShopFloor,
} from 'helpers/potionShop.layout.helper';
import { seedPotionShopLayout, subscribePotionShopLayout } from 'helpers/colyseus.potionShop';
import { ItemShop } from '../ItemShop';
import css from 'styled-jsx/css';

const styles = css`
  .potion-shop-hud {
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
  .potion-shop-hud-top,
  .potion-shop-hud-bottom {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    align-items: center;
    background: rgba(26, 8, 32, 0.9);
    border: 2px solid #9b4dff;
    padding: 0.8rem 1.2rem;
    max-width: 36rem;
  }
  .potion-shop-hud-bottom {
    align-self: flex-start;
  }
  .title {
    font-family: Pixelar, monospace;
    font-size: 1.6rem;
    color: #e87cff;
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

export const PotionShopModal = (): JSX.Element => {
  const [{ potionShopState }, uiDispatch] = useUI();
  const { back, click } = useAavegotchiSound();
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);

  const open = Boolean(potionShopState?.open);
  const installationId = potionShopState?.installationId;

  const handleClose = useCallback(async () => {
    back();
    setShopOpen(false);
    await leavePotionShopMap();
    uiDispatch({
      type: 'UPDATE_POTION_SHOP_MODAL',
      potionShopState: { open: false, installationId: undefined, isOwner: false },
    });
  }, [back, uiDispatch]);

  useEffect(() => {
    if (!open || !installationId) {
      setShopOpen(false);
      return;
    }
    let cancelled = false;
    setJoining(true);
    setJoinError(null);

    const local = ensurePotionShopFloor(loadPotionShopLayout(installationId));
    savePotionShopLayout(local);

    const callbacks = {
      onLeaveDoor: () => {
        void handleClose();
      },
    };

    void (async () => {
      const result = await enterPotionShopMap({
        potionShopId: installationId,
        ownerAddress: potionShopState?.ownerAddress,
        cartridgeId: potionShopState?.cartridgeId,
        layout: local,
        callbacks,
      });
      if (cancelled) return;
      setJoining(false);
      if (!result.ok) {
        setJoinError(result.error || 'Could not enter potion shop.');
        return;
      }
      setPotionShopSceneCallbacks(callbacks);
      seedPotionShopLayout(serializePotionShopLayout(local));
      setShopOpen(true);
    })();

    const unsubLayout = subscribePotionShopLayout((json) => {
      if (!json || !installationId) return;
      const parsed = ensurePotionShopFloor(parsePotionShopLayoutJson(json, installationId));
      applyPotionShopSceneLayout(parsed);
    });

    return () => {
      cancelled = true;
      unsubLayout();
      setShopOpen(false);
      void leavePotionShopMap();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enter once per open/install
  }, [open, installationId]);

  if (!open) return null;

  return (
    <>
      <div className="potion-shop-hud">
        <div className="potion-shop-hud-top hud-panel">
          <span className="title">Potion Shop</span>
          {joining ? <span className="hint">Entering…</span> : null}
          {joinError ? <span className="err">{joinError}</span> : null}
          {!joining && !joinError ? (
            <span className="hint">Browse potions below. Walk south through the door to leave.</span>
          ) : null}
        </div>
        <div className="potion-shop-hud-bottom hud-panel">
          {!shopOpen && !joining && !joinError ? (
            <Button
              onClick={() => {
                click();
                setShopOpen(true);
              }}
            >
              Open Shop
            </Button>
          ) : null}
          <Button
            onClick={() => {
              click();
              void handleClose();
            }}
          >
            Leave Shop
          </Button>
        </div>
      </div>
      {shopOpen && !joinError ? (
        <ItemShop
          open={shopOpen}
          onClose={() => {
            click();
            setShopOpen(false);
          }}
        />
      ) : null}
      <style jsx>{styles}</style>
    </>
  );
};
